import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";

let cachedKnowledgeBase: string | null = null;

/**
 * Recursively collect all .md file paths from a directory.
 */
async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await collectMarkdownFiles(fullPath);
        files.push(...nested);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or is unreadable — skip silently
  }
  return files.sort();
}

/**
 * Read a single markdown file and wrap it with a source-file header.
 */
async function readMarkdownFile(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const name = basename(filePath);
    return `\n${"=".repeat(60)}\nSOURCE: ${name}\n${"=".repeat(60)}\n\n${content}`;
  } catch {
    return null;
  }
}

/**
 * Load all knowledge-base markdown files and concatenate them into a single
 * context string. Results are cached after the first call.
 *
 * Load order:
 *  1. knowledge/drafting-guide.md  (core rules — always first)
 *  2. knowledge/README.md
 *  3. Remaining files in knowledge/ (alphabetical)
 *  4. knowledge/provision-patterns/ (alphabetical)
 *  5. src/lib/contracts/provision-examples/ (alphabetical)
 */
export async function loadKnowledgeBase(): Promise<string> {
  if (cachedKnowledgeBase !== null) {
    return cachedKnowledgeBase;
  }

  const projectRoot = process.cwd();

  const knowledgeDir = join(projectRoot, "knowledge");
  const examplesDir = join(
    projectRoot,
    "src",
    "lib",
    "contracts",
    "provision-examples",
  );

  // Collect all file paths
  const knowledgeFiles = await collectMarkdownFiles(knowledgeDir);
  const exampleFiles = await collectMarkdownFiles(examplesDir);

  // Separate priority files from the rest in knowledgeFiles
  // (provision-patterns files are already included via recursive collection)
  const priorityOrder = ["drafting-guide.md", "README.md"];

  const priorityFiles: string[] = [];
  const remainingFiles: string[] = [];

  for (const filePath of knowledgeFiles) {
    const name = basename(filePath);
    const priorityIndex = priorityOrder.indexOf(name);
    if (priorityIndex !== -1 && filePath.startsWith(knowledgeDir)) {
      // Only prioritize files directly in the knowledge root
      const isInRoot = !filePath
        .slice(knowledgeDir.length + 1)
        .includes("/");
      if (isInRoot) {
        priorityFiles[priorityIndex] = filePath;
        continue;
      }
    }
    remainingFiles.push(filePath);
  }

  // Build ordered list: priority files first, then remaining, then examples
  const orderedFiles = [
    ...priorityFiles.filter(Boolean),
    ...remainingFiles,
    ...exampleFiles,
  ];

  // Read all files in parallel
  const results = await Promise.all(orderedFiles.map(readMarkdownFile));
  const sections = results.filter((s): s is string => s !== null);

  const header = [
    "TERMS-AI KNOWLEDGE BASE",
    "=======================",
    "",
    `Loaded ${sections.length} documents.`,
    `Generated at: ${new Date().toISOString()}`,
    "",
  ].join("\n");

  cachedKnowledgeBase = header + sections.join("\n");
  return cachedKnowledgeBase;
}
