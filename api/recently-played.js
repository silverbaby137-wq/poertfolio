
 // Vercel serverless function: GET /api/recently-played
// Secrets live ONLY in environment variables (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET,
// SPOTIFY_REFRESH_TOKEN, optional ALLOWED_ORIGIN). Nothing secret is ever sent to the browser.
module.exports = async function handler(req, res) {
  const {
    SPOTIFY_CLIENT_ID: id,
    SPOTIFY_CLIENT_SECRET: secret,
    SPOTIFY_REFRESH_TOKEN: refresh
  } = process.env;

  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');

  if (!id || !secret || !refresh) {
    return res.status(503).json({ error: 'not_configured' });
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh
      })
    });

    if (!tokenRes.ok) {
      let code = 'unknown';
      let description = 'none';

      try {
        const body = await tokenRes.json();
        if (typeof body.error === 'string') code = body.error.slice(0, 60);
        if (typeof body.error_description === 'string') {
          description = body.error_description.slice(0, 120);
        }
      } catch (_) {}

      console.error('[spotify] token exchange failed', JSON.stringify({
        status: tokenRes.status,
        error: code,
        error_description: description,
        env: {
          clientIdSet: Boolean(id),
          clientSecretSet: Boolean(secret),
          refreshTokenSet: Boolean(refresh),
          anyValueHasEdgeWhitespace: [id, secret, refresh].some(v => v !== v.trim())
        }
      }));

      return res.status(502).json({ error: 'token_failed' });
    }

    const { access_token } = await tokenRes.json();

    const r = await fetch(
      'https://api.spotify.com/v1/me/player/recently-played?limit=1',
      { headers: { Authorization: 'Bearer ' + access_token } }
    );

    if (!r.ok) {
      return res.status(502).json({ error: 'spotify_failed', status: r.status });
    }

    const data = await r.json();
    const item = data.items && data.items[0];

    if (!item) return res.status(200).json({ track: null });

    const t = item.track;
    const images = (t.album && t.album.images) || [];

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

    return res.status(200).json({
      track: {
        title: t.name,
        artist: t.artists.map(a => a.name).join(', '),
        album: t.album && t.album.name,
        image: (images[1] || images[0] || {}).url || null,
        url: t.external_urls && t.external_urls.spotify,
        playedAt: item.played_at
      }
    });
  } catch (e) {
    console.error(
      '[spotify] unexpected error:',
      e && e.name,
      e && e.message ? String(e.message).slice(0, 120) : ''
    );
    return res.status(500).json({ error: 'server_error' });
  }
};
