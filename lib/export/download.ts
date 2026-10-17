import type { Project } from "@/lib/projects";

import { appSlug, buildAppFiles } from "./build-app";
import { createZip } from "./zip";

/** Builds the branded app as a zip in the browser and saves it. */
export function downloadBrandedApp(project: Project) {
  const blob = createZip(buildAppFiles(project));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = appSlug(project) + ".zip";
  link.click();
  URL.revokeObjectURL(url);
}
