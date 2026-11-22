function usableResolution(value: string) {
  return value.trim().length > 0 && !/^(?:n\/a|none|tbd|not applicable|to do|todo)\.?$/i.test(value.trim());
}

export function extractDocumentedResolution(body: string, allowProse = false) {
  const lines = body.replace(/<!--[^]*?-->/g, '').split(/\r?\n/);
  let inCodeBlock = false;
  for (const [index, line] of lines.entries()) {
    if (/^\s*(?:```|~~~)/.test(line)) inCodeBlock = !inCodeBlock;
    if (inCodeBlock) continue;
    const heading = /^(?:#{1,6}[ \t]+)?(?:\*\*|__)?(?:resolution|fix applied|how it was fixed)(?:\*\*|__)?(?:[ \t]*:[ \t]*(.*))?[ \t]*$/i.exec(line.trim());
    if (heading) {
      const section = [];
      for (const next of lines.slice(index + 1)) {
        if (/^#{1,6}\s/.test(next)) break;
        section.push(next);
      }
      const resolution = [heading[1], ...section].filter(Boolean).join('\n').trim();
      if (usableResolution(resolution)) return { resolution, summary: lines.slice(0, index).join('\n').trim() };
    }
    if (allowProse) {
      const prose = /^(?:(?:this (?:issue )?(?:was|is) )?(?:fixed|resolved)(?: (?:it|this(?: issue)?|the issue))? by |(?:i|we) (?:fixed|resolved) (?:it|this(?: issue)?|the issue) by )(.+)/i.exec(line.trim());
      if (prose && prose[1].trim().split(/\s+/).length >= 3) return { resolution: line.trim(), summary: '' };
    }
  }
  return null;
}
