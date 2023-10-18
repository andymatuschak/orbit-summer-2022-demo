import { useEffect, useRef, useState } from "react";
import { convertMissingHighlight } from "../../app/hypothesisMiddleware";
import {
  AnnotationType,
  deletePrompt,
  PromptID,
  PromptsState,
  setPromptAnnotationType,
} from "../../app/promptSlice";
import { useAppDispatch } from "../../app/store";
import { PromptLocation } from "../../util/resolvePromptLocations";
import { viewportToRoot } from "../../util/viewportToRoot";
import zIndices from "../common/zIndices";
import ContextualMenu, { ContextualMenuItemProps } from "../ContextualMenu";
import { highlightRange } from "./highlightRange";

function colorForAnnotationType(
  type: AnnotationType,
): typeof AnchorColors[keyof typeof AnchorColors] {
  switch (type) {
    case AnnotationType.ForReview:
      return AnchorColors.forReview;
    case AnnotationType.Highlight:
      return AnchorColors.highlight;
    case AnnotationType.Missed:
      return AnchorColors.missed;
  }
}

export interface AnchorHighlightProps {
  prompts: PromptsState;
  promptLocations: { [id: string]: PromptLocation };
  visiblePromptIDs: Set<string>;
  hoverPrompts: PromptID[] | undefined;
  editPrompt: PromptID | undefined;
  setHoverPrompts: (id: PromptID[] | undefined) => any;
  onAddComment: (id: PromptID) => unknown;
}

function areRangesSame(rangeA: Range, rangeB: Range): boolean {
  return (
    rangeA.compareBoundaryPoints(Range.START_TO_START, rangeB) === 0 &&
    rangeA.compareBoundaryPoints(Range.END_TO_END, rangeB) === 0
  );
}

function classNameForPromptID(id: PromptID): string {
  return `orbitanchor-${id.replace(/ /g, "-")}`;
}

const AnchorColors = {
  unsaved: "#FFFFFF00",
  highlight: "#fcf4c6",
  forReview: "#e2dbff",
  hover: "#D6090926",
  missed: "rgb(252,219,202)",
} as const;

interface HighlightMenuState {
  promptID: PromptID;
  // in root coordinate system
  x: number;
  y: number;
}

