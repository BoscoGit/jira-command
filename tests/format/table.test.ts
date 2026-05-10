import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type TableColumn, writeTable } from '../../src/format/table.js';
import { setOutputMode } from '../../src/output.js';

interface Row {
  key: string;
  status: string;
  summary: string;
}

let stdoutSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  setOutputMode({ noColor: true });
});

afterEach(() => {
  stdoutSpy.mockRestore();
  setOutputMode({ noColor: false });
});

function lines(): string[] {
  return stdoutSpy.mock.calls
    .map((c) => String(c[0]))
    .join('')
    .split('\n')
    .filter((l) => l.length > 0);
}

const columns: TableColumn<Row>[] = [
  { header: 'Key', key: 'key' },
  { header: 'Status', key: 'status' },
  { header: 'Summary', key: 'summary' },
];

describe('writeTable', () => {
  it('alinha colunas em duas linhas (cabeçalho + 1 row)', () => {
    writeTable<Row>([{ key: 'ABC-1', status: 'Open', summary: 'short' }], columns);
    const out = lines();
    expect(out).toHaveLength(2);
    // header em UPPER CASE
    expect(out[0]).toMatch(/^KEY\s+STATUS\s+SUMMARY$/);
    expect(out[1]).toMatch(/^ABC-1\s+Open\s+short$/);
  });

  it('cabeçalho sempre em UPPER CASE', () => {
    writeTable<Row>([{ key: 'ABC-1', status: 'Open', summary: 's' }], columns);
    const out = lines();
    expect(out[0]).toContain('KEY');
    expect(out[0]).toContain('STATUS');
    expect(out[0]).toContain('SUMMARY');
  });

  it('maxWidth trunca célula com ...', () => {
    const cols: TableColumn<Row>[] = [
      { header: 'Key', key: 'key' },
      { header: 'Summary', key: 'summary', maxWidth: 10 },
    ];
    writeTable<Row>(
      [{ key: 'ABC-1', status: '', summary: 'isso tem mais de 10 caracteres' }],
      cols,
    );
    const out = lines();
    // truncado para 10 chars com '...'
    expect(out[1]).toContain('isso te...');
    expect(out[1]).not.toContain('caracteres');
  });

  it('rows vazio NÃO escreve nada', () => {
    writeTable<Row>([], columns);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('chave ausente da row → célula vazia', () => {
    // typecast: simulando objeto incompleto
    writeTable<Row>([{ key: 'ABC-1' } as Row], columns);
    const out = lines();
    // segunda e terceira coluna devem aparecer vazias mas linhas continuam alinhadas
    expect(out[1]).toMatch(/^ABC-1\s*$/);
  });

  it('multiplas rows alinham coluna pelo maior valor', () => {
    writeTable<Row>(
      [
        { key: 'A-1', status: 'Open', summary: 'x' },
        { key: 'AB-100', status: 'In Progress', summary: 'y' },
      ],
      columns,
    );
    const out = lines();
    // largura da coluna Key = 6 ("AB-100")
    expect(out[1]?.startsWith('A-1   ')).toBe(true);
    expect(out[2]?.startsWith('AB-100')).toBe(true);
  });
});
