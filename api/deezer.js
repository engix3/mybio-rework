/**
 * Deezer API Proxy for Vercel
 * - Handles CORS for browser-side fetches.
 * - Caches identical queries at the Vercel edge for 24h (and lets the browser
 *   cache for 1h) to avoid hammering Deezer for popular tracks.
 * - Applies a lightweight per-IP token bucket to push back on abuse.
 *
 * Note: serverless functions can be cold-started on every invocation, so the
 * in-memory rate limit is best-effort. For strict guarantees use Upstash
 * Redis or Vercel KV.
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60;              // max requests per IP per window
const ipBuckets = new Map();

function getClientIp(req) {
    // Prefer Vercel-trusted headers. `x-real-ip` is set by the Vercel edge to the
    // direct connecting peer and is not client-spoofable. `x-vercel-forwarded-for`
    // is also set by the edge. Only fall back to `x-forwarded-for` when neither is
    // present, and in that case take the LAST hop (closest trusted proxy) rather
    // than the first, which is attacker-controlled in standard XFF semantics.
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.length > 0) return realIp;

    const vercelFwd = req.headers['x-vercel-forwarded-for'];
    if (typeof vercelFwd === 'string' && vercelFwd.length > 0) {
        return vercelFwd.split(',').pop().trim();
    }

    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) {
        return fwd.split(',').pop().trim();
    }

    return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(ip) {
    const now = Date.now();
    const entry = ipBuckets.get(ip);

    if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
        ipBuckets.set(ip, { windowStart: now, count: 1 });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetMs: RATE_LIMIT_WINDOW_MS };
    }

    entry.count += 1;
    const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
    const resetMs = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart);
    return { allowed: entry.count <= RATE_LIMIT_MAX, remaining, resetMs };
}

// Periodically prune stale buckets so the Map doesn't grow forever.
function pruneBuckets() {
    const now = Date.now();
    for (const [ip, entry] of ipBuckets) {
        if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS * 5) {
            ipBuckets.delete(ip);
        }
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Missing query parameter: q' });
    }

    if (typeof q === 'string' && q.length > 200) {
        return res.status(400).json({ error: 'Query too long' });
    }

    const ip = getClientIp(req);
    const { allowed, remaining, resetMs } = rateLimit(ip);
    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetMs / 1000)));

    if (!allowed) {
        res.setHeader('Retry-After', String(Math.ceil(resetMs / 1000)));
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    if (ipBuckets.size > 1000) pruneBuckets();

    try {
        const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`;
        const response = await fetch(deezerUrl);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Deezer API error' });
        }

        const data = await response.json();
        // Cache popular queries at the edge for a day, in the browser for an hour.
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
        return res.status(200).json(data);
    } catch (error) {
        console.error('Deezer proxy error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
