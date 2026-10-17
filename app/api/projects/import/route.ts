import { handle, readJson } from "@/lib/server/api";
import { importProjects } from "@/lib/server/project-store";

/** Adds projects that were saved in this browser before accounts had a database. */
export async function POST(request: Request) {
  return handle(request, async (userId) => {
    const body = await readJson(request);
    if (body instanceof Response) return body;
    const list = (body as { projects?: unknown } | null)?.projects;
    if (!Array.isArray(list)) return Response.json({ error: "Send a list of projects." }, { status: 400 });
    return Response.json({ added: await importProjects(userId, list.slice(0, 100)) });
  });
}
