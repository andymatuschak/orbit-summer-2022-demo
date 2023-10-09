import { Prompt, PromptSelector, PromptsState } from "../app/promptSlice";
import { generateOrbitIDForString } from "./generateOrbitIDForString";

export type HypothesisJSONData = [
  entries: {
    text: string;
    target: { selector: PromptSelector[] }[];
    tags: string[];
  }[],
];

export function readPromptsFromHypothesisJSON(json: HypothesisJSONData): {
  [id: string]: Prompt;
} {
  const prompts: { [id: string]: Prompt } = {};
  for (const entry of json[0]) {
    const text = entry.text;
    if (!text.startsWith("Q. ")) {
      console.warn("Entry missing starting 'Q. '", text);
      continue;
    }

    const sides = text.split("\nA. ");
    if (sides.length !== 2) {
      console.warn("Unexpected number of sides", sides.length, text);
      continue;
    }

    const front = sides[0].substring(3);
    const back = sides[1];

    // Prompt IDs are generated from a hash of their front content.
    const id = generateOrbitIDForString(front);

    prompts[id] = {
      content: {
        front,
        back,
      },
      selectors: entry.target[0].selector,
      isByAuthor: true,
      isSaved: false,
      isDue: false,
      showAnchors: entry.tags.indexOf("no-anchor") === -1,
      creationTimestampMillis: Date.now(),
    };
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
