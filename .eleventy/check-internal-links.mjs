import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve(process.argv[2] ?? "_site");
const skippedProtocols = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(target);
    return entry.isFile() && entry.name.endsWith(".html") ? [target] : [];
  }));
  return files.flat();
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function localTarget(value, sourceFile) {
  const reference = value.trim();
  if (!reference || reference.startsWith("#") || skippedProtocols.test(reference)) return null;

  const currentUrl = `https://site.invalid/${path.relative(outputDirectory, sourceFile).split(path.sep).join("/")}`;
  const resolvedUrl = new URL(reference, currentUrl);
  const decodedPath = decodeURIComponent(resolvedUrl.pathname);
  const target = path.resolve(outputDirectory, `.${decodedPath}`);

  if (target !== outputDirectory && !target.startsWith(`${outputDirectory}${path.sep}`)) {
    throw new Error(`Link escapes the generated site: ${reference}`);
  }

  return resolvedUrl.pathname.endsWith("/") ? path.join(target, "index.html") : target;
}

const htmlFiles = await collectHtmlFiles(outputDirectory);
const failures = [];

for (const sourceFile of htmlFiles) {
  const html = await readFile(sourceFile, "utf8");
  const references = [...html.matchAll(/\b(?:href|src)=(['"])(.*?)\1/gi)].map((match) => match[2]);

  for (const reference of references) {
    let target;
    try {
      target = localTarget(reference, sourceFile);
    } catch (error) {
      failures.push(`${path.relative(outputDirectory, sourceFile)}: ${error.message}`);
      continue;
    }

    if (target && !(await exists(target))) {
      failures.push(`${path.relative(outputDirectory, sourceFile)}: ${reference} → ${path.relative(outputDirectory, target)}`);
    }
  }
}

if (failures.length) {
  console.error(`Found ${failures.length} broken generated-site link(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Verified internal links across ${htmlFiles.length} generated HTML file(s).`);
}
