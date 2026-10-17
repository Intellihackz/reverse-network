import { DatabaseNotConfigured } from "./db";
import { authenticate } from "./auth";
import { ProjectLimitError } from "./project-store";

const MAX_BODY_BYTES = 2_000_000;

/** Verifies the caller and turns store errors into clean responses. */
export async function handle(
  request: Request,
  run: (userId: string) => Promise<Response>,
): Promise<Response> {
  const auth = await authenticate(request);
  if (!auth.ok) return auth.response;
  try {
    return await run(auth.userId);
  } catch (error) {
    if (error instanceof DatabaseNotConfigured) {
      return Response.json({ error: "Saving isn't set up on this server yet." }, { status: 503 });
    }
    if (error instanceof ProjectLimitError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("project api error", error instanceof Error ? error.message : error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/** Reads a JSON body, refusing anything oversized or malformed. */
export async function readJson(request: Request): Promise<unknown | Response> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return Response.json({ error: "That request is too large." }, { status: 413 });
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return Response.json({ error: "That request is too large." }, { status: 413 });
    return JSON.parse(text);
  } catch {
    return Response.json({ error: "Send valid JSON." }, { status: 400 });
  }
}

export const notFound = () => Response.json({ error: "Project not found." }, { status: 404 });