export function AnchorHighlight({
  prompts,
  promptLocations,
  visiblePromptIDs,
  hoverPrompts,
  editPrompt,
  setHoverPrompts,
  onAddComment,
}: AnchorHighlightProps) {
  // If two prompts share a functional range, then one prompt is the "drawn" prompt and the other does not need to be redrawn
  // A prompt can have itself as the drawn promptId
  const [promptIdToDrawnPromptId, setPromptIdToDrawnPromptId] = useState<
    Map<PromptID, PromptID>
  >(new Map<PromptID, PromptID>());
  const [drawnPromptIdToIds, setDrawnPromptIdToIds] = useState<
    Map<string, string[]>
  >(new Map<PromptID, PromptID[]>());
  const [existingPromptIds, setExistingPromptIds] = useState<Set<string>>(
    new Set<PromptID>(),
  );
  const idsToHighlightRemoveFns = useRef<Map<PromptID, () => void>>(new Map());
  const dispatch = useAppDispatch();

  const [menuState, setMenuState] = useState<HighlightMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // TODO: refactor all instances of this logic to use this instead. It's getting DRY
  function highlightDrawnId(
    id: string,
    color: typeof AnchorColors[keyof typeof AnchorColors],
  ) {
    const els = document.getElementsByClassName(classNameForPromptID(id));
    for (const el of els) {
      if (el instanceof HTMLElement) {
        el.style.backgroundColor = color;

        // HACK probably doesn't deal with overlapping prompts appropriately
        el.style.borderBottom =
          hoverPrompts?.includes(id) || editPrompt === id
            ? `1px solid red`
            : "none";
      }
    }
  }

  useEffect(() => {
    // Set all prompts to state based on saved
    promptIdToDrawnPromptId.forEach((id, drawnId) => {
      const prompt = prompts[id];
      if (!prompt) {
        setPromptIdToDrawnPromptId((oldPromptIdToDrawnPromptId) => {
          return new Map(
            [...oldPromptIdToDrawnPromptId.entries()].filter(
              ([id2]) => id !== id2,
            ),
          );
        });
        setDrawnPromptIdToIds((oldDrawnPromptIdToIds) => {
          // See if the drawn prompt corresponds to any other prompts. If not, we'll remove it.
          const idsForDrawnId = oldDrawnPromptIdToIds
            .get(drawnId)
            ?.filter((id2) => id !== id2);
          if (idsForDrawnId !== undefined) {
            if (idsForDrawnId.length === 0) {
              idsToHighlightRemoveFns.current.get(drawnId)?.();
              idsToHighlightRemoveFns.current.delete(drawnId);
            }
            return new Map(
              [...oldDrawnPromptIdToIds.entries()].map(([dId, ids]) => [
                dId,
                dId === drawnId ? idsForDrawnId : ids,
              ]),
            );
          } else {
            return oldDrawnPromptIdToIds;
          }
        });
        setExistingPromptIds(
          (oldPromptIds) =>
            new Set([...oldPromptIds].filter((id2) => id !== id2)),
        );
        return;
      }

      if (drawnId) {
        // TODO will result in fighting for heterogeneous highlight colors
        highlightDrawnId(
          drawnId,
          prompt.isSaved && visiblePromptIDs.has(id)
            ? colorForAnnotationType(
                prompts[drawnId].annotationType ?? AnnotationType.Highlight,
              )
            : AnchorColors.unsaved,
        );

        // Check if perhaps drawn has a dep that is saved
        drawnPromptIdToIds.get(drawnId)?.forEach((candidateId) => {
          const els = document.getElementsByClassName(
            classNameForPromptID(drawnId),
          ) as HTMLCollectionOf<HTMLElement>;

          var color =
            prompts[drawnId].isSaved || prompts[candidateId]?.isSaved
              ? colorForAnnotationType(
                  prompts[candidateId].annotationType ??
                    AnnotationType.Highlight,
                ) // TODO: this won't work for heterogeneous highlight colors
              : AnchorColors.unsaved;
          for (const el of els) {
            el.style.backgroundColor = color;
          }
        });
      }
    });
  }, [
    hoverPrompts,
    editPrompt,
    prompts,
    visiblePromptIDs,
    promptIdToDrawnPromptId,
    drawnPromptIdToIds,
    promptLocations,
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
      const className = classNameForPromptID(idB);
      if (
        promptLocations[idB] &&
        (!newExistingPromptIds.has(idB) ||
          document.getElementsByClassName(className).length === 0)
      ) {
        const copy = promptLocations[idB].range.cloneRange();
        const prompt = prompts[idB];
        const removeHighlightFn = highlightRange(copy, "span", {
          class: className,
          style: `background-color:${
            prompt.isSaved && visiblePromptIDs.has(idB)
              ? colorForAnnotationType(
                  prompt.annotationType ?? AnnotationType.Highlight,
                )
              : AnchorColors.unsaved
          }; cursor: pointer;`,
        });
        if (removeHighlightFn) {
          idsToHighlightRemoveFns.current.set(idB, removeHighlightFn);
        }
        newExistingPromptIds.add(idB);
        updated = true;
      }
    }

    if (updated) {
      setExistingPromptIds(newExistingPromptIds);
    }
  }, [promptIdToDrawnPromptId, promptLocations, prompts, existingPromptIds]);

  useEffect(() => {
    const interruptibleDebounces = new Set<PromptID>();
    const onMouseEnter = function (id: PromptID) {
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
      return function (this: any, id: PromptID) {
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

    const onMouseLeave = debounce(function (id: PromptID) {
      setHoverPrompts(undefined);
    });

    function onClick(event: MouseEvent, id: PromptID) {
      const offset = viewportToRoot();
      setMenuState((menuState) =>
        menuState
          ? null
          : {
              promptID: id,
              x: event.clientX + offset.x,
              y: event.clientY + offset.y,
            },
      );
      event.stopPropagation();
    }

    const callbacks: { [id: PromptID]: ((e: MouseEvent) => void)[] } = {};
    existingPromptIds.forEach((id) => {
      callbacks[id] = [
        () => onMouseEnter(id),
        () => onMouseLeave(id),
        (e: MouseEvent) => onClick(e, id),
      ];
    });

    existingPromptIds.forEach((id) => {
      const els = document.getElementsByClassName(classNameForPromptID(id));
      for (const el of els) {
        if (el instanceof HTMLElement) {
          el.addEventListener("mouseenter", callbacks[id][0]);
          el.addEventListener("mouseleave", callbacks[id][1]);
          el.addEventListener("click", callbacks[id][2]);
        }
      }
    });

    return () => {
      existingPromptIds.forEach((id) => {
        const els = document.getElementsByClassName(classNameForPromptID(id));
        for (const el of els) {
          if (el instanceof HTMLElement) {
            el.removeEventListener("mouseenter", callbacks[id][0]);
            el.removeEventListener("mouseleave", callbacks[id][1]);
            el.removeEventListener("click", callbacks[id][2]);
          }
        }
      });
    };
  }, [prompts, existingPromptIds, drawnPromptIdToIds]);

  // Hide the menu when clicking outside it.
  useEffect(() => {
    if (menuState) {
      function onClick(event: MouseEvent) {
        if (
          event.target instanceof Element &&
          !menuRef.current!.contains(event.target)
        ) {
          setMenuState(null);
          document.removeEventListener("click", onClick);
        }
      }

      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }
  }, [menuState]);

  return (
    menuState && (
      <div
        style={{
          position: "absolute",
          left: menuState.x,
          top: menuState.y,
          width: 0,
          height: 0,
          zIndex: zIndices.orbitMenu,
        }}
        ref={menuRef}
      >
        <ContextualMenu
          items={(() => {
            const addNoteItem: ContextualMenuItemProps = {
              title: "Add Note",
              onClick: () => {
                onAddComment(menuState.promptID);
                setMenuState(null);
              },
              shortcutKey: "N",
              isEnabled: true,
            };
            const removeItem: ContextualMenuItemProps = {
              title: "Remove",
              onClick: () => {
                dispatch(deletePrompt(menuState.promptID));
                setMenuState(null);
              },
              shortcutKey: "R",
              isEnabled: true,
            };

            const promptHasNote =
              prompts[menuState.promptID].content.front !== "";
            switch (
              prompts[menuState.promptID].annotationType ??
              AnnotationType.Highlight
            ) {
              case AnnotationType.ForReview: {
                const items: ContextualMenuItemProps[] = [
                  {
                    title: "Switch to Highlight",
                    onClick: () => {
                      dispatch(
                        setPromptAnnotationType([
                          menuState!.promptID,
                          AnnotationType.Highlight,
                        ]),
                      );
                      setMenuState(null);
                    },
                    shortcutKey: "H",
                    isEnabled: true,
                  },
                  removeItem,
                ];
                return promptHasNote ? items : [addNoteItem, ...items];
              }

              case AnnotationType.Highlight: {
                const items: ContextualMenuItemProps[] = [
                  {
                    title: "Mark for Review",
                    onClick: () => {
                      dispatch(
                        setPromptAnnotationType([
                          menuState!.promptID,
                          AnnotationType.ForReview,
                        ]),
                      );
                      setMenuState(null);
                    },
                    shortcutKey: "M",
                    isEnabled: true,
                  },
                  removeItem,
                ];
                return promptHasNote ? items : [addNoteItem, ...items];
              }

              case AnnotationType.Missed: {
                return [
                  {
                    title: "Highlight",
                    onClick: () => {
                      dispatch(
                        convertMissingHighlight(
                          menuState!.promptID,
                          AnnotationType.Highlight,
                        ),
                      );
                      setMenuState(null);
                    },
                    shortcutKey: "H",
                    isEnabled: true,
                  },
                  {
                    title: "Mark for Review",
                    onClick: () => {
                      dispatch(
                        convertMissingHighlight(
                          menuState!.promptID,
                          AnnotationType.ForReview,
                        ),
                      );
                      setMenuState(null);
                    },
                    shortcutKey: "M",
                    isEnabled: true,
                  },
                ];
              }
            }
          })()}
        />
      </div>
    )
  );
}
