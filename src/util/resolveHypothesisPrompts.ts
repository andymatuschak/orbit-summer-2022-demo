import { anchor } from "../vendor/hypothesis-annotator/html";

export interface ResolvedPrompt {
  front: string;
  back: string;
  top: number;
}
export type ResolvedPrompts = { [id: string]: ResolvedPrompt };

type HypothesisJSONData = [
  entries: {
    text: string;
    target: { selector: any }[];
  }[],
];

export async function resolveHypothesisPrompts(
  hypothesisData: HypothesisJSONData,
): Promise<ResolvedPrompts> {
  const result: ResolvedPrompts = {};

  await Promise.all(
    hypothesisData[0].map(async (entry) => {
      const selectors = entry.target[0].selector;
      try {
        const value = await anchor(document.body, selectors as any);

        // A single Hypothes.is annotation can contain multiple prompts, delimited by a double line break.
        const promptEntries = entry.text.split("\n\n");

        for (const promptEntry of promptEntries) {
          const lines = promptEntry.split("\n");
          if (lines.length !== 2) {
            console.warn(
              "Ignoring entry with more than two lines",
              promptEntry,
            );
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

          result[lines[0].substring(3)] = {
            front: lines[0].substring(3),
            back: lines[1].substring(3),
            top: value.getBoundingClientRect().top + window.scrollY - 8,
          };
        }
      } catch (e) {
        console.error("Prompt resolution error", entry, e);
      }
    }),
  );

  return result;
}
