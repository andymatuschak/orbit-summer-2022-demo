import React, { DOMAttributes, useState } from "react";
import ScrollLock from "react-scrolllock";
import { useAppSelector } from "../app/store";
import zIndices from "./common/zIndices";

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ["orbit-reviewarea"]: CustomElement<
        HTMLElement & { height?: string; ref: any }
      >;
      ["orbit-prompt"]: CustomElement<{
        question: string;
        answer: string;
        id: string;
      }>;
    }
  }
}

export interface ModalReviewProps {
  onClose: () => void;
}

export function ModalReview(props: ModalReviewProps) {
  const prompts = useAppSelector((state) => state.prompts);

  // A bit of a hack: we tee up the review queue when this component is mounted.
  const [queuedPromptIDs] = useState<string[]>(() => {
    const duePromptIDs = Object.keys(prompts).filter((id) => prompts[id].isDue);
    // TODO shuffle
    return duePromptIDs;
  });

  return (
    <ScrollLock>
      <div
        onClick={props.onClose}
        css={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          backgroundColor: "#ff5252",
          zIndex: zIndices.modalReview,
        }}
      >
        <orbit-reviewarea
          ref={(element: { onExitReview: () => void } | null) => {
            if (element) {
              element.onExitReview = () => {
                props.onClose();
              };
            }
          }}
          height="100vh"
        >
          {queuedPromptIDs.map((id) => (
            <orbit-prompt
              question={prompts[id].content.front}
              answer={prompts[id].content.back}
              id={id}
            ></orbit-prompt>
          ))}
        </orbit-reviewarea>
      </div>
    </ScrollLock>
  );
}
