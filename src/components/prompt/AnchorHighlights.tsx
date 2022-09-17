import React, { useEffect, useState } from "react";
import { PromptsState } from "../../app/promptSlice";
import { PromptLocation } from "../../util/resolvePromptLocations";
import { highlightRange } from "./highlightRange";


export type HighlightFunc = (id: string, enabled: boolean) => any;

const SAVED_COLOR = "#F9EBD9";
const TRANSPARENT = "#FFFFFF00";
const HOVER_COLOR = "#D6090926";

export interface AnchorHighlightProps {
    prompts: PromptsState;
    promptLocations: { [id: string]: PromptLocation };
    setHighlightFunc?: (highlightFunc: HighlightFunc) => any;
}

function areRangesSame(rangeA: Range, rangeB: Range): boolean {
  return rangeA.compareBoundaryPoints(Range.START_TO_START, rangeB) === 0 && rangeA.compareBoundaryPoints(Range.END_TO_END, rangeB) === 0;
}

export function AnchorHighlight({prompts, promptLocations, setHighlightFunc}: AnchorHighlightProps){
    // If two prompts share a functional range, then one prompt is the "drawn" prompt and the other does not need to be redrawn
    // A prompt can have itself as the drawn promptId
    const [promptIdToDrawnPromptId, setPromptIdToDrawnPromptId] = useState<Map<string, string>>(new Map<string, string>());
    const [drawnPromptIdToIds, setDrawnPromptIdToIds] = useState<Map<string, string[]>>(new Map<string, string[]>());
    const [existingPromptIds, setExistingPromptIds] = useState<Set<string>>(new Set<string>());

    useEffect(() => {
      function highlight(id: string, enabled: boolean){
        const drawnId = promptIdToDrawnPromptId.get(id);
        var isSaved = prompts[id].isSaved;
        if (drawnId){
          const els = document.getElementsByClassName('orbitanchor-' + drawnId);
          for (const el of els){
            var color = TRANSPARENT;
            if (enabled) color = HOVER_COLOR;
            if (!enabled && isSaved) color = SAVED_COLOR;
            el.setAttribute('style', `background-color:${color};`);
          }

          // We may need to return to saved state if we are highlighting something that is shared
          if (!enabled) {
            drawnPromptIdToIds.get(drawnId)?.forEach((candidateId) => {
              if (prompts[drawnId].isSaved || prompts[candidateId].isSaved){
                for (const el of els){
                  el.setAttribute('style', `background-color:${SAVED_COLOR};`);
                }
              }
            })
          } 
        }
      }

      if(setHighlightFunc) setHighlightFunc(() => highlight);
    }, [prompts, promptIdToDrawnPromptId, drawnPromptIdToIds]);

    useEffect(() => {
        const newPromptDraws: Map<string, string> = new Map<string, string>();
        const newInversePromptDraws: Map<string, string[]> = new Map<string, string[]>();

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
            if (existingRange && areRangesSame(candidateRange, existingRange)){
              rangeAExists = true;
              break;
            }
          }

          if (!rangeAExists){
            newPromptDraws.set(idA, idA);
            newInversePromptDraws.set(idA, []);
          } else {
            newPromptDraws.set(idA, idB!);
            newInversePromptDraws.get(idB!)!.push(idA);
          }
        })

        setPromptIdToDrawnPromptId(newPromptDraws);
        setDrawnPromptIdToIds(newInversePromptDraws);
    }, [promptLocations]);

    useEffect(() => {
      const newExistingPromptIds = new Set<string>(existingPromptIds);

      var updated = false;
      // draw all "drawn" prompt ids
      for (const [idA, idB] of promptIdToDrawnPromptId){
        // we haven't drawn this before
        if (!newExistingPromptIds.has(idB)){
          const copy = promptLocations[idB].range.cloneRange()
          highlightRange(copy, 'mark', {class:'orbitanchor-'+idB, style: `background-color:${TRANSPARENT};`});
          newExistingPromptIds.add(idB);
          updated = true;
        }

        // handle saved states
        if (prompts[idA].isSaved){
          const els = document.getElementsByClassName('orbitanchor-' + idB);
          for (const el of els){
            el.setAttribute('style', `background-color:${SAVED_COLOR};`)
          }
        }
      }
      
      if (updated) {
        setExistingPromptIds(newExistingPromptIds);
      }
    }, [promptIdToDrawnPromptId, promptLocations, prompts, setHighlightFunc]);

    return null;
}