import { TwelveLabs } from "twelvelabs-js";
import { translate } from "../translate/route";

const twelvelabs_client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });

// JSON Schema for chapter timeline response
const chapterSchema = {
    type: "object",
    required: ["chapters"],
    properties: {
        chapters: {
            type: "array",
            items: {
                type: "object",
                required: ["chapterNumber", "startSec", "endSec", "chapterTitle", "chapterSummary"],
                properties: {
                    chapterNumber: {
                        type: "integer",
                        description: "Sequential chapter number starting from 1"
                    },
                    startSec: {
                        type: "number",
                        description: "Start time of the chapter in seconds. Must equal the previous chapter's endSec. Chapter 1 must start at 0."
                    },
                    endSec: {
                        type: "number",
                        description: "End time of the chapter in seconds. Must be greater than startSec. The next chapter's startSec must equal this value."
                    },
                    chapterTitle: {
                        type: "string",
                        description: "Short, active phrase describing the event (e.g. 'Improper PPE Usage', 'Crane Lift Initiated')"
                    },
                    chapterSummary: {
                        type: "string",
                        description: "A single objective sentence describing what is happening, including any systematic issue or risk"
                    }
                }
            }
        }
    }
};

export async function POST(request) {

    const { videoId, prompt, type, language } = await request.json();

    try {

        let query = prompt;
        if (language === 'jp') {
            query = await translate(prompt, 'en');
        }

        // Build request options
        const analyzeOptions = {
            videoId: videoId,
            prompt: query,
        };

        // Add structured response format for chapter type
        if (type === 'chapter') {
            analyzeOptions.responseFormat = {
                type: "json_schema",
                jsonSchema: chapterSchema,
            };
        }

        const res = await twelvelabs_client.analyze(analyzeOptions);

        // Parse the structured JSON response from analyze
        // analyze returns { data: "..." } where data is a JSON string
        let parsed;
        if (res.data && typeof res.data === 'string') {
            parsed = JSON.parse(res.data);
        } else if (res.data && typeof res.data === 'object') {
            parsed = res.data;
        } else {
            parsed = res;
        }

        // Normalize into { chapters: [...] } format
        let result;
        if (parsed.chapters && Array.isArray(parsed.chapters)) {
            result = parsed;
        } else if (Array.isArray(parsed)) {
            result = { chapters: parsed };
        } else {
            result = { chapters: [] };
        }

        // Translate chapters if Japanese
        if (language === 'jp' && result.chapters) {
            for (const chapter of result.chapters) {
                if (chapter.chapterTitle) {
                    chapter.chapterTitle = await translate(chapter.chapterTitle, 'jp');
                }
                if (chapter.chapterSummary) {
                    chapter.chapterSummary = await translate(chapter.chapterSummary, 'jp');
                }
            }
        }

        return new Response(JSON.stringify(result), { status: 200 });

    } catch (error) {
        console.error("Error during timeline generation", error);

        // Check if it's a video_not_ready error from TwelveLabs
        if (error.message && error.message.includes('video_not_ready')) {
            return new Response(JSON.stringify({
                code: 'video_not_ready',
                message: 'The video is still being indexed. Please try again once the indexing process is complete.'
            }), { status: 202 }); // 202 Accepted - request accepted but processing not complete
        }

        // Check if it's a parameter_invalid error (video not in index yet)
        if (error.body && error.body.code === 'parameter_invalid' &&
            error.body.message && error.body.message.includes('video_id parameter is invalid')) {
            return new Response(JSON.stringify({
                code: 'video_not_uploaded',
                message: 'The video is still being uploaded and processed. Please wait for the upload to complete.'
            }), { status: 202 }); // 202 Accepted - request accepted but processing not complete
        }

        return new Response(JSON.stringify({
            code: 'timeline_error',
            error: 'Error generating timeline'
        }), { status: 500 });
    }

}