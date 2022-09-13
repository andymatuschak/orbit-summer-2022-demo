import React, { DOMAttributes, useState } from "react";
import ScrollLock from "react-scrolllock";
import { useAppSelector } from "../app/store";
import zIndices from "./common/zIndices";

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;

declare global {
  namespace JSX {
    // noinspection JSUnusedGlobalSymbols
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
  const [isReviewComplete, setReviewComplete] = useState(false);

  // A bit of a hack: we tee up the review queue when this component is mounted.
  const [queuedPromptIDs] = useState<string[]>(() => {
    // TODO shuffle
    return Object.keys(prompts).filter((id) => prompts[id].isDue);
  });

  function onReviewComplete() {
    setReviewComplete(true);
  }

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
          ref={(
            element: {
              onExitReview: () => void;
              onReviewComplete: () => void;
            } | null,
          ) => {
            if (element) {
              element.onExitReview = () => {
                props.onClose();
              };

              element.onReviewComplete = onReviewComplete;
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
        {
          <div
            css={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              paddingBottom: 64, // shift a bit off-center
              opacity: isReviewComplete ? 1 : 0,
              pointerEvents: isReviewComplete ? "all" : "none",
              transition: "opacity 0.25s 650ms linear",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              css={{
                textAlign: "center",
                fontFamily: "Dr-Medium",
                fontSize: 48,
                lineHeight: "40px",
                letterSpacing: "-0.01em",
                color: "var(--fgPrimary)",
              }}
            >
              Review complete
            </div>
          </div>
        }
      </div>
    </ScrollLock>
  );
}
