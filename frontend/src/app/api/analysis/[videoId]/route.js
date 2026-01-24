import { TwelveLabs, TwelvelabsApi } from 'twelvelabs-js';
import { translate, translateObject } from '../../translate/route';

const twelvelabs_client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });

export async function GET(request, { params }) {
    const { videoId } = await params;

    // Get language from query params (e.g., /api/analysis/abc123?language=jp)
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en';

    console.log(`[Gist API] Request received for videoId: ${videoId}, language: ${language}`);

    try {
        console.log(`[Gist API] Calling TwelveLabs gist API for videoId: ${videoId}`);

        const gist = await twelvelabs_client.gist({
            videoId: videoId,
            types: ['title', 'topic', 'hashtag']
        });

        if (language === 'jp') {
            const translatedGist = await translateObject(gist, 'jp');
            console.log(`[Gist API] Translated title:`, translatedGist);
            return new Response(JSON.stringify(translatedGist), { status: 200 });
        }

        console.log(`[Gist API] Raw gist response:`, JSON.stringify(gist, null, 2));
        return new Response(JSON.stringify(gist), { status: 200 });

    } catch (error) {
        console.error(`[Gist API] Error fetching gist for videoId: ${videoId}`);
        console.error(`[Gist API] Error name: ${error.name}`);
        console.error(`[Gist API] Error message: ${error.message}`);
        console.error(`[Gist API] Error stack: ${error.stack}`);

        if (error.body) {
            console.error(`[Gist API] TwelveLabs error body:`, JSON.stringify(error.body, null, 2));
        }

        if (error.status) {
            console.error(`[Gist API] TwelveLabs HTTP status: ${error.status}`);
        }

        // Check if it's a video_not_ready error from TwelveLabs
        if (error.message && error.message.includes('video_not_ready')) {
            console.log(`[Gist API] Video not ready - still indexing`);
            return new Response(JSON.stringify({
                code: 'video_not_ready',
                message: 'The video is still being indexed. Please try again once the indexing process is complete.',
                videoId: videoId
            }), { status: 202 });
        }

        // Check if it's a parameter_invalid error (video not in index yet)
        if (error.body && error.body.code === 'parameter_invalid' &&
            error.body.message && error.body.message.includes('video_id parameter is invalid')) {
            console.log(`[Gist API] Invalid video_id - video not uploaded yet`);
            return new Response(JSON.stringify({
                code: 'video_not_uploaded',
                message: 'The video is still being uploaded and processed. Please wait for the upload to complete.',
                videoId: videoId
            }), { status: 202 });
        }

        // Return detailed error for debugging
        return new Response(JSON.stringify({
            code: 'gist_error',
            message: `Error fetching gist: ${error.message}`,
            videoId: videoId,
            errorDetails: {
                name: error.name,
                message: error.message,
                body: error.body || null,
                status: error.status || null
            }
        }), { status: 500 });
    }
}