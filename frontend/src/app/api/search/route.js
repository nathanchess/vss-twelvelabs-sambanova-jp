
import { TwelveLabs } from "twelvelabs-js";

const twelvelabs_client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });

export async function POST(request) {

    const { query, groupBy, threshold } = await request.json();

    const response = await twelvelabs_client.search.query({
        indexId: process.env.NEXT_PUBLIC_TWELVELABS_MARENGO_INDEX_ID,
        searchOptions: ['visual', 'audio'],
        queryText: query,
        groupBy: groupBy,
        threshold: threshold,
    })

    return new Response(JSON.stringify(response), { status: 200 });

}
