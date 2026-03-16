const RTSP_STREAM_WORKER_URL = process.env.RTSP_STREAM_WORKER_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const API_KEY_HEADER_NAME = 'X-API-Key';

export async function POST(request) {
    if (!RTSP_STREAM_WORKER_URL) {
        return new Response(JSON.stringify({ detail: 'RTSP_STREAM_WORKER_URL not configured' }), { status: 500 });
    }

    const body = await request.json();
    const payload = {
        stream_name: body.stream_name,
        s3_video_key: body.s3_video_key,
    };

    const headers = { 'Content-Type': 'application/json' };
    if (INTERNAL_API_KEY) {
        headers[API_KEY_HEADER_NAME] = INTERNAL_API_KEY;
    }

    const resp = await fetch(`${RTSP_STREAM_WORKER_URL}/add_stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });

    const data = await resp.text();
    return new Response(data, { status: resp.status, headers: { 'Content-Type': 'application/json' } });
}

