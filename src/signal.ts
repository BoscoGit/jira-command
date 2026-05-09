import { rmSync } from 'node:fs';

let controller: AbortController = new AbortController();
const tmpFiles = new Set<string>();

export function getSignal(): AbortSignal {
  return controller.signal;
}

/** Reset do controller — exposto para testes que verificam estado abortado. */
export function resetSignalForTests(): void {
  controller = new AbortController();
  tmpFiles.clear();
}

export function registerTmpFile(path: string): void {
  tmpFiles.add(path);
}

export function unregisterTmpFile(path: string): void {
  tmpFiles.delete(path);
}

/**
 * Lógica pura do handler de SIGINT (RF-026):
 *  - aborta o controller em curso (cancela fetches pendentes)
 *  - remove tmp files registrados (force, sem erro se já sumiram)
 *  - retorna `130` (POSIX = 128 + SIGINT)
 *
 * NÃO chama `process.exit` — testável sem encerrar o processo.
 */
export function handleSigint(): 130 {
  controller.abort();
  for (const path of tmpFiles) {
    try {
      rmSync(path, { force: true });
    } catch {
      // intencional: se rmSync falhar mesmo com force, segue limpando os demais
    }
  }
  tmpFiles.clear();
  return 130;
}

/**
 * Wiring com efeito colateral. Chamar APENAS no entrypoint `cli.ts`.
 */
export function installSigintHandler(): void {
  process.on('SIGINT', () => {
    process.exit(handleSigint());
  });
}
