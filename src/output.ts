import pc from 'picocolors';

type Color = 'green' | 'yellow' | 'red' | 'cyan' | 'gray';

interface OutputMode {
  json: boolean;
  quiet: boolean;
  noColor: boolean;
}

const mode: OutputMode = {
  json: false,
  quiet: false,
  noColor: false,
};

export function setOutputMode(next: Partial<OutputMode>): void {
  if (typeof next.json === 'boolean') mode.json = next.json;
  if (typeof next.quiet === 'boolean') mode.quiet = next.quiet;
  if (typeof next.noColor === 'boolean') mode.noColor = next.noColor;
}

export function getOutputMode(): Readonly<OutputMode> {
  return { ...mode };
}

export function colorsEnabled(): boolean {
  if (mode.noColor) return false;
  if (process.env.NO_COLOR && process.env.NO_COLOR !== '') return false;
  if (!process.stdout.isTTY) return false;
  return true;
}

function paint(text: string, color?: Color): string {
  if (!color || !colorsEnabled()) return text;
  switch (color) {
    case 'green':
      return pc.green(text);
    case 'yellow':
      return pc.yellow(text);
    case 'red':
      return pc.red(text);
    case 'cyan':
      return pc.cyan(text);
    case 'gray':
      return pc.gray(text);
    default:
      return text;
  }
}

export function humanLog(stream: NodeJS.WriteStream, msg: string, color?: Color): void {
  stream.write(`${paint(msg, color)}\n`);
}

export function humanError(msg: string): void {
  process.stderr.write(`${paint(msg, 'red')}\n`);
}

export function jsonOut(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

export function quietOut(key: string): void {
  process.stdout.write(`${key}\n`);
}
