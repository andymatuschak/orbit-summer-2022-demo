import { createSlice } from "@reduxjs/toolkit";
import {
  PromptLocation,
  resolvePromptLocations,
} from "../util/resolvePromptLocations";
import { loadPrompts, Prompt, PromptsState } from "./promptSlice";
import shuffle from "knuth-shuffle-seeded";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface InlineReviewModule {
  frame: Rect;
  promptIDs: string[];
}

export type InlineReviewModuleState = { [id: string]: InlineReviewModule };
const initialState: InlineReviewModuleState = {};

const inlineReviewModuleSlice = createSlice({
  name: "inlineReviewModules",
  initialState,
  reducers: {
    updateReviewModuleFrames(state) {
      for (const id of Object.keys(state)) {
        const element = document.getElementById(id)!;
        state[id].frame = getFrame(element);
      }
    },
  },
  extraReducers(builder) {
    // We scan the page for review modules once we've loaded the prompt data for the page.
    builder.addCase(loadPrompts.fulfilled, (state, action) => {
      const prompts = action.payload;
      const modules = indexReviewModules(prompts);
      // HACK: not really kosher to cause an async side-effect from a reducer like this, but eh.
      (async () => {
        const promptLocations = await resolvePromptLocations(prompts);
        const protoReviewAreas =
          document.getElementsByClassName("orbit-reviewarea");
        const populatedPromptIDs = new Set<string>();
        for (const protoReviewArea of protoReviewAreas) {
          populateReviewArea(
            protoReviewArea,
            prompts,
            promptLocations,
            populatedPromptIDs,
          );
        }
      })();
    });
    // TODO: implement extra reducers to update inline review module state when prompt contents are edited
  },
});

export const { updateReviewModuleFrames } = inlineReviewModuleSlice.actions;
export const inlineReviewModuleReducer = inlineReviewModuleSlice.reducer;

interface ReviewArea extends HTMLElement {
  iframe: HTMLIFrameElement;
  getConfiguration(): {
    reviewItems: {
      task: {
        id: string;
        metadata: { externalID: string };
      };
    }[];
  };
}

function indexReviewModules(prompts: PromptsState): InlineReviewModuleState {
  const reviewAreas = document.getElementsByTagName(
    "orbit-reviewarea",
  ) as HTMLCollectionOf<ReviewArea>;
  return Object.fromEntries(
    [...reviewAreas].map((reviewArea, i) => {
      if (!reviewArea.id) {
        reviewArea.id = `inlineReviewModule-${i}`;
      }

      // Check to make sure we know about all the prompts referenced in the review area.
      const config = reviewArea.getConfiguration();
      const promptIDs = config.reviewItems.map((item) => {
        const id = item.task.metadata.externalID ?? item.task.id;
        if (!prompts[id]) {
          throw new Error(`Review area includes unknown prompt ID ${id}`);
        }
        return id;
      });

      return [
        reviewArea.id,
        {
          frame: getFrame(reviewArea),
          promptIDs,
        },
      ];
    }),
  );
}

function getFrame(element: HTMLElement): Rect {
  const { left, top, width, height } = element.getBoundingClientRect();
  return {
    left: left + window.scrollX,
    top: top + window.scrollY,
    width,
    height,
  };
}

function populateReviewArea(
  element: Element,
  prompts: PromptsState,
  promptLocations: { [id: string]: PromptLocation },
  populatedPromptIDs: Set<string>,
): void {
  const populatedEntries = Object.entries(prompts).filter(([id, prompt]) => {
    if (populatedPromptIDs.has(id)) return false;
    const range = promptLocations[id].range;
    return rangeCompareNode(range, element) === 1;
  });

  if (populatedEntries.length === 0) {
    throw new Error("No prompts seem to belong to review area!");
  }

  shuffle(populatedEntries, 314159265);

  const reviewAreaElement = document.createElement("orbit-reviewarea");
  reviewAreaElement.setAttribute("color", "brown");
  for (const [id, prompt] of populatedEntries) {
    populatedPromptIDs.add(id);
    const promptElement = document.createElement("orbit-prompt");
    const props = getOrbitPromptProps(prompt);
    promptElement.setAttribute("question", props.question);
    promptElement.setAttribute("answer", props.answer);
    if (props["answer-attachments"]) {
      promptElement.setAttribute(
        "answer-attachments",
        props["answer-attachments"],
      );
    }
    promptElement.id = id;
    reviewAreaElement.appendChild(promptElement);
  }
  element.after(reviewAreaElement);
}

// From https://developer.mozilla.org/en-US/docs/Web/API/Range/compareNode
function rangeCompareNode(range: Range, node: Node) {
  const nodeRange = document.createRange();
  try {
    nodeRange.selectNode(node);
  } catch (e) {
    nodeRange.selectNodeContents(node);
  }
  const nodeIsBefore =
    range.compareBoundaryPoints(Range.START_TO_START, nodeRange) === 1;
  const nodeIsAfter =
    range.compareBoundaryPoints(Range.END_TO_END, nodeRange) === -1;

  if (nodeIsBefore && !nodeIsAfter) return 0;
  if (!nodeIsBefore && nodeIsAfter) return 1;
  if (nodeIsBefore && nodeIsAfter) return 2;

  return 3;
}

// HACK: The embedded iframe (which uses the "real" Orbit bits) can't access local URLs. So we convert relative URLs of these images back to absolute paths on the original publication servers.
function getAttachmentURL(text: string): string | null {
  const imageMatch = text.match(/<img src="(.+?)".+$/);
  if (imageMatch) {
    const resolved = new URL(imageMatch[1], document.baseURI).pathname;
    const inDomainSubpath = resolved.split("/").slice(2).join("/");
    if (resolved.startsWith("/shape-up")) {
      return `https://basecamp.com/${inDomainSubpath}`;
    } else if (resolved.startsWith("/ims")) {
      return `https://openintro-ims.netlify.app/${inDomainSubpath}`;
    } else {
      throw new Error("Unsupported image URL");
    }
  } else {
    return null;
  }
}

export function getOrbitPromptProps({ content: { front, back } }: Prompt): {
  question: string;
  answer: string;
  "answer-attachments": string | null;
} {
  const attachmentURL = getAttachmentURL(back);
  return {
    question: front,
    answer: attachmentURL ? "" : back,
    "answer-attachments": attachmentURL,
  };
}
