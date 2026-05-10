import { createInterface } from 'node:readline';

interface ReadlineImpl {
  question(prompt: string): Promise<string>;
}

let readlineImpl: ReadlineImpl | null = null;

/** Permite injeção de readline para testes. */
export function setReadlineImplForTests(fn: ReadlineImpl | null): void {
  readlineImpl = fn;
}

function defaultRead(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Pergunta confirmação e retorna `true` apenas se a resposta (após trim+lowercase)
 * for `s` ou `y`. Em modo não-interativo (stdin OU stdout não-TTY), retorna `false`
 * sem perguntar.
 */
export async function confirmInteractive(question: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const ask = readlineImpl ? readlineImpl.question.bind(readlineImpl) : defaultRead;
  const answer = await ask(question);
  const norm = answer.trim().toLowerCase();
  return norm === 's' || norm === 'y';
}
