import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { datasetSchema } from "./dataset-schema";

async function main() {
  const inputPath = process.argv[2] ?? "data/datasets/sample-state-costs.json";
  const absolutePath = resolve(process.cwd(), inputPath);

  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  const result = datasetSchema.safeParse(parsed);

  if (!result.success) {
    console.error("Dataset validation failed:");
    console.error(result.error.issues);
    process.exit(1);
  }

  console.log(`Dataset is valid: ${absolutePath}`);
  console.log(`States: ${result.data.states.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
