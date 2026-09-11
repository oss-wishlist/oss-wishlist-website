/**
 * Playbook entry ids.
 *
 * The title-derivation tests that lived here went with the standalone playbook
 * page: it duplicated the service page and now redirects to it. What remains is
 * the id-to-folder mapping the redirect depends on.
 */
import { describe, it, expect } from 'vitest';
import { playbookFolder } from '../src/lib/playbook-title';

describe('playbookFolder', () => {
  it('strips the suffix the glob loader adds', () => {
    expect(playbookFolder('security-audit/playbook')).toBe('security-audit');
  });

  it('leaves a bare folder alone', () => {
    expect(playbookFolder('security-audit')).toBe('security-audit');
  });

  it('only strips the suffix at the end', () => {
    expect(playbookFolder('playbook-writing/playbook')).toBe('playbook-writing');
  });
});
