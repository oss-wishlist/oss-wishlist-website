/**
 * Markdown to HTML for text a practitioner wrote about themselves.
 *
 * `marked` does not sanitise. It never has: HTML in a markdown source document
 * is passed through by design, because in the original setting the author and
 * the publisher are the same person. Here they are not. A bio is written by
 * whoever is applying, rendered into the page with `set:html`, and read by
 * everyone who visits that profile, so it has to be treated as hostile input
 * and cleaned after rendering.
 *
 * The allow-list is what markdown itself can produce and nothing else. A bio
 * has no reason to contain a script, an iframe, a form, a style block or an
 * event handler, so none of those survive.
 */

import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/** The tags `marked` emits from ordinary markdown. */
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'strong', 'em', 'b', 'i', 'del', 's',
  'a',
  'ul', 'ol', 'li',
  'blockquote',
  'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    // rel and target are added by the transform below; they have to be allowed
    // here too or the sanitiser strips them straight back off again.
    a: ['href', 'title', 'rel', 'target'],
    // Language class from a fenced code block, nothing else.
    code: ['class'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
  },
  // Anything not listed here — javascript:, data:, vbscript: — is dropped.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  // A link in someone's bio points off-site, so it should not be able to reach
  // back through window.opener, and should not be read as our endorsement.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'nofollow noopener noreferrer',
      target: '_blank',
    }),
  },
  // Drop the contents of a disallowed tag as well as the tag, so a stripped
  // <script> does not leave its source code sitting in the page as text.
  nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript'],
};

/**
 * Render a bio to HTML that is safe to pass to `set:html`.
 *
 * Returns an empty string for empty input, so a caller can render the result
 * unconditionally without producing an empty element.
 */
export function renderBio(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const rendered = marked.parse(markdown, { async: false }) as string;
  return sanitizeHtml(rendered, OPTIONS);
}

/** Strip every tag, for places that want the text of a bio and not its markup. */
export function bioToText(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const rendered = marked.parse(markdown, { async: false }) as string;
  return sanitizeHtml(rendered, { allowedTags: [], allowedAttributes: {} }).trim();
}
