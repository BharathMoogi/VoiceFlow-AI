import { NextResponse } from 'next/server';
import { createClient } from '@insforge/sdk/ssr';

const insforgeUrl = (process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://qqskjqm7.us-east.insforge.app').replace(/^"|"$/g, '');
const insforgeKey = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '').replace(/^"|"$/g, '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    const client = createClient({ baseUrl: insforgeUrl, anonKey: insforgeKey });

    const { data, error } = await client.emails.send({
      to,
      subject,
      html,
    });

    if (error) {
      console.error('InsForge email error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send email via InsForge' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Email send route error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
