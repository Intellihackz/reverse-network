import NewReverseForm from "@/components/dashboard/new-reverse-form";
import StageFrame from "@/components/project/stage-frame";

/** Full-screen, single-purpose page for starting a project from a web3 app URL. */
export default function NewProjectStage() {
  return (
    <StageFrame>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink/70 sm:text-sm">
        New project
      </p>
      <h1 className="mt-4 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tighter sm:text-7xl lg:text-8xl">
        Which app will you rewind?
      </h1>
      <p className="mt-5 max-w-md text-base text-ink/75 sm:text-lg">
        Paste its URL. We&apos;ll map the contracts, then you make it yours.
      </p>
      <div className="w-full max-w-2xl">
        <NewReverseForm variant="stage" autoFocus />
      </div>
    </StageFrame>
  );
}
