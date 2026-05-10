import { describe, expect, it } from 'vitest';
import { previewText } from '../../src/format/preview.js';

describe('previewText', () => {
  it('texto curto retorna como veio (sem ...)', () => {
    expect(previewText('curto', 80)).toBe('curto');
  });

  it('texto exatamente do tamanho max retorna sem ...', () => {
    expect(previewText('1234567890', 10)).toBe('1234567890');
  });

  it('texto maior que max trunca com ...', () => {
    expect(previewText('12345678901234567890', 10)).toBe('1234567...');
    expect(previewText('1234567890', 7)).toBe('1234...');
  });

  it('max=4 trunca com ... (1 char + ...)', () => {
    expect(previewText('12345', 4)).toBe('1...');
  });

  it('max <= 3 trunca direto sem ...', () => {
    expect(previewText('12345', 3)).toBe('123');
    expect(previewText('12345', 2)).toBe('12');
    expect(previewText('12345', 1)).toBe('1');
  });

  it('texto vazio retorna vazio', () => {
    expect(previewText('', 10)).toBe('');
  });
});
