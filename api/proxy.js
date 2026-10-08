export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing ?url= query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch (_) {
      return new Response(JSON.stringify({ error: 'Invalid URL provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Upstream fetch from edge server
    const response = await fetch(parsedTarget.toString(), {
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': request.headers.get('accept') || '*/*',
        'Accept-Language': request.headers.get('accept-language') || 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    // Strip blocking headers and enable CORS
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.delete('X-Frame-Options');
    headers.delete('Content-Security-Policy');
    headers.delete('Content-Security-Policy-Report-Only');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy fetch failed', message: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
