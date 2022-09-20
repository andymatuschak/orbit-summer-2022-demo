import styled from "@emotion/styled";
import { motion } from "framer-motion";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PromptId,
  PromptsState,
  savePrompt,
  updatePromptBack,
  updatePromptFront,
} from "../../app/promptSlice";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { useLayoutDependentValue } from "../../hooks/useLayoutDependentValue";
import { PromptLocation } from "../../util/resolvePromptLocations";
import zIndices from "../common/zIndices";
import { PromptVisibilitySetting } from "../OrbitMenuPromptVisibilityControl";
import { AnchorHighlight } from "./AnchorHighlights";
import BulkPromptBox from "./BulkPromptBox";
import PromptBox from "./PromptBox";
import { PromptContext } from "./PromptComponents";

export interface PromptLayoutManagerProps {
  prompts: PromptsState;
  promptLocations: { [id: string]: PromptLocation };
  marginX: number;
  newPromptId?: PromptId;
  clearNewPrompt?: () => any;
}

type PromptAbsoluteLocation = { top: number; bottom: number };
type PromptBoundingBoxes = { [id: PromptId]: PromptAbsoluteLocation };

const ShadowContainer = styled.div`
  opacity: 0;
  pointer-events: none;
`;

function compareDOMy(
  a: { id: PromptId; loc: PromptAbsoluteLocation },
  b: { id: PromptId; loc: PromptAbsoluteLocation },
): number {
  if (a.loc.top > b.loc.top) return 1;
  else if (a.loc.top < b.loc.top) return -1;
  // Stable sort on tiebreaks
  else return a.id > b.id ? 1 : -1;
}

// const MERGE_THRESHOLD_PIXELS = 0.0;
const PROMPT_SPACING = 12.0;
const PROMPT_SPACE_THRESHOLD = 4.0;
const TRANSITION = { duration: 0.3, ease: "easeOut" };
const COLLAPSED_THRESHOLD = 20;

