import { rmSync } from "node:fs";
import { resolve, basename } from "node:path";

const output = resolve(process.cwd(), "_site");

if (basename(output) !== "_site") {
  throw new Error("Refusing to clean an unexpected output directory.");
}

rmSync(output, { recursive: true, force: true });
