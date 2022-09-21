import React, { useCallback, useEffect, useMemo, useState } from "react";
import { convertIntoPromptList } from "../app/inlineReviewModuleSlice";
import { useAppDispatch, useAppSelector } from "../app/store";
import { CompletedReviewOverlay } from "./CompletedReviewOverlay";

export interface InlineReviewOverlayProps {
  reviewModuleID: string;
  promptIDs: string[];
  onContinueReview: () => void;
}

interface ReviewArea extends HTMLElement {
  onExitReview?: () => void;
  onReviewComplete?: () => void;
}

export function InlineReviewOverlay({
  reviewModuleID,
  promptIDs,
  onContinueReview,
}: InlineReviewOverlayProps) {
  const [showReviewCompleteOverlay, setShowReviewCompleteOverlay] =
    useState(false);
  const duePromptCount = useAppSelector(
    (state) =>
      Object.keys(state.prompts).filter((id) => state.prompts[id].isDue).length,
  );
  const dispatch = useAppDispatch();
  const reviewArea = useMemo(
    () => document.getElementById(reviewModuleID)! as ReviewArea,
    [reviewModuleID],
  );

  const insertPromptList = useCallback(() => {
    const promptListContainer = document.createElement("div");
    promptListContainer.id = `promptList-${Date.now()}`;
    reviewArea.before(promptListContainer);
    reviewArea.style.transition = "opacity 500ms linear";
    reviewArea.style.opacity = "0";
    setTimeout(() => {
      dispatch(
        convertIntoPromptList({
          reviewModuleID,
          promptListID: promptListContainer.id,
        }),
      );
      reviewArea.style.display = "none";
      setShowReviewCompleteOverlay(false);
    }, 300);
  }, [dispatch, reviewArea, reviewModuleID]);

  useEffect(() => {
    reviewArea.onReviewComplete = () => {
      setShowReviewCompleteOverlay(true);
      if (duePromptCount === 0) {
        setTimeout(() => {
          insertPromptList();
        }, 2000);
      }
    };
    reviewArea.onExitReview = insertPromptList;
    return () => {
      reviewArea.onReviewComplete = undefined;
      reviewArea.onExitReview = undefined;
    };
  }, [reviewArea, insertPromptList, duePromptCount]);

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
        isVisible={showReviewCompleteOverlay}
        onClose={() => {}}
        onContinueReview={() => {
          onContinueReview();
          insertPromptList();
        }}
      />
    </div>
  );
}
