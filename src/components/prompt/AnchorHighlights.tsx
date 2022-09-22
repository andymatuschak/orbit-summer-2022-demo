import { useEffect, useState } from "react";
import { Prompt, PromptId, PromptsState } from "../../app/promptSlice";
import { PromptLocation } from "../../util/resolvePromptLocations";
import { highlightRange } from "./highlightRange";

const SAVED_COLOR = "#F9EBD9";
const TRANSPARENT = "#FFFFFF00";
const HOVER_COLOR = "#D6090926";

export interface AnchorHighlightProps {
  prompts: PromptsState;
  promptLocations: { [id: string]: PromptLocation };
  visiblePromptIDs: Set<string>;
  hoverPrompts: PromptId[] | undefined;
  editPrompt: PromptId | undefined;
  setHoverPrompts: (id: PromptId[] | undefined) => any;
}

function areRangesSame(rangeA: Range, rangeB: Range): boolean {
  return (
    rangeA.compareBoundaryPoints(Range.START_TO_START, rangeB) === 0 &&
    rangeA.compareBoundaryPoints(Range.END_TO_END, rangeB) === 0
  );
}

function classNameForPromptID(id: PromptId): string {
  return `orbitanchor-${id.replace(/ /g, "-")}`;
}

enum HighlightTypes {
  Transparent,
  Saved,
  Hover,
}

const HighlightColors = [TRANSPARENT, SAVED_COLOR, HOVER_COLOR];

