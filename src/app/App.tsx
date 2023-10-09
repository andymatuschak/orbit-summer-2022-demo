import { css } from "@emotion/react";
import { generateUniqueID } from "@withorbit/core";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "../components/Button";
import zIndices from "../components/common/zIndices";
import ContextualMenu from "../components/ContextualMenu";
import { InlineReviewOverlay } from "../components/InlineReviewOverlay";
import { ModalReview } from "../components/ModalReview";
import { OrbitMenu } from "../components/OrbitMenu";
import { PromptLayoutManager } from "../components/prompt/PromptLayoutManager";
import { PromptList } from "../components/prompt/PromptList";
import { LabelColor } from "../components/Type";
import { usePromptLocations } from "../hooks/usePromptLocations";
import { useReviewAreaIntegration } from "../hooks/useReviewAreaIntegration";
import { useSelectionBounds } from "../hooks/useSelectionBounds";
import { PromptLocation } from "../util/resolvePromptLocations";
import { getScrollingContainer, viewportToRoot } from "../util/viewportToRoot";
import { describe } from "../vendor/hypothesis-annotator/html";
import { InlineReviewModuleState } from "./inlineReviewModuleSlice";
import { resumeReview, startReviewForAllDuePrompts } from "./modalReviewSlice";
import {
  createNewPrompt,
  deletePrompt,
  Prompt,
  PromptID,
  PromptsState,
  savePrompt,
} from "./promptSlice";
import { store, useAppDispatch, useAppSelector } from "./store";

export interface AppProps {
  marginX: number;
  textRoot: Element;
  promptLists: { [elementID: string]: PromptListSpec };
}

export interface PromptListSpec {
  promptsByFrontText: string[];
}

