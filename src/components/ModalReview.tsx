import React, { DOMAttributes } from "react";
import ScrollLock from "react-scrolllock";
import zIndices from "./common/zIndices";

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ["orbit-reviewarea"]: CustomElement<HTMLElement>;
    }
  }
}

export interface ModalReviewProps {
  onClose: () => void;
}

export function ModalReview(props: ModalReviewProps) {
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
          backgroundColor: "red",
          zIndex: zIndices.modalReview,
        }}
      >
        <orbit-reviewarea></orbit-reviewarea>
      </div>
    </ScrollLock>
  );
}
