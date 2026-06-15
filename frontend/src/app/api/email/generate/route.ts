import { NextResponse } from 'next/server';
import { createClient } from '@/lib/insforge';

const INSFORGE_URL = (process.env.NEXT_PUBLIC_INSFORGE_URL || "https://qqskjqm7.us-east.insforge.app").replace(/^"|"$/g, '');
const INSFORGE_KEY = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "ik_846718b86955d3fece95d9ae0d840866").replace(/^"|"$/g, '');

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ detail: "Missing Authorization header" }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Create an authenticated InsForge client using the user's JWT
    const userInsforge = createClient({
      baseUrl: INSFORGE_URL,
      anonKey: INSFORGE_KEY,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Verify authentication
    const { data, error: authError } = await userInsforge.auth.getCurrentUser();
    if (authError || !data || !data.user) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }
    const user = data.user;

    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ detail: "Prompt is required" }, { status: 400 });
    }

    // Call the InsForge AI Chat completion gateway
    const completion = await userInsforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that writes professional marketing, announcement, or parent outreach emails. You must output a valid JSON object containing exactly two keys: 'subject' (a string containing a good subject line) and 'body' (a string containing the email body, formatted with line breaks if appropriate). Do not include any markdown wrappers or code block fences, just return raw JSON."
        },
        {
          role: "user",
          content: `Write an email based on the following instruction: ${prompt}`
        }
      ],
      temperature: 0.7,
      maxTokens: 1000
    });

    const content = completion.choices[0]?.message?.content || "";
    
    // Clean up potential markdown formatting fences in response
    let cleanJson = content.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.substring(7);
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.substring(3);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    cleanJson = cleanJson.trim();

    try {
      const parsed = JSON.parse(cleanJson);
      
      // Save the generated email to the database as a draft
      await userInsforge.from('email').insert([{
        user_id: user.id,
        subject: parsed.subject || "AI Generated Email",
        body: parsed.body || `Prompt: ${prompt}`,
        status: 'draft'
      }]);

      return NextResponse.json({
        subject: parsed.subject || "AI Generated Subject",
        body: parsed.body || cleanJson
      });
    } catch (parseErr) {
      console.error("Failed to parse AI output as JSON. Output was:", content);
      
      // Fallback: save raw output
      await userInsforge.from('email').insert([{
        user_id: user.id,
        subject: "AI Generated Email",
        body: content,
        status: 'draft'
      }]);

      return NextResponse.json({
        subject: "AI Generated Email",
        body: content
      });
    }
  } catch (error: any) {
    console.error("Email generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate email" }, { status: 500 });
  }
}

