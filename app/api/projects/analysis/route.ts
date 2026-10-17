import { handle, readJson } from "@/lib/server/api";
import { saveScan } from "@/lib/server/project-store";
import type { AnalysisResult } from "@/lib/analyzer/types";

/** Turns a finished scan into a project (or refreshes the one you already have for that app). */
export async function POST(request: Request) {
  return handle(request, async (userId) => {
    const body = await readJson(request);
    if (body instanceof Response) return body;
    const result = (body as { result?: AnalysisResult } | null)?.result;
    if (!result || typeof result.host !== "string" || !Array.isArray(result.contracts) || !Array.isArray(result.chains)) {
      return Response.json({ error: "Send a scan result." }, { status: 400 });
    }
    return Response.json({ project: await saveScan(userId, result) });
  });
}
