import type { Project } from "@/lib/projects";

import { appSlug, buildAppFiles } from "./build-app";
import { buildContractFiles, fetchContractBundle } from "./contract-files";
import { createZip } from "./zip";

export interface DownloadResult {
  contracts: number;
  skipped: number;
  /** True when the contract sources couldn't be fetched at all */
  contractsFailed: boolean;
}

/** Builds the branded app, with the contracts' verified source, as a zip in the browser and saves it. */
export async function downloadBrandedApp(
  project: Project,
): Promise<DownloadResult> {
  let extra: ReturnType<typeof buildContractFiles> = [];
  let result: DownloadResult = {
    contracts: 0,
    skipped: 0,
    contractsFailed: false,
  };

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 40_000),
    );
    const bundle = await Promise.race([fetchContractBundle(project), timeout]);
    extra = buildContractFiles(project, bundle);
    result = {
      contracts: bundle.units.length,
      skipped: bundle.skipped.length,
      contractsFailed: false,
    };
  } catch {
    // The app is still useful without the contract files, so the download goes ahead
    result.contractsFailed = true;
  }

  const blob = createZip(buildAppFiles(project, extra));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = appSlug(project) + ".zip";
  link.click();
  URL.revokeObjectURL(url);
  return result;
}
