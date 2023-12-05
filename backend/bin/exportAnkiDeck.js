import { prepareAnkiDeck } from "../api/exportAnkiDeck.js";
import fs from "node:fs";

const inputPath = process.argv[2];
const outputPath = process.argv[3];
let latexTagsStyle = process.argv[4] || "anki";
if (!inputPath || !outputPath) {
  console.error("Usage: yarn exportAnkiDeck <input.json> <output.apkg> [anki|mnemosyne]");
  process.exit(1);
}

if (process.argv.length > 4 && ["anki", "mnemosyne"].indexOf(latexTagsStyle) < 0) {
  console.warn(
    `I support exporting "anki"-style LaTeX delimeters, \\(...\\), and "mnemosyne"-style LaTeX delimeters, <$>...</$>.`
    + ` You requested "${process.argv[4]}"-style delimeters, which I don't know. I'm defaulting to \"anki\".`
  );
  latexTagsStyle = "anki";
}

const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const { data } = await prepareAnkiDeck(input, latexTagsStyle);

fs.writeFileSync(outputPath, data);
console.log("Wrote", outputPath);
