import assert from 'node:assert/strict';
import { test } from 'node:test';
import ExcelJS from 'exceljs';
import { createIncidentTemplate, readIncidentWorkbook } from '../src/features/incidents/excel-import';
import { INCIDENT_COLUMNS } from '../src/features/incidents/incident-input';

const sample = ['INC-1042', 'Database', 'Connection timeout', 'Requests timed out.', 'Restored the connection pool.'];

test('the Excel template can be filled in and imported', async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await createIncidentTemplate());
  const sheet = workbook.worksheets[0];
  assert.deepEqual(INCIDENT_COLUMNS.map((_, index) => sheet.getCell(1, index + 1).text), INCIDENT_COLUMNS.map(({ label }) => label));
  sheet.addRow(sample);
  workbook.addWorksheet('Notes').addRow(['This worksheet is ignored']);

  assert.deepEqual(await readIncidentWorkbook(await workbook.xlsx.writeBuffer()), [{
    ticketCode: sample[0], category: sample[1], title: sample[2], symptom: sample[3], resolution: sample[4],
  }]);
});

test('imports legacy column names and reports the workbook row when data is missing', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Incidents');
  sheet.addRow(['Ticket Code', 'Category', 'Title', 'Symptom', 'Resolution']);
  sheet.addRow(sample);
  assert.equal((await readIncidentWorkbook(await workbook.xlsx.writeBuffer())).length, 1);
  sheet.addRow([]);
  sheet.addRow(sample.slice(0, -1));
  const invalid = await workbook.xlsx.writeBuffer();
  await assert.rejects(() => readIncidentWorkbook(invalid), /Row 4: How it was fixed is required/);
});

test('reports an unreadable workbook instead of creating incident records', async () => {
  const bytes = new TextEncoder().encode('Not an Excel workbook');
  await assert.rejects(() => readIncidentWorkbook(bytes.buffer), /Cannot open this workbook/);
});
