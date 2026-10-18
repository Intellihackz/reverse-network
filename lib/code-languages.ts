export interface CodeLanguage {
  label: string;
  /** Prism grammar name, or null for plain text */
  prism: string | null;
  /** Prettier parser, or null when the file can't be formatted */
  parser: "typescript" | "babel" | "json" | "css" | "markdown" | null;
}

const BY_EXTENSION: Record<string, CodeLanguage> = {
  ts: { label: "TypeScript", prism: "typescript", parser: "typescript" },
  tsx: { label: "TypeScript React", prism: "tsx", parser: "typescript" },
  mjs: { label: "JavaScript", prism: "javascript", parser: "babel" },
  json: { label: "JSON", prism: "json", parser: "json" },
  css: { label: "CSS", prism: "css", parser: "css" },
  sol: { label: "Solidity", prism: "solidity", parser: null },
  md: { label: "Markdown", prism: "markdown", parser: "markdown" },
};

const PLAIN: CodeLanguage = { label: "Plain text", prism: null, parser: null };

export function languageOf(path: string): CodeLanguage {
  const name = path.split("/").pop() ?? "";
  // Dotfiles like .gitignore have no extension to speak of
  if (name.startsWith(".") && name.indexOf(".", 1) === -1) return PLAIN;
  return BY_EXTENSION[name.split(".").pop() ?? ""] ?? PLAIN;
}
