/**
 * Parse a CSV buffer to an array of row objects (first line = headers).
 * Handles quoted fields and trim.
 */
export function normalizeCsvKey(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function getCsvValue(row: Record<string, string>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const normalizedAlias = normalizeCsvKey(alias);
    if (normalizedAlias in row) {
      return row[normalizedAlias] ?? '';
    }
  }
  return '';
}

export function parseCsvToRows(buffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
  const text = buffer.toString('utf8').trim();
  if (!text) return { headers: [], rows: [] };

  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i += 1;
        let val = '';
        while (i < line.length) {
          if (line[i] === '"') {
            i += 1;
            if (line[i] === '"') {
              val += '"';
              i += 1;
            } else break;
          } else {
            val += line[i];
            i += 1;
          }
        }
        out.push(val.trim());
        if (line[i] === ',') {
          i += 1;
        }
      } else {
        const comma = line.indexOf(',', i);
        const segment = (comma === -1 ? line.slice(i) : line.slice(i, comma)).trim();
        out.push(segment);
        i = comma === -1 ? line.length : comma + 1;
      }
    }
    return out;
  };

  const headers = parseLine(lines[0]).map((h) => normalizeCsvKey(h));
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const values = parseLine(lines[r]);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() ?? '';
    });
    rows.push(row);
  }
  return { headers, rows };
}
