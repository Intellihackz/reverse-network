import * as z from "zod/v4";

import { analyzeProtocol } from "@/lib/analyzer/analyze";
import { authenticate } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/rate-limit";

export const maxDuration = 120;

const BodySchema = z.object({ url: z.string().min(3).max(2048) });

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;

  const limit = rateLimit(auth.userId);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many analyses. Try again in a few minutes." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Send a JSON body like { \"url\": \"app.example.com\" }." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of analyzeProtocol(body.url, request.signal)) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      } catch {
        // The client went away mid-stream; nothing left to report to
      } finally {
        try {
          controller.close();
        } catch {
          // already closed by cancellation
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
