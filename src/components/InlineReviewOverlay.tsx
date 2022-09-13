import React, { useEffect, useState } from "react";
import { CompletedReviewOverlay } from "./CompletedReviewOverlay";

export interface InlineReviewOverlayProps {
  reviewModuleID: string;
}

interface ReviewArea extends HTMLElement {
  onExitReview: () => void;
  onReviewComplete: () => void;
}

export function InlineReviewOverlay({
  reviewModuleID,
}: InlineReviewOverlayProps) {
  const [isReviewComplete, setReviewComplete] = useState(false);

  useEffect(() => {
    const reviewArea = document.getElementById(reviewModuleID)! as ReviewArea;
    reviewArea.onReviewComplete = () => setReviewComplete(true);
  }, [reviewModuleID]);

  return (
    <div
      css={{
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <CompletedReviewOverlay
        mode="list"
        context="inline"
        isReviewComplete={isReviewComplete}
        onClose={() => {
          // TODO - remove review area and replace with prompt list module
          alert("UNIMPLEMENTED");
        }}
        onContinueReview={() => {
          // TODO - place another review area on top containing the relevant prompts
          alert("UNIMPLEMENTED");
        }}
      />
    </div>
  );
}
