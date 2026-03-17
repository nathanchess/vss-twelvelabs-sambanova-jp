export async function POST(request) {
    // Read at request time so runtime env is used (avoids build-time inlining on Vercel/some hosts)
    const RTSP_STREAM_WORKER_URL = (process.env.RTSP_STREAM_WORKER_URL || '').trim();
    const INTERNAL_API_KEY = (process.env.INTERNAL_API_KEY || '').trim();
    const API_KEY_HEADER_NAME = 'X-API-Key';

    console.log('[api/stream/get] INTERNAL_API_KEY set:', !!INTERNAL_API_KEY);

    if (!RTSP_STREAM_WORKER_URL) {
        return new Response(JSON.stringify({ detail: 'RTSP_STREAM_WORKER_URL not configured' }), { status: 500 });
    }
    if (!INTERNAL_API_KEY) {
        console.warn('[api/stream/get] INTERNAL_API_KEY is not set on this server — backend will return 403. Set INTERNAL_API_KEY in the environment where Next.js runs.');
    }

    const body = await request.json();
    const payload = { stream_name: body.stream_name };

    const headers = { 'Content-Type': 'application/json' };
    if (INTERNAL_API_KEY) {
        headers[API_KEY_HEADER_NAME] = INTERNAL_API_KEY;
    }

    const resp = await fetch(`${RTSP_STREAM_WORKER_URL}/get_stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });

    const data = await resp.text();
    const responseHeaders = {
        'Content-Type': 'application/json',
        // Debug: confirms whether this server had the key when proxying (remove in production if desired)
        'X-Proxy-Had-Key': INTERNAL_API_KEY ? 'yes' : 'no',
    };
    return new Response(data, { status: resp.status, headers: responseHeaders });
}

