import { NextResponse } from 'next/server';
import { createClient as originalCreateClient } from '@insforge/sdk';

const INSFORGE_URL = (process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://qqskjqm7.us-east.insforge.app').replace(/^"|"$/g, '');
const INSFORGE_KEY = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_846718b86955d3fece95d9ae0d840866').replace(/^"|"$/g, '');

// Server-side InsForge client using anon key — no user auth needed
// (App uses FastAPI for auth, not InsForge auth)
function getServerClient() {
  const raw = originalCreateClient({ baseUrl: INSFORGE_URL, anonKey: INSFORGE_KEY });
  const client = raw as any;
  client.from = (table: string) => raw.database.from(table);
  return client;
}

export async function POST(req: Request) {
  try {
    // No auth guard — route uses InsForge anon key, not user JWT
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

    // Normalize format to OpenAI-supported formats (wav, mp3) to bypass gateway validation.
    // Gemini natively decodes the underlying container format automatically regardless of this label.
    let audioFormat = cleanMime.replace('audio/', '') || 'webm';
    if (audioFormat === 'mpeg' || audioFormat === 'mpga') {
      audioFormat = 'mp3';
    } else if (audioFormat !== 'wav' && audioFormat !== 'mp3') {
      audioFormat = 'wav';
    }

    const insforge = getServerClient();

    // ── Call Gemini via InsForge AI gateway ──────────────────────
    // Gemini Flash supports audio inline_data natively
    const completion = await insforge.ai.chat.completions.create({
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
                format: audioFormat,
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
