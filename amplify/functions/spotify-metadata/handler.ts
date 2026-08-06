import type { Handler, APIGatewayProxyEventV2 } from 'aws-lambda';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    // refresh a minute early
    expiresAt: Date.now() + (json.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

export const handler: Handler = async (event: APIGatewayProxyEventV2) => {
  const idsParam = event?.queryStringParameters?.ids;
  if (!idsParam) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing "ids" query parameter (comma-separated Spotify track IDs)' }),
    };
  }

  const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);

  try {
    const token = await getAccessToken();
    const res = await fetch(`https://api.spotify.com/v1/tracks?ids=${ids.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Spotify API request failed', details: text }),
      };
    }

    const json = (await res.json()) as { tracks: Array<Record<string, unknown> | null> };
    const tracks = json.tracks.map((t) => {
      if (!t) return null;
      const album = t.album as { name?: string; images?: Array<{ url: string }> } | undefined;
      const artists = t.artists as Array<{ name: string }> | undefined;
      return {
        id: t.id,
        name: t.name,
        album: album?.name ?? null,
        albumArtUrl: album?.images?.[0]?.url ?? null,
        artists: artists?.map((a) => a.name) ?? [],
        previewUrl: t.preview_url ?? null,
        externalUrl: (t.external_urls as { spotify?: string } | undefined)?.spotify ?? null,
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
      body: JSON.stringify({ tracks }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: (err as Error).message }),
    };
  }
};
