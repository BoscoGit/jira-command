import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runRootSafe } from '../../src/commands/root.js';
import * as editMod from '../../src/jira/edit.js';
import { setOutputMode } from '../../src/output.js';
import * as editorMod from '../../src/platform/editor.js';
import * as signalMod from '../../src/signal.js';

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.JIRA_TOKEN = 'TKN';
  process.env.JIRA_BASE_URL = 'https://jira.example.com';
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
  setOutputMode({ json: false, quiet: false, noColor: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function stderrText(): string {
  return stderrSpy.mock.calls.map((c) => String(c[0])).join('');
}
function stdoutText(): string {
  return stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
}

describe('jira desc', () => {
  it('mudança aplica updateField + log "atualizada"', async () => {
    vi.spyOn(editMod, 'getDescription').mockResolvedValueOnce('original');
    const upd = vi.spyOn(editMod, 'updateField').mockResolvedValueOnce(undefined);
    // openEditor: mocka spawn-side; aqui simplesmente injeta novo conteúdo no path
    vi.spyOn(editorMod, 'openEditor').mockImplementationOnce(async (path: string) => {
      writeFileSync(path, 'novo conteúdo', 'utf8');
    });

    const code = await runRootSafe(['desc', 'ABC-1']);
    expect(code).toBe(0);
    expect(upd).toHaveBeenCalledWith(expect.anything(), 'ABC-1', {
      description: 'novo conteúdo',
    });
    expect(stderrText()).toContain('ABC-1 descrição atualizada.');
  });

  it('sem mudança NÃO chama updateField (CS-003)', async () => {
    vi.spyOn(editMod, 'getDescription').mockResolvedValueOnce('mesma');
    const upd = vi.spyOn(editMod, 'updateField');
    vi.spyOn(editorMod, 'openEditor').mockImplementationOnce(async (path: string) => {
      // Mantém o conteúdo igual
      writeFileSync(path, 'mesma', 'utf8');
    });

    const code = await runRootSafe(['desc', 'ABC-1']);
    expect(code).toBe(0);
    expect(upd).not.toHaveBeenCalled();
    expect(stderrText()).toContain('Sem alterações em ABC-1.');
  });

  it('trim trailing newlines: original + "\\n" considerado igual', async () => {
    vi.spyOn(editMod, 'getDescription').mockResolvedValueOnce('texto');
    const upd = vi.spyOn(editMod, 'updateField');
    vi.spyOn(editorMod, 'openEditor').mockImplementationOnce(async (path: string) => {
      writeFileSync(path, 'texto\r\n\n', 'utf8');
    });

    const code = await runRootSafe(['desc', 'ABC-1']);
    expect(code).toBe(0);
    expect(upd).not.toHaveBeenCalled();
  });

  it('pipe (stdout não-TTY) → exit 2 antes de getDescription', async () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    const get = vi.spyOn(editMod, 'getDescription');
    const code = await runRootSafe(['desc', 'ABC-1']);
    expect(code).toBe(2);
    expect(get).not.toHaveBeenCalled();
    expect(stderrText()).toContain('desc requer terminal interativo.');
  });

  it('editor exit != 0 → exit 1, sem updateField', async () => {
    vi.spyOn(editMod, 'getDescription').mockResolvedValueOnce('x');
    const upd = vi.spyOn(editMod, 'updateField');
    vi.spyOn(editorMod, 'openEditor').mockRejectedValueOnce(
      new (await import('../../src/errors.js')).JiraError(
        'Editor saiu com erro; descrição não foi alterada.',
        1,
      ),
    );
    const code = await runRootSafe(['desc', 'ABC-1']);
    expect(code).toBe(1);
    expect(upd).not.toHaveBeenCalled();
  });

  it('tmp file removido em finally mesmo em erro do editor', async () => {
    let capturedPath: string | undefined;
    vi.spyOn(editMod, 'getDescription').mockResolvedValueOnce('x');
    vi.spyOn(editorMod, 'openEditor').mockImplementationOnce(async (path: string) => {
      capturedPath = path;
      // simula readback funcionando — mas faz editor "falhar" depois
      writeFileSync(path, 'x', 'utf8');
      throw new (await import('../../src/errors.js')).JiraError('boom', 1);
    });
    const code = await runRootSafe(['desc', 'ABC-1']);
    expect(code).toBe(1);
    expect(capturedPath).toBeDefined();
    if (capturedPath) {
      expect(existsSync(capturedPath)).toBe(false);
    }
  });

  it('registerTmpFile chamado com path', async () => {
    vi.spyOn(editMod, 'getDescription').mockResolvedValueOnce('x');
    vi.spyOn(editorMod, 'openEditor').mockImplementationOnce(async (path: string) => {
      writeFileSync(path, 'x', 'utf8');
    });
    const reg = vi.spyOn(signalMod, 'registerTmpFile');
    const code = await runRootSafe(['desc', 'ABC-1']);
    expect(code).toBe(0);
    expect(reg).toHaveBeenCalledTimes(1);
    expect(String(reg.mock.calls[0]?.[0] ?? '')).toMatch(/jira-ABC-1-/);
  });

  it('--json updated:true', async () => {
    vi.spyOn(editMod, 'getDescription').mockResolvedValueOnce('a');
    vi.spyOn(editMod, 'updateField').mockResolvedValueOnce(undefined);
    vi.spyOn(editorMod, 'openEditor').mockImplementationOnce(async (path: string) => {
      writeFileSync(path, 'b', 'utf8');
    });
    const code = await runRootSafe(['--json', 'desc', 'ABC-1']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Record<string, unknown>;
    expect(parsed).toEqual({ ok: true, key: 'ABC-1', action: 'desc', updated: true });
  });

  it('--json updated:false', async () => {
    vi.spyOn(editMod, 'getDescription').mockResolvedValueOnce('mesma');
    vi.spyOn(editorMod, 'openEditor').mockImplementationOnce(async (path: string) => {
      writeFileSync(path, 'mesma', 'utf8');
    });
    const code = await runRootSafe(['--json', 'desc', 'ABC-1']);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdoutText().trim()) as Record<string, unknown>;
    expect(parsed).toEqual({ ok: true, key: 'ABC-1', action: 'desc', updated: false });
  });

  it('Key inválida → exit 2', async () => {
    const get = vi.spyOn(editMod, 'getDescription');
    const code = await runRootSafe(['desc', 'lixo']);
    expect(code).toBe(2);
    expect(get).not.toHaveBeenCalled();
  });
});

// Suppress lint for unused import — readFileSync used pelo openEditor mock
void readFileSync;
