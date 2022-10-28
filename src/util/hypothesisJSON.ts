import { encodeUUIDBytesToWebSafeBase64ID, TaskID } from "@withorbit/core";
import {
  Prompt,
  PromptID,
  PromptSelector,
  PromptsState,
} from "../app/promptSlice";
import { v5 as uuidV5, parse as uuidParse } from "uuid";

export type HypothesisJSONData = [
  entries: {
    text: string;
    target: { selector: PromptSelector[] }[];
    tags: string[];
  }[],
];

let _orbitPrototypeTaskNamespaceUUID: ArrayLike<number> | null = null;
function generateTaskIDForString(input: string): PromptID {
  if (!_orbitPrototypeTaskNamespaceUUID) {
    _orbitPrototypeTaskNamespaceUUID = uuidParse(
      "432a94d7-56d3-4d17-adbd-685c97b5c67a",
    );
  }
  const bytes = new Uint8Array(16);
  uuidV5(input, _orbitPrototypeTaskNamespaceUUID, bytes);
  return encodeUUIDBytesToWebSafeBase64ID(bytes) as TaskID;
}

export function readPromptsFromHypothesisJSON(json: HypothesisJSONData): {
  [id: string]: Prompt;
} {
  const prompts: { [id: string]: Prompt } = {};
  for (const entry of json[0]) {
    // A single Hypothes.is annotation can contain multiple prompts, delimited by a double line break.
    const promptEntries = entry.text.split("\n\n");

    for (const promptEntry of promptEntries) {
      const lines = promptEntry.split("\n");
      if (lines.length !== 2) {
        console.warn("Ignoring entry with more than two lines", promptEntry);
        continue;
      }
      if (!lines[0].startsWith("Q. ")) {
        console.warn("Entry missing 'Q. '", promptEntry);
        continue;
      }
      if (!lines[1].startsWith("A. ")) {
        console.warn("Entry missing 'A. '", promptEntry);
        continue;
      }

      const front = lines[0].substring(3);

      // Prompt IDs are generated from a hash of their front content.
      const id = generateTaskIDForString(front);

      prompts[id] = {
        content: {
          front,
          back: lines[1].substring(3),
        },
        selectors: entry.target[0].selector,
        isByAuthor: true,
        isSaved: false,
        isDue: false,
        showAnchors: entry.tags.indexOf("no-anchor") === -1,
      };
    }
  }
  return prompts;
}

export function writePromptsToHypothesisJSON(
  prompts: PromptsState,
): HypothesisJSONData {
  return [
    Object.values(prompts).map((prompt) => ({
      text: `Q. ${prompt.content.front}\nA. ${prompt.content.back}`,
      tags: prompt.showAnchors ? [] : ["no-anchor"],
      target: [{ selector: prompt.selectors }],
    })),
  ];
}
