import { saveAs } from "file-saver";
import { useEffect } from "react";
import { reloadPromptsFromJSON } from "../app/promptSlice";
import { useAppDispatch, useAppStore } from "../app/store";
import { writePromptsToHypothesisJSON } from "../util/hypothesisJSON";

export function useAuthorSaveDataFeature(basename: string) {
  const store = useAppStore();
  const dispatch = useAppDispatch();
  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (
        event.code === "KeyD" &&
        event.ctrlKey &&
        event.shiftKey &&
        event.altKey
      ) {
        const json = writePromptsToHypothesisJSON(store.getState().prompts);
        const blob = new Blob([JSON.stringify(json)], {
          type: "application/json",
        });
        saveAs(blob, `${basename}.json`);
        event.stopPropagation();
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("keydown", onKeydown);
    };
  }, [store, dispatch, basename]);
}
