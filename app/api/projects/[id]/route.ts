import { handle, notFound, readJson } from "@/lib/server/api";
import { getOne, removeOne, updateOne } from "@/lib/server/project-store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();
  return handle(request, async (userId) => {
    const project = await getOne(userId, id);
    return project ? Response.json({ project }) : notFound();
  });
}

/** Saves brand and file edits. Everything else on a project comes from a scan. */
export async function PUT(request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();
  return handle(request, async (userId) => {
    const body = await readJson(request);
    if (body instanceof Response) return body;
    if (!body || typeof body !== "object") return Response.json({ error: "Send an object." }, { status: 400 });
    const { brand, edits } = body as { brand?: unknown; edits?: unknown };
    const project = await updateOne(userId, id, { brand, edits });
    return project ? Response.json({ project }) : notFound();
  });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();
  return handle(request, async (userId) => ((await removeOne(userId, id)) ? Response.json({ ok: true }) : notFound()));
}
