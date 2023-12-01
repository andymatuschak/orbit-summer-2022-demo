import { prepareAnkiDeck } from "../api/exportAnkiDeck.js";
import fs from "node:fs";

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) {
  console.error("Usage: yarn exportAnkiDeck <input.json> <output.apkg>");
  process.exit(1);
}

const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const { data } = await prepareAnkiDeck(input);

fs.writeFileSync(outputPath, data);
console.log("Wrote", outputPath);
