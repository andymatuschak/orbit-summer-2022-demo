import { Prompt, PromptSelector, PromptsState } from "../app/promptSlice";

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
      // We'll use the question as an ID.
      prompts[front] = {
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
      tags: prompt.showAnchors ? ["no-anchor"] : [],
      target: [{ selector: prompt.selectors }],
    })),
  ];
}
