import { handle } from "@/lib/server/api";
import { listFull, listSummaries } from "@/lib/server/project-store";

/** Lists your projects. ?full=1 includes findings and file edits, for backups. */
export async function GET(request: Request) {
  return handle(request, async (userId) => {
    const full = new URL(request.url).searchParams.get("full") === "1";
    return Response.json({ projects: full ? await listFull(userId) : await listSummaries(userId) });
  });
}
