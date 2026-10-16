# Spotify "most recently played" setup (one-time, ~15 min)

Why a backend: Spotify's recently-played data is private to your account, so it needs your OAuth consent,
a client secret and a refresh token. Those must never be in the HTML. `api/recently-played.js` keeps them in
environment variables and returns only track title/artist/artwork/link.

1. Account: the app owner needs Spotify Premium (Dev Mode rule since Feb/Mar 2026; max 5 users, 1 Client ID).
2. https://developer.spotify.com/dashboard -> Create app. Redirect URI: http://127.0.0.1:8888/callback
   (Web API). Copy Client ID and Client Secret.
3. Get a refresh token once, on your computer (scope `user-read-recently-played`):
   - Open in a browser (fill in CLIENT_ID):
     https://accounts.spotify.com/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A8888%2Fcallback&scope=user-read-recently-played
   - Approve; the browser lands on a dead page whose URL has `?code=XXXX`. Copy XXXX (use it within minutes).
   - Terminal:
     curl -X POST https://accounts.spotify.com/api/token \
       -u CLIENT_ID:CLIENT_SECRET \
       -d grant_type=authorization_code -d code=XXXX \
       -d redirect_uri=http://127.0.0.1:8888/callback
   - Save the `refresh_token` from the response.
4. Deploy the project to Vercel (drag the folder in / `vercel`). In Project -> Settings -> Environment Variables add:
   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN (optional ALLOWED_ORIGIN=https://yourdomain).
5. Open the site. If hosting the page elsewhere, set `data-endpoint` on `#spotify` to the full function URL.
