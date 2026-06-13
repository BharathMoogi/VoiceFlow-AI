import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    // In a real app, you would use the google-generativeai SDK here.
    // For now, returning a mock to ensure the migration doesn't break the frontend build.
    return NextResponse.json({
      subject: "AI Generated Subject",
      body: `This is an AI generated email based on: ${prompt}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
