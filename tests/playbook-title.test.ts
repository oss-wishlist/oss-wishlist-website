/**
 * Every playbook page on the live site returned 502 because the route assumed
 * frontmatter that none of the playbooks have. These are the cases that stop
 * that happening again.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  playbookTitle,
  playbookFolder,
  titleFromBody,
  titleFromFolder,
} from '../src/lib/playbook-title';

describe('playbookTitle', () => {
  it('prefers frontmatter when a playbook declares a title', () => {
    expect(playbookTitle({ title: 'Declared' }, '# From body', 'folder-name')).toBe('Declared');
  });

  // The actual shape of every playbook in the repository: no frontmatter.
  it('falls back to the first heading', () => {
    expect(playbookTitle({}, '# Funding Strategy Playbook\n\nBody.', 'funding-strategy')).toBe(
      'Funding Strategy Playbook'
    );
  });

  it('falls back to the folder when there is no heading either', () => {
    expect(playbookTitle({}, 'No heading here.', 'succession-planning')).toBe(
      'Succession Planning'
    );
  });

  it('always returns a string, whatever it is handed', () => {
    for (const data of [null, undefined, {}, { title: null }, { title: '   ' }]) {
      const out = playbookTitle(data as never, undefined, 'winding-down');
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
      // The specific crash: formatting the title threw when it was undefined.
      expect(() => out.toLowerCase()).not.toThrow();
    }
  });

  it('ignores a heading that is deeper than h1', () => {
    expect(titleFromBody('## Not the title')).toBeNull();
  });

  it('finds a heading that is not on the first line', () => {
    expect(titleFromBody('\n\n# Later heading\n')).toBe('Later heading');
  });

  it('turns a folder into words', () => {
    expect(titleFromFolder('ai-consent-framework-for-oss')).toBe('Ai Consent Framework For Oss');
  });
});

describe('playbookFolder', () => {
  it('strips the entry id suffix the glob loader adds', () => {
    expect(playbookFolder('security-audit/playbook')).toBe('security-audit');
  });

  it('leaves a bare folder alone', () => {
    expect(playbookFolder('security-audit')).toBe('security-audit');
  });
});

/*
  The regression itself. Run against the real content rather than fixtures,
  because the bug was that the real content does not look like the schema
  suggests it does.
*/
describe('the playbooks actually in this repository', () => {
  const dir = join(process.cwd(), 'src/content/playbooks-external');
  const folders = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, 'playbook.md')))
        .map((e) => e.name)
    : [];

  it('there are playbooks to check', () => {
    expect(folders.length).toBeGreaterThan(0);
  });

  it.each(folders)('%s resolves to a usable title', (folder) => {
    const body = readFileSync(join(dir, folder, 'playbook.md'), 'utf8');
    const title = playbookTitle({}, body, folder);

    expect(title).toBeTruthy();
    expect(title).not.toBe('undefined');
    expect(() => title.toLowerCase()).not.toThrow();
  });
});
