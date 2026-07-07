const encoder = new TextEncoder();

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index) {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }
  return name;
}

function columnIndex(name) {
  return String(name || '').split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1;
}

function cellRef(rowIndex, colIndex) {
  return `${columnName(colIndex)}${rowIndex + 1}`;
}

export function encode_cell({ r, c }) {
  return cellRef(r, c);
}

export function decode_range(ref = 'A1:A1') {
  const [start, end = start] = String(ref).split(':');
  const parse = (value) => {
    const match = String(value).match(/^([A-Z]+)(\d+)$/i);
    return {
      c: match ? columnIndex(match[1].toUpperCase()) : 0,
      r: match ? Number(match[2]) - 1 : 0,
    };
  };
  return { s: parse(start), e: parse(end) };
}

function sheetFromRows(rows) {
  const data = (rows || []).map((row) => Array.isArray(row) ? row : [row]);
  const sheet = { __rows: data };
  let maxColumns = 0;

  data.forEach((row, rowIndex) => {
    maxColumns = Math.max(maxColumns, row.length);
    row.forEach((value, colIndex) => {
      sheet[cellRef(rowIndex, colIndex)] = {
        v: value,
        t: typeof value === 'number' ? 'n' : typeof value === 'boolean' ? 'b' : 's',
      };
    });
  });

  sheet['!ref'] = data.length
    ? `${cellRef(0, 0)}:${cellRef(data.length - 1, Math.max(0, maxColumns - 1))}`
    : 'A1:A1';

  return sheet;
}

export function aoa_to_sheet(rows) {
  return sheetFromRows(rows);
}

export function json_to_sheet(rows) {
  const source = Array.isArray(rows) && rows.length ? rows : [{ note: 'No data' }];
  const headers = Array.from(source.reduce((set, row) => {
    Object.keys(row || {}).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  return sheetFromRows([headers, ...source.map((row) => headers.map((key) => row?.[key]))]);
}

export function book_new() {
  return { SheetNames: [], Sheets: {} };
}

export function book_append_sheet(workbook, sheet, name = 'Sheet1') {
  const safeName = String(name || 'Sheet1').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1';
  workbook.SheetNames.push(safeName);
  workbook.Sheets[safeName] = sheet;
}

function rowsFromSheet(sheet) {
  if (Array.isArray(sheet?.__rows)) return sheet.__rows;
  const range = decode_range(sheet?.['!ref'] || 'A1:A1');
  const rows = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      row.push(sheet?.[cellRef(r, c)]?.v ?? '');
    }
    rows.push(row);
  }
  return rows;
}

function sheetXml(sheet) {
  const rows = rowsFromSheet(sheet);
  const body = rows.map((row, rowIndex) => {
    const cells = row.map((value, colIndex) => {
      const ref = cellRef(rowIndex, colIndex);
      if (value === null || value === undefined || value === '') return '';
      if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${ref}"><v>${value}</v></c>`;
      }
      if (typeof value === 'boolean') {
        return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
      }
      return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${body}</sheetData>
</worksheet>`;
}

function workbookXml(workbook) {
  const sheets = workbook.SheetNames.map((name, index) =>
    `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheets}</sheets>
</workbook>`;
}

function workbookRels(workbook) {
  const sheetRels = workbook.SheetNames.map((_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${workbook.SheetNames.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function contentTypes(workbook) {
  const sheets = workbook.SheetNames.map((_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheets}
</Types>`;
}

function staticFiles(workbook) {
  return {
    '[Content_Types].xml': contentTypes(workbook),
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Valle Garage</dc:creator>
  <cp:lastModifiedBy>Valle Garage</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`,
    'docProps/app.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Valle Garage</Application>
</Properties>`,
    'xl/workbook.xml': workbookXml(workbook),
    'xl/_rels/workbook.xml.rels': workbookRels(workbook),
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`,
  };
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function u16(value) {
  return [value & 255, (value >>> 8) & 255];
}

function u32(value) {
  return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
}

function concat(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  files.forEach(({ name, data }) => {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(data);
    const crc = crc32(dataBytes);
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(dataBytes.length), ...u32(dataBytes.length),
      ...u16(nameBytes.length), ...u16(0),
      ...nameBytes, ...dataBytes,
    ]);
    const central = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(dataBytes.length), ...u32(dataBytes.length),
      ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
      ...nameBytes,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  });

  const centralBody = concat(centrals);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(centralBody.length), ...u32(offset), ...u16(0),
  ]);
  return concat([...locals, centralBody, end]);
}

export function writeFile(workbook, fileName = 'report.xlsx') {
  const files = staticFiles(workbook);
  workbook.SheetNames.forEach((name, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = sheetXml(workbook.Sheets[name]);
  });

  const bytes = zip(Object.entries(files).map(([name, data]) => ({ name, data })));
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = String(fileName || 'report.xlsx').endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export const utils = {
  aoa_to_sheet,
  json_to_sheet,
  book_new,
  book_append_sheet,
  decode_range,
  encode_cell,
};

export default {
  utils,
  writeFile,
};
