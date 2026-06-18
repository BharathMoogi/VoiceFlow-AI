import { NextResponse } from "next/server";

// Models to try in order (primary first, then fallbacks)
const MODELS = [
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

async function callOpenRouter(apiKey: string, model: string, messages: any[], stream: boolean) {
  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://speaktomail.vercel.app",
      "X-Title": "VoiceFlow AI",
    },
    body: JSON.stringify({ model, messages, stream }),
  });
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json({ error: "OpenRouter API Key not configured" }, { status: 500 });
    }

    const formattedMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // Try each model in order until one works
    let response: Response | null = null;
    let lastError = "";
    for (const model of MODELS) {
      const attempt = await callOpenRouter(openRouterApiKey, model, formattedMessages, true);
      if (attempt.ok) {
        response = attempt;
        break;
      }
      // Read error and try next model on 404/429
      const errorText = await attempt.text();
      lastError = errorText;
      console.warn(`Model ${model} failed (${attempt.status}):`, errorText);
      if (attempt.status !== 404 && attempt.status !== 429) {
        // Non-retryable error — stop trying
        break;
      }
    }

    if (!response) {
      console.error("All models failed. Last error:", lastError);
      return NextResponse.json({ error: "AI service is temporarily unavailable. Please try again in a moment." }, { status: 503 });
    }

    const usedResponse = response;

    // Create a readable stream from the response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = usedResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            
            // OpenRouter sends SSE formatted data: "data: {...}\n\n"
            const lines = chunk.split("\n").filter(line => line.trim() !== "");
            
            for (const line of lines) {
              if (line.includes("[DONE]")) {
                continue; // Stream finished
              }
              if (line.startsWith("data:")) {
                try {
                  const data = JSON.parse(line.slice(5));
                  if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                    const textChunk = data.choices[0].delta.content;
                    // Send the raw text chunk down to the client
                    controller.enqueue(new TextEncoder().encode(textChunk));
                  }
                } catch (e) {
                  // Ignore parse errors on incomplete JSON chunks
                }
              }
            }
          }
        } catch (e) {
          console.error("Stream reading error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
