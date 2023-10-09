import debounce from "lodash/debounce";
import React, { useEffect } from "react";
import { Prompt } from "../app/promptSlice";
import { isPDF } from "../util/isPDF";
import {
  PromptLocation,
  resolvePromptLocation,
  resolvePromptRange,
} from "../util/resolvePromptLocations";
import { viewportToRoot } from "../util/viewportToRoot";
import { RenderingStates } from "../vendor/hypothesis-annotator/pdf";
import {
  hasPlaceholder,
  removePlaceholder,
} from "../vendor/hypothesis-annotator/placeholder";

export function usePromptLocations(prompts: { [id: string]: Prompt }): {
  locations: { [id: string]: PromptLocation };
  updateLocations: () => void;
} {
  const oldIDs = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    oldIDs.current = new Set(Object.keys(prompts));
  }, [prompts]);

  const ranges = React.useRef({} as { [id: string]: Range });
  const [locations, setLocations] = React.useState(
    {} as { [id: string]: PromptLocation },
  );
  const queue = React.useRef(Promise.resolve() as Promise<unknown>);

  const newIDs = new Set(Object.keys(prompts));
  const addedIDs = [...newIDs].filter((id) => !oldIDs.current.has(id));
  const removedIDs = [...oldIDs.current].filter((id) => !newIDs.has(id));

  if (addedIDs.length > 0 || removedIDs.length > 0) {
    prompts = { ...prompts }; // copy to avoid mutation
    queue.current = queue.current.then(async () => {
      // TODO: shouldn't need to create a new object, but PromptLayoutManager tracks object mutations for layout changes
      const newLocations = { ...locations };
      for (const id of removedIDs) {
        delete ranges.current[id];
        delete newLocations[id];
      }

      const origin = viewportToRoot();
      for (const id of addedIDs) {
        try {
          const range = await resolvePromptRange(document.body, prompts[id]);
          ranges.current[id] = range;
          newLocations[id] = resolvePromptLocation(origin, range);
        } catch (e) {
          console.error(
            `Prompt resolution error: ${e}\n${JSON.stringify(
              prompt,
              null,
              "\t",
            )}`,
          );
        }
      }
      setLocations(newLocations);
    });
  }

  const updateLocations = React.useCallback(() => {
    queue.current = queue.current.then(async () => {
      setLocations((locations) => {
        const newLocations = { ...locations };
        const origin = viewportToRoot();
        for (const id of Object.keys(ranges.current)) {
          const range = ranges.current[id];
          newLocations[id] = resolvePromptLocation(origin, range);
        }
        return newLocations;
      });
    });
  }, []);
  useEffect(() => {
    window.addEventListener("resize", updateLocations);
    return () => window.removeEventListener("resize", updateLocations);
  });

  // When viewing a PDF, the pages are rendered lazily as you scroll. We need to re-anchor prompts as their content becomes available.
  // This function adapted from Hypothes.is's PDFIntegration class.
  async function pdfPagesDidChange() {
    // @ts-ignore
    const pdfViewer = window.PDFViewerApplication.pdfViewer;
    const pageCount = pdfViewer.pagesCount;
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const page = pdfViewer.getPageView(pageIndex);
      if (!page?.textLayer?.renderingDone) {
        continue;
      }

      // Detect what needs to be done by checking the rendering state.
      switch (page.renderingState) {
        case RenderingStates.INITIAL:
          // This page has been reset to its initial state so its text layer
          // is no longer valid. Null it out so that we don't process it again.
          page.textLayer = null;
          break;
        case RenderingStates.FINISHED:
          // This page is still rendered. If it has a placeholder node that
          // means the PDF anchoring module anchored annotations before it was
          // rendered. Remove this, which will cause the annotations to anchor
          // again, below.
          removePlaceholder(page.div);
          break;
      }
    }

    const promptsToUpdate = new Set<string>();
    // Find all the anchors that have been invalidated by page state changes.
    for (const [id, range] of Object.entries(ranges.current)) {
      // Skip any we already know about.
      if (promptsToUpdate.has(id)) {
        continue;
      }

      // If the range is no longer in the document it means that either
      // the page was destroyed by PDF.js or the placeholder was removed above.
      // The annotations for these anchors need to be refreshed.
      if (
        range.startContainer === range.endContainer &&
        (range.startContainer as HTMLElement).className === "page" &&
        !hasPlaceholder(range.startContainer as HTMLElement)
      ) {
        promptsToUpdate.add(id);
      }
    }

    if (promptsToUpdate.size) {
      for (const id of promptsToUpdate) {
        try {
          ranges.current[id] = await resolvePromptRange(
            document.body,
            prompts[id],
          );
        } catch (e) {
          console.error(
            `Prompt resolution error: ${e}\n${JSON.stringify(
              prompt,
              null,
              "\t",
            )}`,
          );
        }
      }
      setLocations((locations) => {
        const newLocations = { ...locations };
        const origin = viewportToRoot();
        for (const id of promptsToUpdate) {
          newLocations[id] = resolvePromptLocation(origin, ranges.current[id]);
        }
        return newLocations;
      });
    }
  }

  useEffect(() => {
    if (isPDF()) {
      const observer = new MutationObserver(
        debounce(() => {
          queue.current = queue.current.then(pdfPagesDidChange);
        }, 100),
      );
      // @ts-ignore
      const pdfViewer = window.PDFViewerApplication.pdfViewer;
      observer.observe(pdfViewer.viewer, {
        attributes: true,
        attributeFilter: ["data-loaded"],
        childList: true,
        subtree: true,
      });
      return () => observer.disconnect();
    }
  });

  return { locations, updateLocations };
}
