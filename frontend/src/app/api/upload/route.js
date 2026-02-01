import { TwelveLabs, TwelvelabsApi } from 'twelvelabs-js';
import { NextResponse } from 'next/server';

const twelvelabs_client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        const pegasusTask = await twelvelabs_client.tasks.create({
            indexId: process.env.NEXT_PUBLIC_TWELVELABS_PEGASUS_INDEX_ID,
            videoFile: file
        });

        const marengoTask = await twelvelabs_client.tasks.create({
            indexId: process.env.NEXT_PUBLIC_TWELVELABS_MARENGO_INDEX_ID,
            videoFile: file
        })

        return NextResponse.json({ pegasusTask });

    } catch (error) {
        console.error('Error uploading video:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
