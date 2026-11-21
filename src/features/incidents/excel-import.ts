import ExcelJS from 'exceljs';
import { fromBuffer } from 'yauzl';
import { INCIDENT_COLUMNS, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, type IncidentInput, validateIncident } from './incident-input';

const MAX_EXPANDED_BYTES = 8 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 128;

function verifyWorkbookArchive(bytes: ArrayBuffer) {
  // Check each entry's actual expanded size before passing untrusted bytes to ExcelJS.
  return new Promise<void>((resolve, reject) => {
    fromBuffer(Buffer.from(bytes), { lazyEntries: true, validateEntrySizes: true }, (error, archive) => {
      if (error) {
        reject(error);
        return;
      }

      const paths = new Set<string>();
      let expanded = 0;
      function fail(reason: unknown) {
        archive.close();
        reject(reason);
      }
      archive.on('error', fail);
      archive.on('end', resolve);
      if (archive.entryCount > MAX_ARCHIVE_ENTRIES) {
        fail(new Error('The workbook contains too many files.'));
        return;
      }

      archive.on('entry', (entry) => {
        if (paths.has(entry.fileName) || expanded + entry.uncompressedSize > MAX_EXPANDED_BYTES) {
          fail(new Error('The workbook exceeds the supported archive limits.'));
          return;
        }
        paths.add(entry.fileName);
        archive.openReadStream(entry, (readError, stream) => {
          if (readError || !stream) {
            fail(readError ?? new Error('Unable to read workbook entry.'));
            return;
          }
          stream.on('error', fail);
          stream.on('data', (chunk: Buffer) => {
            expanded += chunk.length;
            if (expanded > MAX_EXPANDED_BYTES) stream.destroy(new Error('The workbook is too large.'));
          });
          stream.on('end', () => archive.readEntry());
        });
      });
      archive.readEntry();
    });
  });
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function readIncidentWorkbook(bytes: ArrayBuffer): Promise<IncidentInput[]> {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new Error('Choose a non-empty Excel workbook under 750 KB.');
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await verifyWorkbookArchive(bytes);
    await workbook.xlsx.load(bytes);
  } catch {
    throw new Error('Cannot open this workbook. Save it as a standard .xlsx file and try again.');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The workbook has no worksheets.');
  const headers: { column: number; label: string }[] = [];
  sheet.getRow(1).eachCell((cell, column) => {
    headers.push({ column, label: normalizeHeader(cell.text) });
  });
  const columns = INCIDENT_COLUMNS.map((field) => {
    const accepted = [normalizeHeader(field.label), ...field.aliases];
    const matches = headers.filter((entry) => accepted.includes(entry.label));
    if (matches.length !== 1) throw new Error(`Include one “${field.label}” column in the first row.`);
    return { key: field.key, column: matches[0].column };
  });

  const incidents: IncidentInput[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const fields = columns.map(({ key, column }) => [key, row.getCell(column).text.trim()] as const);
    if (fields.every(([, value]) => !value)) return;
    if (incidents.length >= MAX_IMPORT_ROWS) throw new Error(`Import up to ${MAX_IMPORT_ROWS} incidents at a time.`);
    const incident = Object.fromEntries(fields) as IncidentInput;
    const issue = validateIncident(incident);
    if (issue) throw new Error(`Row ${rowNumber}: ${issue}`);
    incidents.push(incident);
  });

  if (!incidents.length) throw new Error('Add at least one resolved incident below the header row.');
  return incidents;
}

export async function createIncidentTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Resolved incidents');
  sheet.columns = INCIDENT_COLUMNS.map(({ label, key }) => ({ header: label, key, width: 26 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.getColumn('ticketCode').numFmt = '@';
  return workbook.xlsx.writeBuffer();
}
