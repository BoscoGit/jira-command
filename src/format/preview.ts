/**
 * Trunca `text` para no máximo `max` caracteres.
 * Adiciona `...` apenas quando o texto original ultrapassa `max`.
 * Para `max <= 3`, trunca direto sem `...` (não há espaço para o sufixo).
 */
export function previewText(text: string, max: number): string {
  if (text.length <= max) return text;
  if (max <= 3) return text.slice(0, max);
  return `${text.slice(0, max - 3)}...`;
}