export default function App({ marginX, textRoot, promptLists }: AppProps) {
  const prompts = useAppSelector((state) => state.prompts);
  const inlineReviewModules = useAppSelector(
    (state) => state.inlineReviewModules,
  );
  const modalReviewState = useAppSelector((state) => state.modalReview);
  useReviewAreaIntegration();
  const { locations: promptLocations, updateLocations } =
    usePromptLocations(prompts);

  // HACK HACK: when orbit-reviewarea lays out, it'll move prompts down the page. Lay out again a couple seconds after load...
  useEffect(() => {
    setTimeout(() => {
      updateLocations();
    }, 2000);
  }, [updateLocations]);

  const dispatch = useAppDispatch();

  const { selectionPosition, selectionRange, clearSelectionPosition } =
    useSelectionBounds(textRoot);
  const selectedPromptIDs = useMemo(() => {
    return selectionRange && promptLocations
      ? findIntersectingPrompts(selectionRange, promptLocations)
      : [];
  }, [selectionRange, promptLocations]);
  const suggestedPromptIDs = useMemo(
    () => selectedPromptIDs.filter((id) => !prompts[id].isSaved),
    [prompts, selectedPromptIDs],
  );

  const [newPromptId, setNewPromptId] = useState<string | undefined>();
  const mousePosition = useRef<{ x: number; y: number }>();

  const viewingSourceID = modalReviewState?.viewingSourceID;
  const scrollTarget = viewingSourceID
    ? promptLocations?.[viewingSourceID]?.top ?? null
    : null;
  useEffect(() => {
    if (scrollTarget !== null) {
      getScrollingContainer().scrollTo({
        left: window.scrollX,
        top: scrollTarget - window.innerHeight / 2,
        behavior: "smooth",
      });
    }
  }, [scrollTarget]);

  // Listen to mouse events for context menu
  useEffect(() => {
    const onMouseMove = function (e: MouseEvent) {
      const offset = viewportToRoot();
      mousePosition.current = {
        x: e.clientX + offset.x,
        y: e.clientY + offset.y,
      };
    };
    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, []);

  const promptListData = useMemo(() => {
    return computePromptListData(promptLists, prompts, inlineReviewModules);
  }, [promptLists, inlineReviewModules, prompts]);

  if (promptLocations === null) return null;

  function onNewPrompt(range: Range) {
    const newPrompt: Prompt = {
      content: {
        front: "",
        back: "",
      },
      selectors: describe(textRoot, range),
      isByAuthor: false,
      isSaved: true,
      isDue: true,
      showAnchors: true,
      creationTimestampMillis: Date.now(),
    };
    const newId = generateUniqueID();
    dispatch(createNewPrompt({ id: newId, prompt: newPrompt }));
    setNewPromptId(newId);
  }

  return (
    <>
      <div
        css={{
          position: "absolute",
          left: 0,
          top: 0,
        }}
      >
        <div
          css={{
            position: "absolute",
            left: selectionPosition?.left ? mousePosition.current?.x ?? 0 : 0,
            top: selectionPosition?.top ? mousePosition.current?.y ?? 0 : 0,
            width: 0,
            height: 0,
            pointerEvents: selectionPosition ? "auto" : "none",
            opacity: selectionPosition ? 1 : 0,
            zIndex: zIndices.orbitMenu,
          }}
        >
          <ContextualMenu
            items={[
              {
                title: "New Prompt",
                onClick: () => {
                  clearSelectionPosition();
                  if (selectionRange) {
                    onNewPrompt(selectionRange);
                  }
                },
                shortcutKey: "N",
                isEnabled: !!selectionPosition,
              },
              ...(suggestedPromptIDs.length > 0
                ? [
                    {
                      title: `Save Suggested Prompt${
                        suggestedPromptIDs.length > 1 ? "s" : ""
                      }`,
                      onClick: () => {
                        clearSelectionPosition();
                        suggestedPromptIDs.forEach((id) =>
                          dispatch(savePrompt(id)),
                        );
                      },
                      shortcutKey: "S",
                      isEnabled: true,
                    },
                  ]
                : []),
            ]}
          />
        </div>
        <PromptLayoutManager
          prompts={prompts}
          promptLocations={promptLocations}
          marginX={marginX}
          newPromptId={newPromptId}
          clearNewPrompt={() => {
            if (newPromptId) {
              const prompt = store.getState().prompts[newPromptId];
              if (prompt.content.front === "" && prompt.content.back === "") {
                dispatch(deletePrompt(newPromptId));
              }
            }
            setNewPromptId(undefined);
          }}
          suggestedPromptIDs={suggestedPromptIDs}
        />
        {modalReviewState?.viewingSourceID && <ContinueModalReviewButton />}
        <>
          {Object.entries(inlineReviewModules).map(([id, reviewModule]) => (
            <div
              key={id}
              css={{
                position: "absolute",
                zIndex: zIndices.displayOverContent,
                pointerEvents: "none",
                ...reviewModule.frame,
              }}
            >
              <InlineReviewOverlay
                reviewModuleID={id}
                promptIDs={reviewModule.promptIDs}
                onContinueReview={() => dispatch(startReviewForAllDuePrompts())}
              />
            </div>
          ))}
        </>
      </div>
      <div
        css={{
          position: "fixed",
          right: 48,
          bottom: 40,
          zIndex: zIndices.orbitMenu,
          pointerEvents: "none",
        }}
      >
        <OrbitMenu />
      </div>
      {modalReviewState && (
        <ModalReview
          key={modalReviewState.mode} /* remount when mode changes */
          {...modalReviewState}
        />
      )}
      {promptListData.map((promptList) => (
        <PromptList
          key={`promptList-${promptList.promptListID}`}
          targetElementID={promptList.promptListID}
          promptLocations={promptLocations}
          promptIDs={promptList.promptIDs}
          inlineReviewID={promptList.inlineReviewID}
        />
      ))}
    </>
  );
}

function computePromptListData(
  promptLists: { [promptListID: string]: PromptListSpec },
  prompts: PromptsState,
  inlineReviewModules: InlineReviewModuleState,
): {
  promptListID: string;
  promptIDs: PromptID[];
  inlineReviewID?: string;
}[] {
  const promptIDsByFrontText: { [frontText: string]: PromptID } = {};
  for (const [id, prompt] of Object.entries(prompts)) {
    promptIDsByFrontText[prompt.content.front] = id;
  }
  return [
    ...Object.entries(promptLists).map(
      ([promptListID, { promptsByFrontText }]) => ({
        promptListID,
        promptIDs: promptsByFrontText.map((frontText) => {
          const id = promptIDsByFrontText[frontText];
          if (!id) {
            throw new Error(`No prompt with front text: ${frontText}`);
          }
          return id;
        }),
      }),
    ),
    ...Object.entries(inlineReviewModules)
      // Include inline review modules which have been "turned into" prompt lists.
      .filter(([, inlineReviewModule]) => !!inlineReviewModule.promptListID)
      .map(([id, inlineReviewModule]) => ({
        promptListID: inlineReviewModule.promptListID!,
        promptIDs: inlineReviewModule.promptIDs,
        inlineReviewID: id,
      })),
  ];
}

function findIntersectingPrompts(
  range: Range,
  locations: { [promptID: string]: PromptLocation },
) {
  if (range.collapsed) return [];
  return Object.keys(locations).filter((id) => {
    const promptRange = locations[id].range;
    // A prompt intersects the range if its start point is before the range's end point, and its end point is after the range's start point
    return (
      promptRange.compareBoundaryPoints(Range.END_TO_START, range) <= 0 &&
      promptRange.compareBoundaryPoints(Range.START_TO_END, range) >= 0
    );
  });
}

function ContinueModalReviewButton() {
  const dispatch = useAppDispatch();
  const y = (getScrollingContainer() as HTMLDivElement).offsetTop + 16;
  return (
    <div
      css={css`
        position: fixed;
        top: ${y}px;
        right: 16px;
      `}
    >
      <Button
        onClick={() => dispatch(resumeReview())}
        icon="rightArrow"
        isFloating
        backgroundColor="var(--accentPrimary)"
        color={LabelColor.White}
      >
        Continue Review
      </Button>
    </div>
  );
}
