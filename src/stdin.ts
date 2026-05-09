import { JiraError } from './errors.js';

export async function readKeysFromStdin(): Promise<string[]> {
  if (process.stdin.isTTY) return [];

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text
    .split(/\r\n|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Resolve as Keys que um comando posicional deve processar.
 *
 * Comandos pipe-ready das specs 002+ devem chamar esta função quando o
 * argumento posicional `<KEY>` for opcional. Regras (RF-012):
 *  - Se `argKey` foi passado, prevalece sobre stdin.
 *  - Caso contrário, lê stdin não-TTY (linhas vazias ignoradas, trim aplicado).
 *  - Se nada foi recebido em ambos, lança `JiraError` exitCode 2.
 */
export async function resolveKeys(argKey: string | undefined): Promise<string[]> {
  if (argKey && argKey.length > 0) return [argKey];
  const fromStdin = await readKeysFromStdin();
  if (fromStdin.length === 0) {
    throw new JiraError('Nenhuma Key recebida via stdin nem como argumento.', 2);
  }
  return fromStdin;
}
