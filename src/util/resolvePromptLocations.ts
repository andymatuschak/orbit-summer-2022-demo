import { Prompt } from "../app/promptSlice";
import { anchor } from "../vendor/hypothesis-annotator/html";

export interface PromptLocation {
  top: number;
  range: Range;
}
export async function resolvePromptLocations(prompts: {
  [id: string]: Prompt;
}): Promise<{ [id: string]: PromptLocation }> {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(prompts).map(async ([id, prompt]) => {
        try {
          const range = await anchor(document.body, prompt.selectors);
          return [
            id,
            {
              top: range.getBoundingClientRect().top + window.scrollY - 4,
              range,
            },
          ];
        } catch (e) {
          return [id, false];
        }
      }),
    ).then((promptEntries) =>
      promptEntries.filter(([, promptLocation]) => promptLocation),
    ),
  );
}
