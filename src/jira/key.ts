import { JiraError } from '../errors.js';

export const KEY_REGEX = /^[A-Z][A-Z0-9_]+-\d+$/;

/**
 * Valida formato de Key Jira localmente (RF-008 do spec 002).
 * Retorna a Key normalizada quando válida; lança JiraError exitCode 2 caso contrário.
 */
export function validateKey(input: string): string {
  if (!input || !KEY_REGEX.test(input)) {
    throw new JiraError(`Formato de Key inválido: '${input}'. Esperado padrão tipo ABC-123.`, 2);
  }
  return input;
}
