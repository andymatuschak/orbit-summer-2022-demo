import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { generateUniqueID } from "@withorbit/core";
import shuffle from "knuth-shuffle-seeded";
import {
  PromptLocation,
  resolvePromptLocations,
} from "../util/resolvePromptLocations";
import { loadPrompts, Prompt, PromptsState } from "./promptSlice";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface InlineReviewModule {
  frame: Rect;
  promptIDs: string[];

  // If this inline review has been "turned into" a prompt list, its ID will be saved here. Pretty hacky approach...
  promptListID: string | null;
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
    convertIntoPromptList(
      state,
      action: PayloadAction<{ reviewModuleID: string; promptListID: string }>,
    ) {
      state[action.payload.reviewModuleID].promptListID =
        action.payload.promptListID;
    },
  },
  extraReducers(builder) {
    // We scan the page for review modules once we've loaded the prompt data for the page.
    builder.addCase(loadPrompts.fulfilled, (state, action) => {
      return indexReviewModules(action.payload);
    });
    builder.addCase(autopopulateReviewAreas.fulfilled, (state, action) => {
      for (const { reviewAreaID, promptIDs } of action.payload) {
        state[reviewAreaID] = {
          promptIDs,
          frame: getFrame(document.getElementById(reviewAreaID)!),
          promptListID: null,
        };
      }
    });
    // TODO: implement extra reducers to update inline review module state when prompt contents are edited
  },
});

export const { updateReviewModuleFrames, convertIntoPromptList } =
  inlineReviewModuleSlice.actions;
export const inlineReviewModuleReducer = inlineReviewModuleSlice.reducer;

export const autopopulateReviewAreas = createAsyncThunk(
  "autopopulateReviewAreas",
  async (prompts: PromptsState) => {
    const promptLocations = await resolvePromptLocations(prompts);
    const protoReviewAreas =
      document.getElementsByClassName("orbit-reviewarea");
    const usedPromptIDs = new Set<string>();

    const populatedReviewAreas: {
      reviewAreaID: string;
      promptIDs: string[];
    }[] = [];
    for (const protoReviewArea of protoReviewAreas) {
      populatedReviewAreas.push(
        populateReviewArea(
          protoReviewArea,
          prompts,
          promptLocations,
          usedPromptIDs,
        ),
      );
    }
    return populatedReviewAreas;
  },
);

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

// n.b. this isn't actually used right now because now all review areas are autopopulated, as opposed to being included in the text's .html... maybe should remove...
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
          promptListID: null,
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
  usedPromptIDs: Set<string>,
): { reviewAreaID: string; promptIDs: string[] } {
  const reviewAreaPromptIDs = Object.entries(prompts).filter(([id]) => {
    if (usedPromptIDs.has(id)) return false;
    const range = promptLocations[id].range;
    return rangeCompareNode(range, element) === 1;
  });

  if (reviewAreaPromptIDs.length === 0) {
    throw new Error("No prompts seem to belong to review area!");
  }

  shuffle(reviewAreaPromptIDs, 314159265);

  const reviewAreaElement = document.createElement("orbit-reviewarea");
  reviewAreaElement.id = `reviewArea-${element.id || generateUniqueID()}`;
  reviewAreaElement.setAttribute("color", "brown");
  for (const [id, prompt] of reviewAreaPromptIDs) {
    usedPromptIDs.add(id);
    const promptElement = document.createElement("orbit-prompt");
    const props = getOrbitPromptProps(prompt);
    promptElement.setAttribute("question", props.question);
    promptElement.setAttribute("answer", props.answer);
    if (props["answer-attachments"].length) {
      promptElement.setAttribute(
        "answer-attachments",
        props["answer-attachments"][0],
      );
    }
    promptElement.id = id;
    reviewAreaElement.appendChild(promptElement);
  }
  element.after(reviewAreaElement);

  return {
    reviewAreaID: reviewAreaElement.id,
    promptIDs: reviewAreaPromptIDs.map(([id]) => id),
  };
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
    if (text.indexOf('<img src="data:') >= 0) return text;
    const resolved = new URL(imageMatch[1], document.baseURI).pathname;
    const inDomainSubpath = resolved.split("/").slice(2).join("/");
    if (resolved.startsWith("/shape-up")) {
      return `https://basecamp.com/${inDomainSubpath}`;
    } else if (resolved.startsWith("/ims")) {
      return `https://openintro-ims.netlify.app/${inDomainSubpath}`;
    } else if (resolved.startsWith("/sh/br")) {
      return `https://bounded-regret.ghost.io/${inDomainSubpath}`;
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
  "answer-attachments": string[];
} {
  const attachmentURL = getAttachmentURL(back);

  let answer = back;
  let attachments: string[] = [];
  if (attachmentURL) {
    answer = "";
    attachments = [attachmentURL];
    // attachments = attachmentURL
    //   ? [attachmentURL]
    //   : backAttachments?.length
    //   ? backAttachments
    //   : [];
  }
  return {
    question: front,
    answer,
    "answer-attachments": attachments,
  };
}
