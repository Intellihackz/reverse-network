import type { CodeLanguage } from "./code-languages";

/** Formats a file with Prettier. Prettier is large, so it loads only when someone asks to format. */
export async function formatSource(
  text: string,
  language: CodeLanguage,
): Promise<string> {
  if (!language.parser) return text;
  const { format } = await import("prettier/standalone");

  const plugins =
    language.parser === "typescript"
      ? [
          (await import("prettier/plugins/typescript")).default,
          (await import("prettier/plugins/estree")).default,
        ]
      : language.parser === "babel" || language.parser === "json"
        ? [
            (await import("prettier/plugins/babel")).default,
            (await import("prettier/plugins/estree")).default,
          ]
        : language.parser === "css"
          ? [(await import("prettier/plugins/postcss")).default]
          : [(await import("prettier/plugins/markdown")).default];

  return format(text, { parser: language.parser, plugins, printWidth: 100 });
}
