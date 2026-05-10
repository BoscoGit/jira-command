import { spawn } from 'node:child_process';
import { JiraError } from '../errors.js';

export interface EditorCommand {
  cmd: string;
  args: string[];
}

type SpawnFn = (
  command: string,
  args: string[],
  options: { stdio: 'inherit' },
) => {
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

function splitTokens(raw: string): string[] {
  return raw.split(/\s+/).filter((t) => t.length > 0);
}

/**
 * Resolve qual editor + args usar (puro). Ordem:
 *  1. EDITOR
 *  2. VISUAL
 *  3. win32 → notepad.exe
 *  4. demais → nano (com fallback para vi em ENOENT runtime — ver openEditor)
 *
 * Quando EDITOR/VISUAL contém espaços, faz split em tokens.
 */
export function commandFor(
  filePath: string,
  env: NodeJS.ProcessEnv = process.env,
  plat: NodeJS.Platform = process.platform,
): EditorCommand {
  const fromEnv = env.EDITOR ?? env.VISUAL;
  if (fromEnv && fromEnv.trim().length > 0) {
    const tokens = splitTokens(fromEnv);
    const cmd = tokens[0] ?? '';
    return { cmd, args: [...tokens.slice(1), filePath] };
  }
  if (plat === 'win32') {
    return { cmd: 'notepad.exe', args: [filePath] };
  }
  return { cmd: 'nano', args: [filePath] };
}

function spawnAndWait(cmd: string, args: string[]): Promise<number | null> {
  return new Promise((resolve, reject) => {
    let child: ReturnType<SpawnFn>;
    try {
      child = spawnImpl(cmd, args, { stdio: 'inherit' });
    } catch (err) {
      reject(err);
      return;
    }
    child.on('error', (err: NodeJS.ErrnoException) => {
      reject(err);
    });
    child.on('close', (code: number | null) => {
      resolve(code);
    });
  });
}

/**
 * Abre o editor sobre `filePath`, herda stdio do terminal pai.
 * Aguarda fechar. Code != 0 → JiraError exitCode 1 (RF-009 do spec 004).
 * ENOENT em `nano` → tenta `vi` automaticamente (fallback do research D-006).
 * ENOENT em qualquer outro → JiraError exitCode 1.
 */
export async function openEditor(filePath: string): Promise<void> {
  const initial = commandFor(filePath);

  const tryOnce = async (cmd: string, args: string[]): Promise<number | null> => {
    return await spawnAndWait(cmd, args);
  };

  let code: number | null;
  try {
    code = await tryOnce(initial.cmd, initial.args);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === 'ENOENT' && initial.cmd === 'nano') {
      // Fallback nano → vi
      try {
        code = await tryOnce('vi', initial.args);
      } catch (err2) {
        throw new JiraError('Editor saiu com erro; descrição não foi alterada.', 1, {
          cause: err2,
        });
      }
    } else {
      throw new JiraError('Editor saiu com erro; descrição não foi alterada.', 1, {
        cause: err,
      });
    }
  }

  if (code !== 0) {
    throw new JiraError('Editor saiu com erro; descrição não foi alterada.', 1, {
      cause: { code },
    });
  }
}