export function AnchorHighlight({
  prompts,
  promptLocations,
  visiblePromptIDs,
  hoverPrompts,
  editPrompt,
  setHoverPrompts,
}: AnchorHighlightProps) {
  // If two prompts share a functional range, then one prompt is the "drawn" prompt and the other does not need to be redrawn
  // A prompt can have itself as the drawn promptId
  const [promptIdToDrawnPromptId, setPromptIdToDrawnPromptId] = useState<
    Map<PromptId, PromptId>
  >(new Map<PromptId, PromptId>());
  const [drawnPromptIdToIds, setDrawnPromptIdToIds] = useState<
    Map<string, string[]>
  >(new Map<PromptId, PromptId[]>());
  const [existingPromptIds, setExistingPromptIds] = useState<Set<string>>(
    new Set<PromptId>(),
  );

  // TODO: refactor all instances of this logic to use this instead. It's getting DRY
  function highlightDrawnId(id: string, type: HighlightTypes) {
    const color = HighlightColors[type];
    const els = document.getElementsByClassName(classNameForPromptID(id));
    for (const el of els) {
      el.setAttribute("style", `background-color:${color};`);
    }
  }

  useEffect(() => {
    // Set all prompts to state based on saved
    promptIdToDrawnPromptId.forEach((id, drawnId) => {
      const prompt = prompts[id];
      if (!prompt) {
        highlightDrawnId(drawnId, HighlightTypes.Transparent);
        // TODO: clean up all state related to deleted prompt
        return;
      }

      if (drawnId) {
        const els = document.getElementsByClassName(
          classNameForPromptID(drawnId),
        );
        for (const el of els) {
          var color =
            prompt.isSaved && visiblePromptIDs.has(id)
              ? SAVED_COLOR
              : TRANSPARENT;
          el.setAttribute("style", `background-color:${color};`);
        }

        // Check if perhaps drawn has a dep that is saved
        drawnPromptIdToIds.get(drawnId)?.forEach((candidateId) => {
          if (prompts[drawnId].isSaved || prompts[candidateId].isSaved) {
            for (const el of els) {
              el.setAttribute("style", `background-color:${SAVED_COLOR};`);
            }
          }
        });
      }
    });

    // Apply hover if eligible
    hoverPrompts?.forEach((hoverPrompt) => {
      var targetId: string | undefined;
      if (hoverPrompt && visiblePromptIDs.has(hoverPrompt)) {
        targetId = hoverPrompt;
      }
      if (editPrompt) {
        targetId = editPrompt;
      }
      const drawnId = promptIdToDrawnPromptId.get(targetId ?? "");
      if (drawnId) {
        const els = document.getElementsByClassName(
          classNameForPromptID(drawnId),
        );
        for (const el of els) {
          el.setAttribute("style", `background-color:${HOVER_COLOR};`);
        }
      }
    });

    // Apply edit
    if (editPrompt) {
      const targetId = promptIdToDrawnPromptId.get(editPrompt);
      if (targetId) highlightDrawnId(targetId, HighlightTypes.Hover);
    }
  }, [
    hoverPrompts,
    editPrompt,
    prompts,
    visiblePromptIDs,
    promptIdToDrawnPromptId,
    drawnPromptIdToIds,
  ]);

  useEffect(() => {
    const newPromptDraws: Map<string, string> = new Map<string, string>();
    const newInversePromptDraws: Map<string, string[]> = new Map<
      string,
      string[]
    >();

    // Process ranges, simple brute-force uniqueness check
    const locationsArr = Object.entries(promptLocations);
    locationsArr.forEach(([idA, locationA]) => {
      if (prompts[idA] && !prompts[idA].showAnchors) {
        return;
      }
      const candidateRange = locationA.range;
      // Check if this range may have already been inserted. I.e does any existing prompt have the same range
      var rangeAExists = false;
      var idB = null;
      var existingRange: Range | undefined;
      for ([idB] of newPromptDraws) {
        existingRange = promptLocations[idB].range;
        if (existingRange && areRangesSame(candidateRange, existingRange)) {
          rangeAExists = true;
          break;
        }
      }

      if (!rangeAExists) {
        newPromptDraws.set(idA, idA);
        newInversePromptDraws.set(idA, []);
      } else {
        newPromptDraws.set(idA, idB!);
        newInversePromptDraws.get(idB!)!.push(idA);
      }
    });

    setPromptIdToDrawnPromptId(newPromptDraws);
    setDrawnPromptIdToIds(newInversePromptDraws);
  }, [promptLocations, prompts]);

  useEffect(() => {
    const newExistingPromptIds = new Set<string>(existingPromptIds);

    var updated = false;
    // draw all "drawn" prompt ids
    for (const [, idB] of promptIdToDrawnPromptId) {
      // we haven't drawn this before
      if (!newExistingPromptIds.has(idB)) {
        const copy = promptLocations[idB].range.cloneRange();
        highlightRange(copy, "span", {
          class: classNameForPromptID(idB),
          style: `background-color:${TRANSPARENT};`,
        });
        newExistingPromptIds.add(idB);
        updated = true;
      }
    }

    if (updated) {
      setExistingPromptIds(newExistingPromptIds);
    }
  }, [promptIdToDrawnPromptId, promptLocations, prompts, existingPromptIds]);

  useEffect(() => {
    const interruptibleDebounces = new Set<PromptId>();
    const onMouseEnter = function (id: PromptId) {
      interruptibleDebounces.clear();
      if (prompts[id]?.isSaved) {
        // Get other prompts this one may be drawing for
        const others = drawnPromptIdToIds.get(id);
        const all = others ? [id, ...others] : [id];
        setHoverPrompts(all);
      }
    };

    // Lagging edge debounce to prevent scroll-flicker, with interruption
    function debounce(func: Function, timeout = 50) {
      let timeoutId: number;
      return function (this: any, id: PromptId) {
        clearTimeout(timeoutId);
        interruptibleDebounces.add(id);
        timeoutId = window.setTimeout(() => {
          if (interruptibleDebounces.has(id)) {
            interruptibleDebounces.delete(id);
            func.apply(this, [id]);
          }
        }, timeout);
      };
    }

    const onMouseLeave = debounce(function (id: PromptId) {
      setHoverPrompts(undefined);
    });

    const callbacks: { [id: PromptId]: (() => void)[] } = {};
    existingPromptIds.forEach((id) => {
      callbacks[id] = [() => onMouseEnter(id), () => onMouseLeave(id)];
    });

    existingPromptIds.forEach((id) => {
      const els = document.getElementsByClassName(classNameForPromptID(id));
      for (const el of els) {
        el.addEventListener("mouseenter", callbacks[id][0]);
        el.addEventListener("mouseleave", callbacks[id][1]);
      }
    });

    return () => {
      existingPromptIds.forEach((id) => {
        const els = document.getElementsByClassName(classNameForPromptID(id));
        for (const el of els) {
          el.removeEventListener("mouseenter", callbacks[id][0]);
          el.removeEventListener("mouseleave", callbacks[id][1]);
        }
      });
    };
  }, [prompts, existingPromptIds, drawnPromptIdToIds]);

  return null;
}
