/**
 * Deterministic token hash for local development (Implementation.md §8.1:
 * "Never persist a reusable plain-text invitation token. Store only a secure
 * hash"). This is a plain digest, not a cryptographic secret-keyed hash —
 * adequate for local/dev storage of low-value, short-lived, single-use
 * invitation tokens. The Supabase phase can swap in a stronger hash behind
 * the same call shape without callers changing.
 */
export function hashToken(plaintext: string): string {
  let hash = 0;
  for (let i = 0; i < plaintext.length; i++) {
    hash = (Math.imul(hash, 31) + plaintext.charCodeAt(i)) | 0;
  }
  return `h${(hash >>> 0).toString(16)}`;
}
