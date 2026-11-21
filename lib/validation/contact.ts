/**
 * Text helpers shared by every public form. The form schemas themselves live
 * in ./engagement.ts (partnership, support and contact).
 */

// Control characters, plus invisible bidi/zero-width characters that can be
// used to disguise text in an email client or the admin inbox.
// eslint-disable-next-line no-control-regex
const CONTROL_SINGLE = /[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;
// eslint-disable-next-line no-control-regex
const CONTROL_MULTI = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;

/** Strip control characters (keeping newlines/tabs in multi-line text) and tidy whitespace. */
export function clean(value: string, multiline = false): string {
  if (multiline) {
    return value.replace(/\r\n?/g, "\n").replace(CONTROL_MULTI, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  }
  return value.replace(/[\r\n\t]+/g, " ").replace(CONTROL_SINGLE, "").replace(/\s+/g, " ").trim();
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
