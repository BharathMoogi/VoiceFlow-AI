import { NextResponse } from "next/server";

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

    // Format messages for OpenRouter (assumes user/assistant roles are already correct)
    const formattedMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // Start a streaming request to OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://speaktomail.vercel.app", // Optional, for OpenRouter analytics
        "X-Title": "VoiceFlow AI", // Optional, for OpenRouter analytics
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat:free", // Using DeepSeek V3 (free tier on OpenRouter)
        messages: formattedMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter Error:", errorText);
      return NextResponse.json({ error: "Failed to generate response" }, { status: response.status });
    }

    // Create a readable stream from the response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
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
