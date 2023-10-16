import {
  createListenerMiddleware,
  isAnyOf,
  TypedStartListening,
} from "@reduxjs/toolkit";
import { generateUniqueID } from "@withorbit/core";
import { prototypeBackendBaseURL } from "../config";
import {
  resolvePromptLocation,
  resolvePromptRange,
} from "../util/resolvePromptLocations";
import { getScrollingContainer, viewportToRoot } from "../util/viewportToRoot";
import { PDFMetadata } from "../vendor/pdf-metadata";
import {
  AnnotationType,
  createNewPrompt,
  deletePrompt,
  PromptID,
  PromptSelector,
  removeMissedHighlights,
  setPromptAnnotationType,
  syncMissedHighlightsFromRemote,
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

const userHypothesisGroupID = "J5Ewyzg5";
const curatedHypothesisGroupID = "ArwAPxdE";
const promptIDsToHypothesisIDs = new Map<PromptID, string>();

type PDFMetadataStructure = ReturnType<
  typeof PDFMetadata.prototype.getMetadata
> extends Promise<infer M>
  ? M
  : never;

let cachedPDFMetadataRecord: PDFMetadataStructure | null = null;

export async function initializeHypothesisMiddleware(
  store: AppStore,
  pdfMetadata: PDFMetadata,
) {
  store.dispatch(removeMissedHighlights());

  const pdfMetadataRecord = await pdfMetadata.getMetadata();
  cachedPDFMetadataRecord = pdfMetadataRecord;

  fetch(
    `${prototypeBackendBaseURL}/h-proxy?uri=${encodeURIComponent(
      getPDFURN(pdfMetadataRecord),
    )}&groupID=${userHypothesisGroupID}`,
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
    effect: async (action) => {
      const { id, prompt } = action.payload;
      const response = await fetch(`${prototypeBackendBaseURL}/h-proxy`, {
        method: "POST",
        body: JSON.stringify({
          groupID: userHypothesisGroupID,
          metadata: pdfMetadataRecord,
          uri: getPDFURN(pdfMetadataRecord),
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
      const id = action.payload;
      const prompt = listenerAPI.getOriginalState().prompts[id];
      if (prompt.annotationType === AnnotationType.Missed) {
        // We don't delete missed highlights from Hyp.is: they live there.
        return;
      }

      const hypothesisID = promptIDsToHypothesisIDs.get(id);
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
        console.error("Couldn't find Hypothes.is ID for prompt", id);
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

function getPDFURN(metadata: PDFMetadataStructure): string {
  const pdfURNLink = metadata.link.find((uri) =>
    uri.href.startsWith("urn:x-pdf"),
  );
  if (pdfURNLink) {
    return pdfURNLink.href;
  } else {
    throw new Error(`Couldn't find PDF URN. Links: ${metadata.link.join(",")}`);
  }
}

export type MissingHighlightRecord = {
  id: string;
  selectors: PromptSelector[];
};
export function fetchMissingHighlights() {
  return async (dispatch: AppDispatch) => {
    const response = await fetch(
      `${prototypeBackendBaseURL}/getMissedAnnotations?groupID=${userHypothesisGroupID}&curatedGroupID=${curatedHypothesisGroupID}&uri=${encodeURIComponent(
        getPDFURN(cachedPDFMetadataRecord!),
      )}`,
    );
    if (!response.ok) {
      console.error("Couldn't fetch missing highlights");
      return;
    }

    const missingHighlights: MissingHighlightRecord[] = await response.json();
    if (missingHighlights.length === 0) {
      alert("(no suggested highlights)");
    } else {
      // Bit of a back to duplicate this, but I'm having trouble gracefully shoving this effectful behavior into the top-level prompt location stuff.
      const origin = viewportToRoot();
      let highestPromptY: number | null = null;
      for (const h of missingHighlights) {
        const range = await resolvePromptRange(document.body, h.selectors);
        const location = resolvePromptLocation(origin, range);
        if (highestPromptY === null || location.top < highestPromptY) {
          highestPromptY = location.top;
        }
      }
      if (highestPromptY) {
        getScrollingContainer().scrollTo({
          left: window.scrollX,
          top: highestPromptY - window.innerHeight / 4,
          behavior: "smooth",
        });
      }
    }

    dispatch(syncMissedHighlightsFromRemote(missingHighlights));
  };
}

export function convertMissingHighlight(
  id: PromptID,
  annotationType: AnnotationType,
) {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const prompt = getState().prompts[id];
    if (!prompt) {
      console.error("Couldn't find prompt for missing prompt ID", id);
      return;
    }

    dispatch(deletePrompt(id));
    const newPromptID = generateUniqueID();
    dispatch(
      createNewPrompt({
        id: newPromptID,
        prompt: {
          annotationType,
          isSaved: true,
          content: { front: "", back: "" },
          creationTimestampMillis: Date.now(),
          isByAuthor: false,
          isDue: false,
          selectors: prompt.selectors,
          showAnchors: true,
          curationID: prompt.curationID,
        },
      }),
    );
  };
}
