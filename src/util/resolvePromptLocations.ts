import { Prompt, PromptSelector } from "../app/promptSlice";
import { anchor as anchorHTML } from "../vendor/hypothesis-annotator/html";
import {
  anchor as anchorPDF,
  Selector,
} from "../vendor/hypothesis-annotator/pdf";
import { isPDF } from "./isPDF";
import { viewportToRoot } from "./viewportToRoot";

export interface PromptLocation {
  top: number;
  range: Range;
}

let _anchor: typeof anchorPDF;
function anchor(
  root: HTMLElement,
  selectors: Selector[],
): ReturnType<typeof anchorPDF> {
  // Spooky global reflection here... n.b. also anchorPDF has DOM side-effects!!
  if (!_anchor) {
    _anchor = isPDF() ? anchorPDF : anchorHTML;
  }
  return _anchor(root, selectors);
}

export async function resolvePromptRange(
  root: HTMLElement,
  selectors: PromptSelector[],
): Promise<Range> {
  return await anchor(root, selectors);
}

export function resolvePromptLocation(
  origin: { x: number; y: number },
  range: Range,
): { top: number; range: Range } {
  return {
    top: range.getBoundingClientRect().top + origin.y - 4,
    range,
  };
}

// TODO: replace last usage with PDF-compatible bits in hook implementation (see usePromptLocations)
export async function resolvePromptLocations(prompts: {
  [id: string]: Prompt;
}): Promise<{ [id: string]: PromptLocation }> {
  const offset = viewportToRoot();
  return Object.fromEntries(
    await Promise.all(
      Object.entries(prompts).map(async ([id, prompt]) => {
        try {
          const range = await anchor(document.body, prompt.selectors);
          return [id, resolvePromptLocation(offset, range)];
        } catch (e) {
          throw new Error(
            `Prompt resolution error: ${e}\n${JSON.stringify(
              prompt,
              null,
              "\t",
            )}`,
          );
        }
      }),
    ),
  );
}
