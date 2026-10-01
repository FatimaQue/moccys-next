// Where to go after signing in. Only a path on this site is accepted, so a crafted ?next= link can't send
// someone to another website once they've logged in.
export const DEFAULT_AFTER_LOGIN = "/account";

export function safeNext(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_AFTER_LOGIN;
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") ? raw : DEFAULT_AFTER_LOGIN;
}

// keeps the destination when hopping between the login and sign-up pages
export const withNext = (path: string, next: string) =>
  next === DEFAULT_AFTER_LOGIN ? path : `${path}?next=${encodeURIComponent(next)}`;
