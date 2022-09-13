import React, { useEffect, useState } from "react";
import {
  createNewPrompt,
  Prompt,
  PromptsState,
  savePrompt,
  updatePromptBack,
  updatePromptFront,
} from "../app/promptSlice";
import { useAppDispatch } from "../app/store";
import { usePageHeight } from "../hooks/usePageHeight";
import { useSelectionBounds } from "../hooks/useSelectionBounds";
import { PromptLocation } from "../util/resolvePromptLocations";
import ContextualMenu from "./ContextualMenu";
import { ModalReview, ModalReviewState } from "./ModalReview";
import { OrbitMenu } from "./OrbitMenu";
import PromptBox from "./prompt/PromptBox";
import zIndices from "./common/zIndices";
import { describe } from "../vendor/hypothesis-annotator/html";
import uuidBase64 from "./common/uuid";

export interface DemoPageProps {
  marginX: number;
  promptLocations: { [id: string]: PromptLocation };
  prompts: PromptsState;
  textRoot: Element;
}

export default function PrototypeUI({
  marginX,
  promptLocations,
  prompts,
  textRoot,
}: DemoPageProps) {
  const dispatch = useAppDispatch();
  const height = usePageHeight();

  const { selectionPosition, selectionRange, clearSelectionPosition } =
    useSelectionBounds();
  const [modalReviewState, setModalReviewState] =
    useState<ModalReviewState | null>(null);

  const [newPromptId, setNewPromptId] = useState<string | undefined>();

  useEffect(() => {
    if (newPromptId) {
      setNewPromptId(undefined);
    }
  }, [newPromptId]);

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
        <>
          {Object.entries(prompts).map(([id, prompt]) => (
            <div
              key={id}
              css={{
                position: "absolute",
                left: marginX,
                top: promptLocations[id]?.top,
              }}
            >
              <PromptBox
                prompt={prompt}
                isNew={id === newPromptId}
                savePrompt={() => dispatch(savePrompt(id))}
                updatePromptFront={(newPrompt) =>
                  dispatch(updatePromptFront([id, newPrompt]))
                }
                updatePromptBack={(newPrompt) =>
                  dispatch(updatePromptBack([id, newPrompt]))
                }
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
