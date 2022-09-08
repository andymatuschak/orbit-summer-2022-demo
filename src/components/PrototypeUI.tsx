import React, { useCallback } from "react";
import { Store } from "../app/store";
import { PromptLocation } from "../util/resolvePromptLocations";
import ContextualMenu from "./ContextualMenu";
import { usePageHeight } from "../hooks/usePageHeight";
import { useSelectionBounds } from "../hooks/useSelectionBounds";
import PromptBox from "./PromptBox";
import { useStore } from "../hooks/useStore";
import { Prompt } from "../app/promptSlice";

export interface DemoPageProps {
  marginX: number;
  store: Store;
  setStore: React.Dispatch<React.SetStateAction<Store | null | undefined>>
  promptLocations: { [id: string]: PromptLocation };
}

export default function PrototypeUI({
  marginX,
  store,
  setStore,
  promptLocations,
}: DemoPageProps) {
  const height = usePageHeight();
  const { selectionPosition, clearSelectionPosition } = useSelectionBounds();

  const savePrompt = useCallback((updatedPrompt: Prompt) => {
    updatedPrompt.isSaved = true;
    // Rebuild store for react. TODO: Do this properly using state management libs
    const newStore: Store = {
      prompts: {}
    };
    Object.entries(store.prompts).map(([id, p]) => {
      newStore.prompts[id] = p;
    });
    setStore(newStore);
  }, []);

  return (
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
        }}
      >
        <ContextualMenu
          position="center"
          items={[
            {
              title: "New prompt",
              onClick: () => {
                clearSelectionPosition();
                // TODO: implement adding new prompt
              },
            },
          ]}
        />
      </div>
      <>
        {Object.entries(store.prompts).map(([id, prompt]) => (
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
              savePrompt={() => savePrompt(prompt)}
          />
        </div>
        ))}
      </>
    </div>
  );
}
