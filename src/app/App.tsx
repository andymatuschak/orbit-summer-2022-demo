import { css } from "@emotion/react";
import { generateUniqueID } from "@withorbit/core";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "../components/Button";
import zIndices from "../components/common/zIndices";
import ContextualMenu from "../components/ContextualMenu";
import { ModalReview } from "../components/ModalReview";
import { OrbitMenu } from "../components/OrbitMenu";
import { PromptLayoutManager } from "../components/prompt/PromptLayoutManager";
import { PromptList } from "../components/prompt/PromptList";
import { LabelColor } from "../components/Type";
import { usePromptLocations } from "../hooks/usePromptLocations";
import { useSelectionBounds } from "../hooks/useSelectionBounds";
import { getScrollingContainer, viewportToRoot } from "../util/viewportToRoot";
import { describe } from "../vendor/hypothesis-annotator/html";
import { InlineReviewModuleState } from "./inlineReviewModuleSlice";
import { resumeReview } from "./modalReviewSlice";
import {
  AnnotationType,
  createNewPrompt,
  Prompt,
  PromptID,
  PromptsState,
} from "./promptSlice";
import { useAppDispatch, useAppSelector } from "./store";

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
  const suggestedPromptIDs = useMemo(() => [], []); // disabled this functionality...

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

  function onAnnotate(annotationType: AnnotationType) {
    clearSelectionPosition();
    if (!selectionRange) {
      return;
    }

    const newPrompt: Prompt = {
      content: {
        front: "",
        back: "",
      },
      selectors: describe(textRoot, selectionRange),
      isByAuthor: false,
      isSaved: true,
      isDue: false,
      showAnchors: true,
      creationTimestampMillis: Date.now(),
      annotationType,
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
                title: "Highlight",
                onClick: () => onAnnotate(AnnotationType.Highlight),
                shortcutKey: "H",
                isEnabled: !!selectionPosition,
              },
              {
                title: "Mark for Review",
                onClick: () => onAnnotate(AnnotationType.ForReview),
                shortcutKey: "M",
                isEnabled: !!selectionPosition,
              },
            ]}
          />
        </div>
        <PromptLayoutManager
          prompts={prompts}
          promptLocations={promptLocations}
          marginX={marginX}
          newPromptId={newPromptId}
          clearNewPrompt={() => setNewPromptId(undefined)}
          suggestedPromptIDs={suggestedPromptIDs}
          onAddComment={(id) => setNewPromptId(id)}
        />
        {modalReviewState?.viewingSourceID && <ContinueModalReviewButton />}
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
      {modalReviewState && <ModalReview {...modalReviewState} />}
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
