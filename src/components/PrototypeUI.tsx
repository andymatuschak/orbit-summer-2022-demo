import React, { useState } from "react";
import { savePrompt } from "../app/promptSlice";
import { useAppDispatch, useAppSelector } from "../app/store";
import { usePageHeight } from "../hooks/usePageHeight";
import { useSelectionBounds } from "../hooks/useSelectionBounds";
import { PromptLocation } from "../util/resolvePromptLocations";
import ContextualMenu from "./ContextualMenu";
import { ModalReview } from "./ModalReview";
import { OrbitMenu } from "./OrbitMenu";
import PromptBox from "./PromptBox";
import zIndices from "./common/zIndices";

export interface DemoPageProps {
  marginX: number;
  promptLocations: { [id: string]: PromptLocation };
}

export default function PrototypeUI({
  marginX,
  promptLocations,
}: DemoPageProps) {
  const prompts = useAppSelector((state) => state.prompts);
  const dispatch = useAppDispatch();
  const height = usePageHeight();

  const { selectionPosition, clearSelectionPosition } = useSelectionBounds();
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
                  // TODO: implement adding new prompt
                },
                shortcutKey: "N",
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
                top: promptLocations[id].top,
              }}
            >
              <PromptBox
                prompt={prompt}
                savePrompt={() => dispatch(savePrompt(id))}
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
        <OrbitMenu onStartReview={() => setModalReviewActive(true)} />
      </div>
      {isModalReviewActive && (
        <ModalReview onClose={() => setModalReviewActive(false)} />
      )}
    </>
  );
}
