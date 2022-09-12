import React, { useState } from "react";
import { savePrompt, updatePromptFront, updatePromptBack, Prompt, createNewPrompt, PromptsState, markAsNotNew } from "../app/promptSlice";
import { useAppDispatch, useAppSelector } from "../app/store";
import { usePageHeight } from "../hooks/usePageHeight";
import { useSelectionBounds } from "../hooks/useSelectionBounds";
import { PromptLocation } from "../util/resolvePromptLocations";
import ContextualMenu from "./ContextualMenu";
import { ModalReview } from "./ModalReview";
import { OrbitMenu } from "./OrbitMenu";
import PromptBox from "./PromptBox";
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

  const { selectionPosition, selectionRange, clearSelectionPosition } = useSelectionBounds();
  const [isModalReviewActive, setModalReviewActive] = useState(false);

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
                  if (selectionRange){
                    const newPrompt: Prompt = {
                      content: {
                        front: "",
                        back: "",
                      },
                      selectors: describe(textRoot, selectionRange),
                      isByAuthor: false,
                      isSaved: true,
                      isDue: true,
                      isNew: true,
                    }
                    dispatch(createNewPrompt({id: uuidBase64(), prompt: newPrompt}));
                  }
                },
                shortcutKey: "N",
                isEnabled: selectionPosition ? true : false,
              },
            ]}
          />
        </div>
        <>
          {Object.entries(prompts).map(([id, prompt]) => {

            // Mark as not new if it is, prompts are only new once :) 
            if (prompt.isNew) {
              dispatch(markAsNotNew(id));
            }

            return (
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
                  savePrompt={() => dispatch(savePrompt(id))}
                  updatePromptFront={(newPrompt) => dispatch(updatePromptFront([id, newPrompt]))}
                  updatePromptBack={(newPrompt) => dispatch(updatePromptBack([id, newPrompt]))}
                />
              </div>
            );
          })}
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
        <OrbitMenu onStartReview={() => setModalReviewActive(true)} />
      </div>
      {isModalReviewActive && (
        <ModalReview onClose={() => setModalReviewActive(false)} />
      )}
    </>
  );
}
