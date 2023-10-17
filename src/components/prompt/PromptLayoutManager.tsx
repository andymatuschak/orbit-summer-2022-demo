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
import { fetchMissingHighlights } from "../../app/hypothesisMiddleware";
import {
  deletePrompt,
  isShowMissedPromptsButton,
  Prompt,
  PromptID,
  PromptsState,
  savePrompt,
  unsavePrompt,
  updatePromptBack,
  updatePromptFront,
} from "../../app/promptSlice";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { useLayoutDependentValue } from "../../hooks/useLayoutDependentValue";
import { PromptLocation } from "../../util/resolvePromptLocations";
import { viewportToRoot } from "../../util/viewportToRoot";
import zIndices from "../common/zIndices";
import { PromptVisibilitySetting } from "../OrbitMenuPromptVisibilityControl";
import { AnchorHighlight } from "./AnchorHighlights";
import BulkPromptBox from "./BulkPromptBox";
import PromptBox from "./PromptBox";
import {
  CollapsedPromptDirection,
  MissedPromptsButton,
  PromptContext,
} from "./PromptComponents";

export interface PromptLayoutManagerProps {
  prompts: PromptsState;
  promptLocations: { [id: string]: PromptLocation };
  marginX: number;
  suggestedPromptIDs: PromptID[];
  newPromptId?: PromptID;
  clearNewPrompt?: () => any;
  onAddComment: (id: PromptID) => unknown;
}

type PromptAbsoluteLocation = { top: number; bottom: number };
type PromptBoundingBoxes = { [id: PromptID]: PromptAbsoluteLocation };

const ShadowContainer = styled.div`
  opacity: 0;
  pointer-events: none;
`;

function compareDOMy(
  a: { prompt: Prompt; loc: PromptAbsoluteLocation },
  b: { prompt: Prompt; loc: PromptAbsoluteLocation },
): number {
  if (a.loc.top > b.loc.top) return 1;
  else if (a.loc.top < b.loc.top) return -1;
  else {
    if (!a.prompt.isByAuthor && b.prompt.isByAuthor) {
      return -1;
    } else if (a.prompt.isByAuthor && !b.prompt.isByAuthor) {
      return 1;
    } else {
      return (
        a.prompt.creationTimestampMillis - b.prompt.creationTimestampMillis
      );
    }
  }
}

// const MERGE_THRESHOLD_PIXELS = 0.0;
const PROMPT_SPACING = 8;
const PROMPT_SPACE_THRESHOLD = 4.0;
const TRANSITION = { duration: 0.3, ease: "easeOut" };
const COLLAPSED_THRESHOLD = 20;

