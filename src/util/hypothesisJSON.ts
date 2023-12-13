import {
  Prompt,
  PromptContent,
  PromptSelector,
  PromptsState,
} from "../app/promptSlice";
import { generateOrbitIDForString } from "./generateOrbitIDForString";

export interface HypothesisEntryJSON {
  id: string;
  text: string;
  tags: string[];
  target: { selector: PromptSelector[] }[];
}

export type HypothesisJSON = [entries: HypothesisEntryJSON[]];

export function readPromptContentFromHypothesisText(
  text: string,
): PromptContent[] {
  return text
    .split("\n\n---\n\n")
    .map((promptText) => {
      if (!promptText.startsWith("Q. ")) {
        console.warn("Entry missing starting 'Q. '", promptText);
        return null;
      }

      const sides = promptText.split("\nA. ");
      if (sides.length !== 2) {
        console.warn("Unexpected number of sides", sides.length, promptText);
        return null;
      }

      const front = sides[0].substring(3);
      const back = sides[1];
      return { front, back };
    })
    .filter((content): content is PromptContent => content !== null);
}

export function readPromptsFromHypothesisJSON(json: HypothesisJSON): {
  [id: string]: Prompt;
} {
  const prompts: { [id: string]: Prompt } = {};
  for (const entry of json[0]) {
    for (const promptContent of readPromptContentFromHypothesisText(
      entry.text,
    )) {
      // Prompt IDs are generated from a hash of their front content.
      const id = generateOrbitIDForString(promptContent.front);
      prompts[id] = {
        content: promptContent,
        selectors: entry.target[0].selector,
        isByAuthor: true,
        isSaved: false,
        isDue: false,
        showAnchors: false,
        creationTimestampMillis: Date.now(),
      };
    }
  }
  return prompts;
}

export function writePromptsToHypothesisJSON(
  prompts: PromptsState,
): HypothesisJSON {
  return [
    Object.values(prompts).map((prompt) => ({
      id: prompt.curationID!,
      text: `Q. ${prompt.content.front}\nA. ${prompt.content.back}`,
      tags: prompt.showAnchors ? [] : ["no-anchor"],
      target: [{ selector: prompt.selectors }],
    })),
  ];
}
