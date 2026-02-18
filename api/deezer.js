/**
 * Deezer API Proxy for Vercel
 * Handles CORS by proxying requests through serverless function
 */

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Missing query parameter: q' });
    }

    try {
        const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`;
        const response = await fetch(deezerUrl);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Deezer API error' });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Deezer proxy error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
