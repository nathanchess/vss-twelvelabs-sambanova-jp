import { TwelveLabs } from 'twelvelabs-js';
import { translate, translateObject } from '../../translate/route';

const twelvelabs_client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });

// JSON Schema for gist-style response (title, topics, hashtags)
const gistSchema = {
    type: "object",
    required: ["title", "topics", "hashtags"],
    properties: {
        title: {
            type: "string",
            description: "A concise, descriptive title summarizing the video content"
        },
        topics: {
            type: "array",
            items: {
                type: "string"
            },
            description: "Key topics or themes covered in the video"
        },
        hashtags: {
            type: "array",
            items: {
                type: "string"
            },
            description: "Relevant hashtags for the video content (without the # symbol)"
        }
    }
};

export async function GET(request, { params }) {
    const { videoId } = await params;

    // Get language from query params (e.g., /api/analysis/abc123?language=jp)
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en';

    console.log(`[Gist API] Request received for videoId: ${videoId}, language: ${language}`);

    try {
        console.log(`[Gist API] Calling TwelveLabs analyze API for videoId: ${videoId}`);

        const res = await twelvelabs_client.analyze({
            videoId: videoId,
            prompt: "Generate a concise title, a list of key topics, and relevant hashtags for this video. Focus on the main activities, equipment, safety aspects, and environment shown.",
            responseFormat: {
                type: "json_schema",
                jsonSchema: gistSchema,
            },
        });

        // Parse the structured JSON response
        let parsed;
        if (res.data && typeof res.data === 'string') {
            parsed = JSON.parse(res.data);
        } else if (res.data && typeof res.data === 'object') {
            parsed = res.data;
        } else {
            parsed = res;
        }

        // Normalize into expected format
        const result = {
            title: parsed.title || 'Untitled Video',
            topics: Array.isArray(parsed.topics) ? parsed.topics : [],
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        };

        if (language === 'jp') {
            const translatedResult = await translateObject(result, 'jp');
            console.log(`[Gist API] Translated result:`, translatedResult);
            return new Response(JSON.stringify(translatedResult), { status: 200 });
        }

        console.log(`[Gist API] Analyze response:`, JSON.stringify(result, null, 2));
        return new Response(JSON.stringify(result), { status: 200 });

    } catch (error) {
        console.error(`[Gist API] Error for videoId: ${videoId}:`, error.message);

        if (error.body) {
            console.error(`[Gist API] TwelveLabs error body:`, JSON.stringify(error.body, null, 2));
        }

        // Check if it's a video_not_ready error from TwelveLabs
        if (error.message && error.message.includes('video_not_ready')) {
            return new Response(JSON.stringify({
                code: 'video_not_ready',
                message: 'The video is still being indexed. Please try again once the indexing process is complete.',
                videoId: videoId
            }), { status: 202 });
        }

        // Check if it's a parameter_invalid error (video not in index yet)
        if (error.body && error.body.code === 'parameter_invalid' &&
            error.body.message && error.body.message.includes('video_id parameter is invalid')) {
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
        }), { status: 500 });
    }
}
