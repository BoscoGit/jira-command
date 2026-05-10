import { humanLog } from '../output.js';

export interface TableColumn<T = Record<string, unknown>> {
  header: string;
  key: keyof T & string;
  align?: 'left' | 'right';
  maxWidth?: number;
}

interface WriteTableOpts {
  stream?: NodeJS.WriteStream;
}

function cellOf(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v === null || v === undefined) return '';
  return String(v);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  if (max <= 3) return s.slice(0, max);
  return `${s.slice(0, max - 3)}...`;
}

function pad(s: string, width: number, align: 'left' | 'right'): string {
  const diff = width - s.length;
  if (diff <= 0) return s;
  return align === 'right' ? ' '.repeat(diff) + s : s + ' '.repeat(diff);
}

/**
 * Escreve tabela alinhada em `stream` (default: process.stdout).
 *
 * - Calcula largura por coluna como max(header, max(célula)) respeitando `maxWidth`.
 * - Trunca células com `...` quando excederem `maxWidth` (≥ 4 caracteres).
 * - Não escreve nada quando `rows` é vazio.
 * - Cabeçalho impresso em UPPER CASE.
 */
export function writeTable<T extends object>(
  rows: T[],
  columns: TableColumn<T>[],
  opts: WriteTableOpts = {},
): void {
  if (rows.length === 0) return;
  const stream = opts.stream ?? process.stdout;

  const cells: string[][] = rows.map((row) =>
    columns.map((col) => {
      const raw = cellOf(row as Record<string, unknown>, col.key);
      return col.maxWidth ? truncate(raw, col.maxWidth) : raw;
    }),
  );

  const headers = columns.map((c) => c.header.toUpperCase());

  const widths = columns.map((col, idx) => {
    const headerLen = headers[idx]?.length ?? 0;
    const maxCell = cells.reduce((m, r) => Math.max(m, r[idx]?.length ?? 0), 0);
    const calc = Math.max(headerLen, maxCell);
    return col.maxWidth ? Math.min(calc, col.maxWidth) : calc;
  });

  const formatRow = (values: string[]): string =>
    values
      .map((v, i) => pad(v, widths[i] ?? 0, columns[i]?.align ?? 'left'))
      .join('  ')
      .trimEnd();

  humanLog(stream, formatRow(headers));
  for (const row of cells) {
    humanLog(stream, formatRow(row));
  }
}