export function PromptLayoutManager({
  prompts,
  promptLocations,
  marginX,
  suggestedPromptIDs,
  newPromptId,
  clearNewPrompt,
  onAddComment,
}: PromptLayoutManagerProps) {
  const dispatch = useAppDispatch();
  const promptVisibility = useAppSelector((state) => state.promptVisibility);
  const visiblePromptIDs: PromptID[] = useMemo(() => {
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
  const viewingSourceID = useAppSelector(
    (state) => state.modalReview?.viewingSourceID,
  );

  var [promptRuns, setPromptRuns] = useState<PromptID[][]>(
    visiblePromptIDs.map((id) => [id]),
  );
  var [promptOffset, setPromptOffset] = useState<{ [id: PromptID]: number }>(
    {},
  );
  const promptMeasureRefs = useRef<{ [id: PromptID]: HTMLDivElement | null }>(
    {},
  );

  const bulkPromptLocations = useRef<{ [id: PromptID]: number }>({});
  const [bulkSaves, setBulkSaves] = useState<Set<PromptID>>(new Set());
  const addToSaves = useCallback(
    (id: PromptID) => {
      setBulkSaves(new Set(bulkSaves.add(id)));
    },
    [bulkSaves, setBulkSaves],
  );
  const clearSaves = useCallback(() => {
    if (bulkSaves.size > 0) {
      setBulkSaves(new Set());
    }
  }, [bulkSaves, setBulkSaves]);

  const [currHoverPrompts, setHoverPrompts] = useState<PromptID[]>();
  const [currEditPrompt, setEditPrompt] = useState<PromptID>();
  const [currAnchorHovers, setCurrAnchorHovers] = useState<PromptID[]>();
  // We have to let the shadow container mount and render for sizing
  const [delayOneRender, setDelayOneRender] = useState<boolean>(true);
  const collapsedDirection: CollapsedPromptDirection | undefined =
    useLayoutDependentValue<CollapsedPromptDirection | undefined>(
      useCallback(() => {
        function hasWindowSpace() {
          const refs = Object.values(promptMeasureRefs.current);
          const rect = refs[0]?.getBoundingClientRect();
          if (rect) {
            const right = rect.right;
            if (right > window.innerWidth - COLLAPSED_THRESHOLD) {
              return false;
            }
          }
          return true;
        }

        const hasSpace = hasWindowSpace();
        // If IMS
        if (
          document.location.pathname.includes("ims") ||
          document.location.pathname.includes("sh/da")
        ) {
          if (hasSpace) return CollapsedPromptDirection.LTR;
          return CollapsedPromptDirection.RTL;
        }

        return hasSpace ? undefined : CollapsedPromptDirection.RTL;
      }, []),
    );

  function clonePromptLocations(locs: { [id: PromptID]: PromptLocation }) {
    const clone: { [id: PromptID]: PromptLocation } = {};
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
          const offset = viewportToRoot();
          const top = rect.top + offset.y;
          const bottom = rect.bottom + offset.y;
          boundingBoxes[id] = { top, bottom };
        }
      });

      const sortedIds = Object.entries(boundingBoxes)
        .sort((a, b) =>
          compareDOMy(
            { prompt: prompts[a[0]], loc: a[1] },
            { prompt: prompts[b[0]], loc: b[1] },
          ),
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
        } else if (nextTop < currBottom + 24) {
          // Lookback - add to current run if the run is eligible for merge (is not a saved prompt or in the bulk queue)
          // if (!prompts[runStartId].isSaved || bulkSaves.has(runStartId)) {
          //   runs[currRunStartIdx].push(nextId);
          // } else {
          // Lookback is ineligable for merge - create new run
          currRunStartIdx += 1;
          runs[currRunStartIdx] = [nextId];
          // }
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
        // If the prompt locations haven't resolved for a new prompt, they may be not be ready, we skip and assume when they resolve this hook will rerun
        if (
          newPromptLocations[currId] === undefined ||
          newPromptLocations[nextId] === undefined
        ) {
          continue;
        }
        const currHeight =
          boundingBoxes[currId].bottom - boundingBoxes[currId].top;
        const currBottom = newPromptLocations[currId].top + currHeight;
        const nextTop = newPromptLocations[nextId].top;
        if (nextTop < currBottom + PROMPT_SPACE_THRESHOLD) {
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

  const [usedMissedPromptButtonIDs, setUsedMissedPromptButtonIDs] = useState<
    PromptID[]
  >([]);

  function onShowMissedPrompts(buttonID: PromptID) {
    setUsedMissedPromptButtonIDs((ids) => [...ids, buttonID]);
    const orderedPrompts: PromptID[] = promptRuns.flat().reverse();
    const sectionRange = new Range();
    sectionRange.setEnd(
      promptLocations[buttonID].range.startContainer,
      promptLocations[buttonID].range.startOffset,
    );
    for (let i = orderedPrompts.indexOf(buttonID) - 1; i >= 0; i--) {
      const promptID = orderedPrompts[i];
      if (isShowMissedPromptsButton(prompts[promptID])) {
        console.log("Found previous button");
        // We must be into the previous section.
        const previousButtonRange = promptLocations[promptID].range;
        sectionRange.setStart(
          previousButtonRange.endContainer,
          previousButtonRange.endOffset,
        );
        break;
      }
    }
    dispatch(fetchMissingHighlights(sectionRange));
  }

  return (
    <>
      {/* This is not pretty, forgive me (prototype?) - ShadowContainer is a copy of the prompts used for measurement purposes, we don't need this but it makes some data flow easier for now */}
      <ShadowPrompts
        prompts={prompts}
        promptLocations={promptLocations}
        promptMeasureRefs={promptMeasureRefs}
        marginX={marginX}
        collapsedDirection={collapsedDirection}
        newPromptId={newPromptId}
      />
      {!delayOneRender &&
        promptRuns.map((ids) => {
          // If we delete a user authored id, it may be null until layout recalc happens
          if (
            prompts[ids[0]] === undefined ||
            promptLocations[ids[0]] === undefined
          ) {
            return null;
          } else if (ids.length === 1) {
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
                {isShowMissedPromptsButton(prompts[id]) ? (
                  usedMissedPromptButtonIDs.includes(id) ? null : (
                    <MissedPromptsButton
                      onToggleMissedPrompts={() => onShowMissedPrompts(id)}
                    />
                  )
                ) : (
                  <PromptBoxMemo
                    prompt={prompts[id]}
                    isNew={id === newPromptId}
                    isAnchorHovered={
                      currAnchorHovers?.includes(id) ||
                      // HACK: When a prompt is suggested (i.e. because your selection range intersects its anchor, we pretend its anchor is highlighted. Semantically, it'd be better to separate this into a different prop--not really appropriate to force this value like this.
                      suggestedPromptIDs.includes(id)
                    }
                    isViewingAsSource={id === viewingSourceID}
                    forceHover={suggestedPromptIDs.includes(id)}
                    forceHideBack={true} // HACK
                    context={
                      collapsedDirection && !prompts[id].isSaved
                        ? PromptContext.FloatingCollapsed
                        : PromptContext.Floating
                    }
                    collapsedDirection={collapsedDirection}
                    savePrompt={() => dispatch(savePrompt(id))}
                    unsavePrompt={() =>
                      prompts[id].isByAuthor
                        ? dispatch(unsavePrompt(id))
                        : dispatch(deletePrompt(id))
                    }
                    updatePromptFront={(newPrompt) =>
                      dispatch(updatePromptFront([id, newPrompt]))
                    }
                    updatePromptBack={(newPrompt) =>
                      dispatch(updatePromptBack([id, newPrompt]))
                    }
                    clearNew={clearNewPrompt}
                    onMouseEnter={() => setHoverPrompts([id])}
                    onMouseLeave={() => setHoverPrompts(undefined)}
                    onEditStart={() => setEditPrompt(id)}
                    onEditEnd={() => setEditPrompt(undefined)}
                  />
                )}
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
                    ids.indexOf(currHoverPrompts ? currHoverPrompts[0] : "") !==
                      -1 || ids.indexOf(currEditPrompt ?? "") !== -1
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
                <BulkPromptBoxMemo
                  prompts={ids.map((id) => prompts[id])}
                  ids={ids}
                  savePrompt={(id) => dispatch(savePrompt(id))}
                  addToSaves={addToSaves}
                  saves={bulkSaves}
                  collapsedDirection={collapsedDirection}
                  clearSaves={clearSaves}
                  updatePromptFront={(id, newPrompt) =>
                    dispatch(updatePromptFront([id, newPrompt]))
                  }
                  updatePromptBack={(id, newPrompt) =>
                    dispatch(updatePromptBack([id, newPrompt]))
                  }
                  setHoverPrompts={(ids: PromptID[] | undefined) =>
                    setHoverPrompts(ids)
                  }
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
        // HACK
        hoverPrompts={
          viewingSourceID
            ? [...(currHoverPrompts ?? []), viewingSourceID]
            : currHoverPrompts
        }
        editPrompt={currEditPrompt}
        setHoverPrompts={setCurrAnchorHovers}
        onAddComment={onAddComment}
      />
    </>
  );
}

interface ShadowPromptsProps {
  prompts: PromptsState;
  marginX: number;
  promptMeasureRefs: React.MutableRefObject<{
    [id: string]: HTMLDivElement | null;
  }>;
  promptLocations: { [id: string]: PromptLocation };
  collapsedDirection: CollapsedPromptDirection | undefined;
  newPromptId: PromptID | undefined;
}

const ShadowPrompts = React.memo(function ({
  prompts,
  marginX,
  promptMeasureRefs,
  promptLocations,
  collapsedDirection,
  newPromptId,
}: ShadowPromptsProps) {
  return (
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
              forceHover={prompts[id].isSaved}
              forceHideBack={true} // HACK
              updatePromptFront={() => null}
              updatePromptBack={() => null}
              isNew={id === newPromptId}
            />
          </div>
        );
      })}
    </ShadowContainer>
  );
});

// Memo-ized PromptBox that is aware of some of the logic of PromptLayoutManager
export const PromptBoxMemo = React.memo(PromptBox, (prev, curr) => {
  if (prev.prompt !== curr.prompt) {
    return false;
  }
  if (prev.prompt.content.front !== curr.prompt.content.front) {
    return false;
  }
  if (prev.prompt.content.back !== curr.prompt.content.back) {
    return false;
  }
  if (prev.isNew !== curr.isNew) {
    return false;
  }
  if (prev.context !== curr.context) {
    return false;
  }
  if (prev.isAnchorHovered !== curr.isAnchorHovered) {
    return false;
  }
  if (prev.collapsedDirection !== curr.collapsedDirection) {
    return false;
  }
  if (prev.isViewingAsSource !== curr.isViewingAsSource) {
    return false;
  }
  return true;
});

// Memo-ized PromptBox that is aware of some of the logic of PromptLayoutManager and also aware of the fact that saved prompts cannot be in a bulk unless the bulk is hovered
export const BulkPromptBoxMemo = React.memo(BulkPromptBox, (prev, curr) => {
  if (prev.ids.join() !== curr.ids.join()) {
    return false;
  }
  if (prev.saves !== curr.saves) {
    return false;
  }
  if (prev.collapsedDirection !== curr.collapsedDirection) {
    return false;
  }
  if (prev.addToSaves !== curr.addToSaves) {
    return false;
  }
  return true;
});
