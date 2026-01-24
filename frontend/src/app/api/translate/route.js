import SambaNova from "sambanova";

const API_KEY = process.env.SAMBANOVA_API_KEY;

const client = new SambaNova({
    baseURL: 'https://api.sambanova.ai/v1',
    apiKey: API_KEY
})

/**
 * Translate text between English and Japanese using SambaLingo model.
 * @param {string} text - The text to translate
 * @param {string} targetLang - Target language: 'jp' for Japanese, 'en' for English
 * @returns {Promise<string>} - The translated text
 */

export async function translate(text, targetLang) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    const desiredLanguage = targetLang === 'jp' ? 'Japanese' : 'English';
    const prompt = `Please translate the following text to ${desiredLanguage}. Return ONLY the translation, no explanations or additional text. If the text is already in ${desiredLanguage}, return it unchanged.\n\nText: ${text}`;

    try {

        const response = await client.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "Llama-3.3-Swallow-70B-Instruct-v0.4",
        })

        const result = response.choices[0]?.message?.content;

        if (!result) {
            console.error('Translation returned empty result');
            return text; // Fallback to original
        }

        console.log(`Translated (${targetLang}):`, result.substring(0, 100) + '...');

        // Strip markdown code fences if present (LLM sometimes wraps JSON in ```json ... ```)
        const cleanedResult = result
            .replace(/^\s*```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/i, '')
            .trim();

        return cleanedResult;

    } catch (error) {
        console.error('Translation error:', error);
        return text; // Fallback to original text on error
    }
}

/**
 * Dynamically generate a JSON schema from an object for structured output.
 * @param {any} value - The value to generate schema for
 * @returns {object} - JSON schema object
 */
function generateJsonSchema(value) {
    if (value === null) {
        return { type: "null" };
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return { type: "array", items: { type: "string" } };
        }
        // Use the first element to determine array item type
        return { type: "array", items: generateJsonSchema(value[0]) };
    }

    if (typeof value === 'object') {
        const properties = {};
        const required = [];
        for (const [key, val] of Object.entries(value)) {
            properties[key] = generateJsonSchema(val);
            required.push(key);
        }
        return {
            type: "object",
            properties,
            required,
            additionalProperties: false
        };
    }

    if (typeof value === 'string') {
        return { type: "string" };
    }

    if (typeof value === 'number') {
        return Number.isInteger(value) ? { type: "integer" } : { type: "number" };
    }

    if (typeof value === 'boolean') {
        return { type: "boolean" };
    }

    return { type: "string" };
}

/**
 * Translate JSON object values in a single API call using structured output.
 * Preserves the exact structure while translating all string values.
 * @param {object} obj - The object to translate
 * @param {string} targetLang - Target language: 'jp' for Japanese, 'en' for English
 * @returns {Promise<object>} - The translated object
 */
export async function translateObject(obj, targetLang) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    console.log(`Translating object (${targetLang}):`, JSON.stringify(obj, null, 2));

    const desiredLanguage = targetLang === 'jp' ? 'Japanese' : 'English';

    // Generate JSON schema from the input object
    const schema = generateJsonSchema(obj);

    const prompt = `You are a translator. Translate ALL string values in the following JSON to ${desiredLanguage}. 
Keep the exact same structure and keys. Only translate the string values - preserve numbers, booleans, and null values exactly as they are.
If a string is already in ${desiredLanguage}, keep it unchanged.

Input JSON:
${JSON.stringify(obj, null, 2)}

Return the translated JSON with the exact same structure.`;

    try {
        const response = await client.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "Llama-3.3-Swallow-70B-Instruct-v0.4",
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "translated_object",
                    strict: true,
                    schema: schema
                }
            }
        });

        const result = response.choices[0]?.message?.content;

        if (!result) {
            console.error('Translation returned empty result');
            return obj; // Fallback to original
        }

        // Strip markdown code fences if present (```json ... ```)
        const cleanedResult = result
            .replace(/^\s*```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/i, '')
            .trim();

        const parsed = JSON.parse(cleanedResult);
        console.log(`Translated object (${targetLang}):`, JSON.stringify(parsed, null, 2));
        return parsed;

    } catch (error) {
        console.error('Translation error:', error);
        return obj; // Fallback to original object on error
    }
}

// API Route handler for direct translation requests
export async function POST(request) {
    try {
        const { text, language } = await request.json();

        if (!text) {
            return new Response(JSON.stringify({
                error: 'Missing text parameter'
            }), { status: 400 });
        }

        const translatedText = await translate(text, language || 'jp');

        return new Response(JSON.stringify({
            text: translatedText,
            originalLanguage: language === 'jp' ? 'en' : 'jp',
            targetLanguage: language || 'jp'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Translation API error:', error);
        return new Response(JSON.stringify({
            error: 'Translation failed',
            message: error.message
        }), { status: 500 });
    }
}