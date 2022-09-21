import React, { useCallback, useEffect, useState, useRef } from "react";
import uuidBase64 from "../components/common/uuid";
import zIndices from "../components/common/zIndices";
import ContextualMenu from "../components/ContextualMenu";
import { InlineReviewOverlay } from "../components/InlineReviewOverlay";
import { ModalReview, ModalReviewState } from "../components/ModalReview";
import { OrbitMenu } from "../components/OrbitMenu";
import { PromptLayoutManager } from "../components/prompt/PromptLayoutManager";
import { PromptList, PromptListSpec } from "../components/prompt/PromptList";
import { useAsyncLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import { useReviewAreaIntegration } from "../hooks/useReviewAreaIntegration";
import { useSelectionBounds } from "../hooks/useSelectionBounds";
import { resolvePromptLocations } from "../util/resolvePromptLocations";
import { describe } from "../vendor/hypothesis-annotator/html";
import { createNewPrompt, Prompt } from "./promptSlice";
import { useAppDispatch, useAppSelector } from "./store";

export interface AppProps {
  marginX: number;
  textRoot: Element;
  promptLists: { [elementID: string]: PromptListSpec };
}

export default function App({ marginX, textRoot, promptLists }: AppProps) {
  const prompts = useAppSelector((state) => state.prompts);
  const inlineReviewModules = useAppSelector(
    (state) => state.inlineReviewModules,
  );
  useReviewAreaIntegration();

  // HACK HACK: when orbit-reviewarea lays out, it'll move prompts down the page. Lay out again a couple seconds after load...
  const [promptRelayoutTime, setPromptRelayoutTime] = useState(0);
  useEffect(() => {
    setTimeout(() => {
      setPromptRelayoutTime(Date.now());
    }, 2000);
  }, []);

  const promptLocations = useAsyncLayoutDependentValue(
    null,
    useCallback(async () => {
      // noinspection JSUnusedLocalSymbols
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const unused = promptRelayoutTime;
      if (Object.keys(prompts).length > 0) {
        return await resolvePromptLocations(prompts);
      } else {
        return null;
      }
      // TODO: We don't really want to rerun this every time `prompts` changes. Think more carefully about this...
    }, [prompts, promptRelayoutTime]),
  );

  const dispatch = useAppDispatch();

  const { selectionPosition, selectionRange, clearSelectionPosition } =
    useSelectionBounds();
  const [modalReviewState, setModalReviewState] =
    useState<ModalReviewState | null>(null);

  const [newPromptId, setNewPromptId] = useState<string | undefined>();
  const mousePosition = useRef<{ x: number; y: number }>();

  // Listen to mouse events for context menu
  useEffect(() => {
    const onMouseMove = function (e: MouseEvent) {
      const newMousePosition = {
        x: e.clientX + window.scrollX,
        y: e.clientY + window.scrollY,
      };
      mousePosition.current = newMousePosition;
    };
    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, []);

  function onModalReviewComplete(
    reviewAreaID: string,
    nextState: ModalReviewState | null,
  ) {
    if (modalReviewState?.mode === "list") {
      modalReviewState.onReviewExit(reviewAreaID);
    }
    setModalReviewState(nextState);
  }

  if (!promptLocations) return null;
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
                title: "New prompt",
                onClick: () => {
                  clearSelectionPosition();
                  if (selectionRange) {
                    const newPrompt: Prompt = {
                      content: {
                        front: "",
                        back: "",
                      },
                      selectors: describe(textRoot, selectionRange),
                      isByAuthor: false,
                      isSaved: true,
                      isDue: true,
                    };
                    const newId = uuidBase64();
                    dispatch(createNewPrompt({ id: newId, prompt: newPrompt }));
                    setNewPromptId(newId);
                  }
                },
                shortcutKey: "N",
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
        />
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
                onContinueReview={() => setModalReviewState({ mode: "user" })}
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
        }}
      >
        <OrbitMenu
          onStartReview={() =>
            setModalReviewState(
              { mode: "user" },
              // To test the list mode upsell behavior:
              /*{
              mode: "list",
              promptIDs: ["Why keep shaped work rough?"],
            }*/
            )
          }
        />
      </div>
      {modalReviewState && (
        <ModalReview
          key={modalReviewState.mode} /* remount when mode changes */
          onClose={(id) => onModalReviewComplete(id, null)}
          onContinueReview={(id) => onModalReviewComplete(id, { mode: "user" })}
          {...modalReviewState}
        />
      )}
      {promptLists &&
        [
          ...Object.entries(promptLists),
          ...Object.entries(inlineReviewModules)
            // Include inline review modules which have been "turned into" prompt lists.
            .filter(
              ([id, inlineReviewModule]) => !!inlineReviewModule.promptListID,
            )
            .map(
              ([id, inlineReviewModule]) =>
                [
                  inlineReviewModule.promptListID!,
                  {
                    promptIDs: inlineReviewModule.promptIDs,
                    inlineReviewID: id,
                  },
                ] as const,
            ),
        ].map(([id, spec]) => (
          <PromptList
            key={`promptList-${id}`}
            targetElementID={id}
            onStartReview={(onReviewExit) =>
              setModalReviewState({
                mode: "list",
                promptIDs: spec.promptIDs,
                onReviewExit,
              })
            }
            {...spec}
          />
        ))}
    </>
  );
}
