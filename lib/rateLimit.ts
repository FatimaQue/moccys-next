import "server-only";

// A small in-memory limiter for the public endpoints that have no account to count against (visit tracking, newsletter,
// order tracking, ...). It is per server instance: on serverless hosting each instance keeps its own counts, so this
// stops a script hammering one endpoint, not a determined distributed attack. Anything that needs a hard guarantee
// (orders, logins, codes) is limited in the database instead.
const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

export function tooMany(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_KEYS) {
    // forget keys that have gone quiet so the map can't grow forever
    for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
    if (hits.size > MAX_KEYS) hits.clear();
  }
  return false;
}

// the caller's address as the host passes it on (first entry of x-forwarded-for is the real client)
export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
