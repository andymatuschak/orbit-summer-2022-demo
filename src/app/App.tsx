import React, { useCallback, useState } from "react";
import uuidBase64 from "../components/common/uuid";
import zIndices from "../components/common/zIndices";
import ContextualMenu from "../components/ContextualMenu";
import { InlineReviewOverlay } from "../components/InlineReviewOverlay";
import { ModalReview, ModalReviewState } from "../components/ModalReview";
import { OrbitMenu } from "../components/OrbitMenu";
import { PromptLayoutManager } from "../components/prompt/PromptLayoutManager";
import { useAsyncLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import { usePageHeight } from "../hooks/usePageHeight";
import { useReviewAreaIntegration } from "../hooks/useReviewAreaIntegration";
import { useSelectionBounds } from "../hooks/useSelectionBounds";
import { resolvePromptLocations } from "../util/resolvePromptLocations";
import { describe } from "../vendor/hypothesis-annotator/html";
import {
  createNewPrompt,
  Prompt,
} from "./promptSlice";
import { useAppDispatch, useAppSelector } from "./store";

export interface AppProps {
  marginX: number;
  textRoot: Element;
}

export default function App({ marginX, textRoot }: AppProps) {
  const prompts = useAppSelector((state) => state.prompts);
  const inlineReviewModules = useAppSelector(
    (state) => state.inlineReviewModules,
  );
  useReviewAreaIntegration();

  const promptLocations = useAsyncLayoutDependentValue(
    null,
    useCallback(async () => {
      if (Object.keys(prompts).length > 0) {
        return await resolvePromptLocations(prompts);
      } else {
        return null;
      }
      // TODO: We don't really want to rerun this every time `prompts` changes. Think more carefully about this...
    }, [prompts]),
  );

  const dispatch = useAppDispatch();
  const height = usePageHeight();

  const { selectionPosition, selectionRange, clearSelectionPosition } =
    useSelectionBounds();
  const [modalReviewState, setModalReviewState] =
    useState<ModalReviewState | null>(null);

  const [newPromptId, setNewPromptId] = useState<string | undefined>();

  if (!promptLocations) return null;
  return (
    <>
      <div
        css={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          height,
        }}
      >
        <div
          css={{
            position: "absolute",
            left: selectionPosition?.left ?? 0,
            top: selectionPosition?.top ?? 0,
            width: 0,
            height: 0,
            pointerEvents: selectionPosition ? "auto" : "none",
            opacity: selectionPosition ? 1 : 0,
            zIndex: zIndices.displayOverContent,
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
              <InlineReviewOverlay reviewModuleID={id} />
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
          onClose={() => setModalReviewState(null)}
          onContinueReview={function () {
            setModalReviewState({ mode: "user" });
          }}
          {...modalReviewState}
        />
      )}
    </>
  );
}
