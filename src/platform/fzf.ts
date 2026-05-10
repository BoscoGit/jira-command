import { spawn } from 'node:child_process';
import { JiraError } from '../errors.js';

type SpawnFn = (
  command: string,
  args: string[],
  options: { stdio: ['pipe', 'pipe', 'inherit'] },
) => {
  stdin: { write: (data: string) => void; end: () => void };
  stdout: { on: (event: 'data', listener: (chunk: Buffer) => void) => void };
  on: (
    event: 'close' | 'error',
    listener: ((code: number | null) => void) | ((err: NodeJS.ErrnoException) => void),
  ) => void;
};

let spawnImpl: SpawnFn = spawn as unknown as SpawnFn;

/** Permite injeção de spawn para testes. */
export function setSpawnImplForTests(fn: SpawnFn | null): void {
  spawnImpl = fn ?? (spawn as unknown as SpawnFn);
}

/**
 * Apresenta `lines` no fzf e retorna a linha selecionada (sem `\n`).
 * Retorna `null` quando user cancela (ESC, code 130) ou seleção vazia.
 * Lança JiraError exitCode 1 quando `fzf` não está no PATH.
 */
export async function pickWithFzf(lines: string[]): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let child: ReturnType<SpawnFn>;
    try {
      child = spawnImpl('fzf', [], { stdio: ['pipe', 'pipe', 'inherit'] });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e?.code === 'ENOENT') {
        reject(
          new JiraError('fzf não encontrado. Instale em: https://github.com/junegunn/fzf', 1, {
            cause: err,
          }),
        );
        return;
      }
      reject(new JiraError(`Falha ao executar fzf: ${(err as Error).message}`, 1, { cause: err }));
      return;
    }

    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(
          new JiraError('fzf não encontrado. Instale em: https://github.com/junegunn/fzf', 1, {
            cause: err,
          }),
        );
        return;
      }
      reject(new JiraError(`Falha ao executar fzf: ${err.message}`, 1, { cause: err }));
    });

    child.on('close', (code: number | null) => {
      if (code === 130 || code === 1) {
        // 130 = ESC; 1 = sem match
        resolve(null);
        return;
      }
      if (code === 0) {
        const sel = stdout.trim();
        resolve(sel.length > 0 ? sel : null);
        return;
      }
      reject(new JiraError(`fzf saiu com código ${code}.`, 1));
    });

    child.stdin.write(lines.join('\n'));
    child.stdin.end();
  });
}
