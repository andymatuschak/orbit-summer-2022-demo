import {
  createListenerMiddleware,
  isAnyOf,
  TypedStartListening,
} from "@reduxjs/toolkit";
import { prototypeBackendBaseURL } from "../config";
import { PDFMetadata } from "../vendor/pdf-metadata";
import {
  createNewPrompt,
  deletePrompt,
  PromptID,
  setPromptAnnotationType,
  updatePromptFront,
} from "./promptSlice";
import { AppDispatch, AppStore, RootState } from "./store";

const hypothesisListenerMiddleware = createListenerMiddleware();
export const hypothesisMiddleware = hypothesisListenerMiddleware.middleware;
const startListening =
  hypothesisListenerMiddleware.startListening as TypedStartListening<
    RootState,
    AppDispatch
  >;

const hypothesisGroupID = "J5Ewyzg5";
const promptIDsToHypothesisIDs = new Map<PromptID, string>();

export async function initializeHypothesisMiddleware(
  store: AppStore,
  pdfMetadata: PDFMetadata,
) {
  fetch(
    `${prototypeBackendBaseURL}/h-proxy?uri=${encodeURIComponent(
      getPDFURN(await pdfMetadata.getMetadata()),
    )}&groupID=${hypothesisGroupID}`,
  ).then(async (response) => {
    const mappingObj = await response.json();
    console.log("Got OrbitID -> hyp.is ID map", mappingObj);
    if (response.ok) {
      for (const [promptID, hypothesisID] of Object.entries(mappingObj)) {
        promptIDsToHypothesisIDs.set(promptID, hypothesisID as string);
      }
    } else {
      console.error("Couldn't fetch Hypothes.is annotations", response);
      return;
    }
  });

  startListening({
    actionCreator: createNewPrompt,
    effect: async (action, listenerAPI) => {
      const { id, prompt } = action.payload;
      const metadata = await pdfMetadata.getMetadata();
      const response = await fetch(`${prototypeBackendBaseURL}/h-proxy`, {
        method: "POST",
        body: JSON.stringify({
          groupID: hypothesisGroupID,
          metadata: metadata,
          uri: getPDFURN(metadata),
          data: { id, prompt },
        }),
      });
      if (response.ok) {
        const hypothesisID = await response.text();
        console.log(
          `New prompt ${id} mapped to Hypothes.is ID ${hypothesisID}`,
        );
        promptIDsToHypothesisIDs.set(id, hypothesisID);
      } else {
        console.error("Couldn't add to Hypothes.is", id, prompt);
      }
    },
  });

  startListening({
    actionCreator: deletePrompt,
    effect: async (action, listenerAPI) => {
      const promptID = action.payload;
      const hypothesisID = promptIDsToHypothesisIDs.get(promptID);
      if (hypothesisID) {
        const response = await fetch(
          `${prototypeBackendBaseURL}/h-proxy/${hypothesisID}`,
          { method: "DELETE" },
        );
        if (response.ok) {
          console.log(`Deleted hyp.is ID ${hypothesisID}`);
        } else {
          console.error(`Couldn't delete hyp.is ID ${hypothesisID}`);
        }
      } else {
        console.error("Couldn't find Hypothes.is ID for prompt", promptID);
      }
    },
  });

  startListening({
    matcher: isAnyOf(updatePromptFront, setPromptAnnotationType),
    effect: async (action, listenerAPI) => {
      const [id] = action.payload;
      const oldPrompt = listenerAPI.getOriginalState().prompts[id];
      const newPrompt = listenerAPI.getState().prompts[id];
      if (
        oldPrompt.content.front !== newPrompt.content.front ||
        oldPrompt.annotationType !== newPrompt.annotationType
      ) {
        const hypothesisID = promptIDsToHypothesisIDs.get(id);
        if (!hypothesisID) {
          console.error("Couldn't find Hypothes.is ID for prompt", id);
          return;
        }
        const response = await fetch(
          `${prototypeBackendBaseURL}/h-proxy/${hypothesisID}`,
          {
            method: "PATCH",
            body: JSON.stringify({ id, prompt: newPrompt }),
          },
        );
        if (response.ok) {
          console.log(`Updated ${id} (hyp.is ${hypothesisID})`);
        } else {
          console.error(`Couldn't update ${id} (hyp.is ${hypothesisID}`);
        }
      }
    },
  });
}

function getPDFURN(
  metadata: ReturnType<
    typeof PDFMetadata.prototype.getMetadata
  > extends Promise<infer M>
    ? M
    : never,
): string {
  const pdfURNLink = metadata.link.find((uri) =>
    uri.href.startsWith("urn:x-pdf"),
  );
  if (pdfURNLink) {
    return pdfURNLink.href;
  } else {
    throw new Error(`Couldn't find PDF URN. Links: ${metadata.link.join(",")}`);
  }
}
