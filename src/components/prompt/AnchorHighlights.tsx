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
  setHoverPrompt: (id: PromptId | undefined) => any;
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

export function AnchorHighlight({
  prompts,
  promptLocations,
  visiblePromptIDs,
  hoverPrompts,
  editPrompt,
  setHoverPrompt,
}: AnchorHighlightProps) {
  // If two prompts share a functional range, then one prompt is the "drawn" prompt and the other does not need to be redrawn
  // A prompt can have itself as the drawn promptId
  const [promptIdToDrawnPromptId, setPromptIdToDrawnPromptId] = useState<
    Map<string, string>
  >(new Map<string, string>());
  const [drawnPromptIdToIds, setDrawnPromptIdToIds] = useState<
    Map<string, string[]>
  >(new Map<string, string[]>());
  const [existingPromptIds, setExistingPromptIds] = useState<Set<string>>(
    new Set<string>(),
  );

  useEffect(() => {
    // Set all prompts to state based on saved
    Object.entries(prompts).forEach(([id, prompt]) => {
      const drawnId = promptIdToDrawnPromptId.get(id);
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
      if (
        hoverPrompt &&
        // !prompts[hoverPrompt].isSaved &&
        visiblePromptIDs.has(hoverPrompt)
      ) {
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
  }, [promptLocations]);

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
    const onMouseEnter = function (id: string) {
      if (prompts[id].isSaved) {
        setHoverPrompt(id);
      }
    };
    const onMouseLeave = function (id: string) {
      setHoverPrompt(undefined);
    };

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
  }, [prompts, existingPromptIds]);

  return null;
}
