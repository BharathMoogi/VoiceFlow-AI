import { NextResponse } from 'next/server';

// Use OpenRouter for audio transcription — the InsForge AI gateway doesn't
// reliably support multimodal audio `input_audio` content types.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

export async function POST(req: Request) {
  try {
    // ── Read the uploaded audio file ────────────────────────────
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const language = (formData.get('language') as string | null) || 'auto';
    if (!file || file.size === 0) {
      return NextResponse.json({ detail: 'No audio file provided' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    // Determine MIME type — fallback to webm/opus (MediaRecorder default)
    const mimeType = file.type || 'audio/webm;codecs=opus';
    // Clean mime for data URI (strip codec params)
    const cleanMime = mimeType.split(';')[0] || 'audio/webm';

    // Build language-aware transcription prompt
    const transcribePrompt = language === 'auto'
      ? 'Please transcribe the audio exactly as spoken. The audio may be in any language including Indian languages (Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Bengali, Urdu), Arabic, Chinese, Japanese, or any other language. Auto-detect the language and transcribe faithfully. Return only the transcribed text with no extra commentary, labels, or formatting.'
      : `Please transcribe the audio exactly as spoken in ${language}. Return only the transcribed text with no extra commentary, labels, or formatting.`;

    // ── Strategy 1: Try OpenRouter with Gemini Flash (native audio) ──
    if (OPENROUTER_API_KEY) {
      try {
        const transcript = await transcribeViaOpenRouter(base64Audio, cleanMime, transcribePrompt);
        if (transcript) {
          return NextResponse.json({ text: transcript });
        }
      } catch (err) {
        console.warn('[transcribe] OpenRouter attempt failed, trying InsForge fallback:', err);
      }
    }

    // ── Strategy 2: Fallback to InsForge AI gateway (text-only prompt) ──
    try {
      const transcript = await transcribeViaInsforge(base64Audio, cleanMime, transcribePrompt);
      if (transcript) {
        return NextResponse.json({ text: transcript });
      }
    } catch (err) {
      console.warn('[transcribe] InsForge fallback also failed:', err);
    }

    return NextResponse.json(
      { detail: 'Speech-to-text model unavailable. Please try again shortly.' },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('[/api/speech/transcribe] Error:', error);
    const message =
      error?.message?.includes('model')
        ? 'Speech-to-text model unavailable. Please try again shortly.'
        : error?.message || 'Transcription failed';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

/**
 * Transcribe audio via OpenRouter using google/gemini-2.0-flash
 * OpenRouter supports multimodal content with inline audio data.
 */
async function transcribeViaOpenRouter(base64Audio: string, mimeType: string, prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://speaktomail.vercel.app',
      'X-Title': 'VoiceFlow AI',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Audio}`,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Fallback: Transcribe via InsForge AI gateway using text-only Gemini.
 * This sends the audio as base64 in the text prompt (less reliable but works as fallback).
 */
async function transcribeViaInsforge(base64Audio: string, mimeType: string, prompt: string): Promise<string> {
  const { createClient } = await import('@insforge/sdk');

  const INSFORGE_URL = (process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://qqskjqm7.us-east.insforge.app').replace(/^"|"$/g, '');
  const INSFORGE_KEY = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_846718b86955d3fece95d9ae0d840866').replace(/^"|"$/g, '');

  const raw = createClient({ baseUrl: INSFORGE_URL, anonKey: INSFORGE_KEY });
  const insforge = raw as any;

  const completion = await insforge.ai.chat.completions.create({
    model: 'google/gemini-2.0-flash',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: {
              data: base64Audio,
              format: 'wav',
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
    temperature: 0,
  });

  return completion.choices?.[0]?.message?.content?.trim() || '';
}
