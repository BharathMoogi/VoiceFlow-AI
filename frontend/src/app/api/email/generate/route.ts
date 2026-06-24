import { NextResponse } from 'next/server';
import { createClient as originalCreateClient } from '@insforge/sdk';

const INSFORGE_URL = (process.env.NEXT_PUBLIC_INSFORGE_URL || "https://qqskjqm7.us-east.insforge.app").replace(/^"|"$/g, '');
const INSFORGE_KEY = (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || "ik_846718b86955d3fece95d9ae0d840866").replace(/^"|"$/g, '');

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

    const body = await req.json();
    const { prompt, userName, userEmail, userPhone } = body;
    if (!prompt) {
      return NextResponse.json({ detail: "Prompt is required" }, { status: 400 });
    }

    const insforge = getServerClient();

    let signatureContext = "";
    if (userName) {
      signatureContext = `\nThe sender of this email is named "${userName}".`;
      if (userEmail) signatureContext += ` Their email is "${userEmail}".`;
      if (userPhone) signatureContext += ` Their phone number is "${userPhone}".`;
      signatureContext += " Please close the email with a professional sign-off (e.g. 'Best regards,' or 'Regards,') and write the sender's details exactly as provided (excluding any bracket placeholders or fake info).";
    }

    // Call the InsForge AI Chat completion gateway with anon key
    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that writes professional marketing, announcement, or parent outreach emails. " +
            "You must output a valid JSON object containing exactly two keys: " +
            "'subject' (a string containing a good subject line) and " +
            "'body' (a string containing the email body, formatted with line breaks if appropriate). " +
            "Do not include any markdown wrappers or code block fences, just return raw JSON." +
            signatureContext,
        },
        {
          role: "user",
          content: `Write an email based on the following instruction: ${prompt}`,
        },
      ],
      temperature: 0.7,
      maxTokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || "";

    // Strip markdown code fences if present
    let cleanJson = content.trim();
    if (cleanJson.startsWith("```json")) cleanJson = cleanJson.slice(7);
    else if (cleanJson.startsWith("```")) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith("```")) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    try {
      const parsed = JSON.parse(cleanJson);
      return NextResponse.json({
        subject: parsed.subject || "AI Generated Email",
        body: parsed.body || cleanJson,
      });
    } catch {
      // AI returned non-JSON — return it as the body
      return NextResponse.json({
        subject: "AI Generated Email",
        body: cleanJson || content,
      });
    }
  } catch (error: any) {
    console.error("Email generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate email" },
      { status: 500 }
    );
  }
}
