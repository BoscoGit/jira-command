import { spawn } from 'node:child_process';
import { JiraError } from '../errors.js';

type SpawnFn = (
  command: string,
  args: string[],
  options: { detached: boolean; stdio: 'ignore' },
) => {
  unref: () => void;
  on: (event: 'error', listener: (err: NodeJS.ErrnoException) => void) => void;
};

let spawnImpl: SpawnFn = spawn as unknown as SpawnFn;

/** Permite injeção de spawn para testes. */
export function setSpawnImplForTests(fn: SpawnFn | null): void {
  spawnImpl = fn ?? (spawn as unknown as SpawnFn);
}

/** Exportado para testes — calcula comando + args puramente da plataforma. */
export function commandFor(
  url: string,
  plat: NodeJS.Platform = process.platform,
): {
  cmd: string;
  args: string[];
} {
  if (plat === 'win32') {
    return { cmd: 'cmd', args: ['/c', 'start', '""', url] };
  }
  if (plat === 'darwin') {
    return { cmd: 'open', args: [url] };
  }
  return { cmd: 'xdg-open', args: [url] };
}

/**
 * Abre `url` no browser padrão do SO. Fire-and-forget (detached + unref).
 * Lança JiraError exitCode 6 quando o binário não existe (ENOENT).
 */
export async function openInBrowser(url: string): Promise<void> {
  const { cmd, args } = commandFor(url);
  return new Promise((resolve, reject) => {
    let child: ReturnType<SpawnFn>;
    try {
      child = spawnImpl(cmd, args, { detached: true, stdio: 'ignore' });
    } catch (err) {
      reject(new JiraError(`Falha ao abrir browser: ${(err as Error).message}`, 6, { cause: err }));
      return;
    }

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(
          new JiraError(`Falha ao abrir browser: comando '${cmd}' não encontrado no PATH.`, 6, {
            cause: err,
          }),
        );
        return;
      }
      reject(new JiraError(`Falha ao abrir browser: ${err.message}`, 6, { cause: err }));
    });

    child.unref();
    resolve();
  });
}
