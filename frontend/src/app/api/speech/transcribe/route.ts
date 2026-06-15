import { NextResponse } from 'next/server';
import { createClient } from '@/lib/insforge';

const INSFORGE_URL = (process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://qqskjqm7.us-east.insforge.app').replace(/^"|"$/g, '');
const INSFORGE_KEY = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_846718b86955d3fece95d9ae0d840866').replace(/^"|"$/g, '');

export async function POST(req: Request) {
  try {
    // ── Auth check ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ detail: 'Missing Authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');

    const userInsforge = createClient({
      baseUrl: INSFORGE_URL,
      anonKey: INSFORGE_KEY,
      headers: { Authorization: `Bearer ${token}` },
    });

    const { data, error: authError } = await userInsforge.auth.getCurrentUser();
    if (authError || !data?.user) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    // ── Read the uploaded audio file ────────────────────────────
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ detail: 'No audio file provided' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // Determine MIME type — fallback to webm/opus (MediaRecorder default)
    const mimeType = file.type || 'audio/webm;codecs=opus';
    // Strip codec params for the Gemini API (it only wants the base type)
    const cleanMime = mimeType.split(';')[0] || 'audio/webm';

    // ── Call Gemini via InsForge AI gateway ──────────────────────
    // Gemini Flash supports audio inline_data natively
    const completion = await userInsforge.ai.chat.completions.create({
      model: 'google/gemini-2.0-flash',
      messages: [
        {
          role: 'user',
          // @ts-ignore — InsForge SDK accepts multimodal content arrays
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: base64Audio,
                format: cleanMime.replace('audio/', '') || 'webm',
              },
            },
            {
              type: 'text',
              text: 'Please transcribe the audio exactly as spoken. Return only the transcribed text with no extra commentary, labels, or formatting.',
            },
          ],
        },
      ],
      temperature: 0,
    });

    const transcript = completion.choices?.[0]?.message?.content?.trim() || '';

    if (!transcript) {
      return NextResponse.json(
        { detail: 'No speech detected. Please speak clearly and try again.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: transcript });
  } catch (error: any) {
    console.error('[/api/speech/transcribe] Error:', error);
    // Surface a readable message to the client
    const message =
      error?.message?.includes('model')
        ? 'Speech-to-text model unavailable. Please try again shortly.'
        : error?.message || 'Transcription failed';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