export function PromptLayoutManager({
  prompts,
  promptLocations,
  marginX,
  newPromptId,
  clearNewPrompt,
}: PromptLayoutManagerProps) {
  const dispatch = useAppDispatch();
  const promptVisibility = useAppSelector((state) => state.promptVisibility);
  const visiblePromptIDs: PromptId[] = useMemo(() => {
    switch (promptVisibility) {
      case PromptVisibilitySetting.All:
        return Object.keys(prompts);
      case PromptVisibilitySetting.None:
        return [];
      case PromptVisibilitySetting.Saved:
        return Object.entries(prompts)
          .filter(([, { isSaved }]) => isSaved)
          .map(([id]) => id);
    }
  }, [prompts, promptVisibility]);

  var [promptRuns, setPromptRuns] = useState<PromptId[][]>(
    visiblePromptIDs.map((id) => [id]),
  );
  var [promptOffset, setPromptOffset] = useState<{ [id: PromptId]: number }>(
    {},
  );
  const promptMeasureRefs = useRef<{ [id: PromptId]: HTMLDivElement | null }>(
    {},
  );

  const bulkPromptLocations = useRef<{ [id: PromptId]: number }>({});
  const [bulkSaves, setBulkSaves] = useState<Set<PromptId>>(new Set());
  const [currHoverPrompt, setHoverPrompt] = useState<PromptId>();
  const [currEditPrompt, setEditPrompt] = useState<PromptId>();
  // We have to let the shadow container mount and render for sizing
  const [delayOneRender, setDelayOneRender] = useState<boolean>(true);
  const isCollapsed = useLayoutDependentValue<boolean>(
    useCallback(() => {
      const refs = Object.values(promptMeasureRefs.current);
      const rect = refs[0]?.getBoundingClientRect();
      if (rect) {
        const right = rect.right;
        if (right > window.innerWidth - COLLAPSED_THRESHOLD) {
          return true;
        }
      }
      return false;
    }, []),
  );

  function clonePromptLocations(locs: { [id: PromptId]: PromptLocation }) {
    const clone: { [id: PromptId]: PromptLocation } = {};
    Object.entries(locs).forEach(([id, loc]) => {
      const locClone = { ...loc };
      clone[id] = locClone;
    });
    return clone;
  }

  useLayoutEffect(() => {
    if (
      Object.keys(promptMeasureRefs.current).length >=
        visiblePromptIDs.length &&
      Object.keys(promptLocations).length >= visiblePromptIDs.length
    ) {
      // Collect bounding boxes of visiblePrompts
      const boundingBoxes: PromptBoundingBoxes = {};
      visiblePromptIDs.forEach((id) => {
        const el = promptMeasureRefs.current[id];
        if (el) {
          const rect = el.getBoundingClientRect();
          const top = rect.top + window.scrollY;
          const bottom = rect.bottom + window.scrollY;
          boundingBoxes[id] = { top, bottom };
        }
      });

      const sortedIds = Object.entries(boundingBoxes)
        .sort((a, b) =>
          compareDOMy({ id: a[0], loc: a[1] }, { id: b[0], loc: b[1] }),
        )
        .map((a) => a[0]);
      const runs: string[][] = sortedIds.length > 0 ? [[sortedIds[0]]] : [];
      var currRunStartIdx = 0;
      // Pass 1 - create bulk runs for overlapping bounding boxes of non-saved elements
      // TODO: compute width and use adjusted position instead
      for (var i = 0; i < sortedIds.length - 1; i++) {
        const runStartId = runs[currRunStartIdx][0];
        const runEndId =
          runs[currRunStartIdx][runs[currRunStartIdx].length - 1];
        const nextId = sortedIds[i + 1];
        // The bottom of the bounding box of the current run
        const currBottom = boundingBoxes[runEndId].bottom;
        // The top of the bounding box being evaluated for merge
        const nextTop = boundingBoxes[nextId].top;
        if (prompts[nextId].isSaved && !bulkSaves.has(nextId)) {
          // Saved elements not in the bulk saved state are not eligible for bulk prompts, Add to its own run
          currRunStartIdx += 1;
          runs[currRunStartIdx] = [nextId];
          // TODO: merge threshold
        } else if (nextTop < currBottom) {
          // Lookback - add to current run if the run is eligible for merge (is not a saved prompt or in the bulk queue)
          if (!prompts[runStartId].isSaved || bulkSaves.has(runStartId)) {
            runs[currRunStartIdx].push(nextId);
          } else {
            // Lookback is ineligable for merge - create new run
            currRunStartIdx += 1;
            runs[currRunStartIdx] = [nextId];
          }
        } else {
          // Create new run
          currRunStartIdx += 1;
          runs[currRunStartIdx] = [nextId];
        }
      }
      // Pass 2 - adjust saved prompt locations so that overlapping boxes are spaced out
      // TODO: use bulk button size for runs length > 1 instead
      const newPromptLocations = clonePromptLocations(promptLocations);
      const offsets: { [id: string]: number } = {};
      for (i = 0; i < runs.length - 1; i++) {
        const currId = runs[i][0];
        const nextId = runs[i + 1][0];
        const currHeight =
          boundingBoxes[currId].bottom - boundingBoxes[currId].top;
        const currBottom = newPromptLocations[currId].top + currHeight;
        const nextTop = newPromptLocations[nextId].top;
        if (nextTop < currBottom - PROMPT_SPACE_THRESHOLD) {
          newPromptLocations[nextId].top = currBottom + PROMPT_SPACING;
          const addedSpace =
            newPromptLocations[nextId].top - promptLocations[nextId].top;
          offsets[nextId] = addedSpace;
        }
      }
      setPromptRuns(runs.reverse());
      setPromptOffset(offsets);
    }
  }, [prompts, visiblePromptIDs, bulkSaves, promptLocations, delayOneRender]);

  useEffect(() => {
    setDelayOneRender(false);
  }, []);

  return (
    <>
      {/* This is not pretty, forgive me (prototype?) - ShadowContainer is a copy of the prompts used for measurement purposes, we don't need this but it makes some data flow easier for now */}
      <ShadowContainer>
        {Object.entries(prompts).map(([id]) => {
          return (
            <div
              key={id}
              css={{
                position: "absolute",
                left: marginX,
                top: promptLocations[id]?.top,
                width: 332,
              }}
              ref={(el) => (promptMeasureRefs.current[id] = el)}
            >
              <PromptBox
                prompt={prompts[id]}
                context={PromptContext.Floating}
                savePrompt={() => null}
                forceHover={true}
                updatePromptFront={(newPrompt) => null}
                updatePromptBack={(newPrompt) => null}
              />
            </div>
          );
        })}
      </ShadowContainer>
      {!delayOneRender &&
        promptRuns.map((ids) => {
          if (ids.length === 1) {
            const id = ids[0];
            return (
              <motion.div
                key={id}
                css={{
                  position: "absolute",
                  left: marginX,
                  width: 332,
                  zIndex: zIndices.displayOverContent,
                }}
                animate={{
                  top: promptLocations[id]?.top + (promptOffset[id] ?? 0),
                }}
                initial={{
                  top:
                    bulkPromptLocations.current[id] !== undefined
                      ? bulkPromptLocations.current[id]
                      : promptLocations[id]?.top + (promptOffset[id] ?? 0),
                }}
                transition={TRANSITION}
              >
                <PromptBox
                  prompt={prompts[id]}
                  isNew={id === newPromptId}
                  context={
                    isCollapsed
                      ? PromptContext.Collapsed
                      : PromptContext.Floating
                  }
                  savePrompt={() => dispatch(savePrompt(id))}
                  updatePromptFront={(newPrompt) =>
                    dispatch(updatePromptFront([id, newPrompt]))
                  }
                  updatePromptBack={(newPrompt) =>
                    dispatch(updatePromptBack([id, newPrompt]))
                  }
                  clearNew={clearNewPrompt}
                  onMouseEnter={() => setHoverPrompt(id)}
                  onMouseLeave={() => setHoverPrompt(undefined)}
                  onEditStart={() => setEditPrompt(id)}
                  onEditEnd={() => setEditPrompt(undefined)}
                />
              </motion.div>
            );
          } else {
            return (
              <motion.div
                key={ids.join()}
                css={{
                  position: "absolute",
                  left: marginX,
                  pointerEvents: "none",
                  // Pop-up active bulk
                  zIndex:
                    ids.indexOf(currHoverPrompt ?? "") !== -1 ||
                    ids.indexOf(currEditPrompt ?? "") !== -1
                      ? zIndices.displayOverContent + 1
                      : zIndices.displayOverContent,
                }}
                animate={{
                  top:
                    promptLocations[ids[0]]?.top + (promptOffset[ids[0]] ?? 0),
                }}
                initial={{
                  top:
                    promptLocations[ids[0]]?.top + (promptOffset[ids[0]] ?? 0),
                }}
                transition={TRANSITION}
              >
                <BulkPromptBox
                  prompts={ids.map((id) => prompts[id])}
                  ids={ids}
                  savePrompt={(id) => dispatch(savePrompt(id))}
                  addToSaves={(id) => setBulkSaves(new Set(bulkSaves.add(id)))}
                  saves={bulkSaves}
                  clearSaves={() => setBulkSaves(new Set())}
                  updatePromptFront={(id, newPrompt) =>
                    dispatch(updatePromptFront([id, newPrompt]))
                  }
                  updatePromptBack={(id, newPrompt) =>
                    dispatch(updatePromptBack([id, newPrompt]))
                  }
                  setHoverPrompt={(id) => setHoverPrompt(id)}
                  setEditPrompt={(id) => setEditPrompt(id)}
                  setTops={(id, top) => {
                    bulkPromptLocations.current[id] = top;
                  }}
                />
              </motion.div>
            );
          }
        })}
      <AnchorHighlight
        prompts={prompts}
        visiblePromptIDs={useMemo(
          () => new Set(visiblePromptIDs),
          [visiblePromptIDs],
        )}
        promptLocations={promptLocations}
        hoverPrompt={currHoverPrompt}
        editPrompt={currEditPrompt}
      />
    </>
  );
}
