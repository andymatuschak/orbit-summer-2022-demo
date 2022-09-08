import React from "react";
import { Store } from "../app/store";
import { PromptLocation } from "../util/resolvePromptLocations";
import ContextualMenu from "./ContextualMenu";
import { usePageHeight } from "../hooks/usePageHeight";
import { useSelectionBounds } from "../hooks/useSelectionBounds";
import PromptBox from "./PromptBox";

export interface DemoPageProps {
  marginX: number;
  store: Store;
  promptLocations: { [id: string]: PromptLocation };
}

export default function PrototypeUI({
  marginX,
  store,
  promptLocations,
}: DemoPageProps) {
  const height = usePageHeight();
  const { selectionPosition, clearSelectionPosition } = useSelectionBounds();

  return (
    <div
      css={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        height,
        // zIndex: 10000,
        // pointerEvents: "none",
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
          />
        </div>
        ))}
      </>
    </div>
  );
}
