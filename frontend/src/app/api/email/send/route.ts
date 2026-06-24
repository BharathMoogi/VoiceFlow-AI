import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'VoiceFlow AI';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, html, senderName, senderEmail, attachments } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Email service is not configured. Please set RESEND_API_KEY in .env.local.' },
        { status: 500 }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    const fromName = senderName || FROM_NAME;
    const emailOptions: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      replyTo?: string;
      attachments?: { filename: string; path: string }[];
    } = {
      from: `${fromName} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      emailOptions.attachments = attachments.map((att: any) => ({
        filename: att.name || "attachment",
        path: att.url
      }));
    }

    if (senderEmail) {
      emailOptions.replyTo = senderEmail;
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to send email via Resend' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Email send route error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
