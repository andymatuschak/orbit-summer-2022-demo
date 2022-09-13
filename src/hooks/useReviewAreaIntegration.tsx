import { useEffect } from "react";
import { updateReviewModuleFrames } from "../app/inlineReviewModuleSlice";
import { syncPromptFromReview } from "../app/promptSlice";
import { useAppDispatch } from "../app/store";

export function useReviewAreaIntegration() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    function onMessage(message: any) {
      if (message.data && message.data.type === "taskUpdate") {
        const taskState =
          message.data.task.componentStates["main"] ??
          message.data.task.componentStates[0];

        const wasSkipped = taskState?.lastRepetitionTimestampMillis === null;
        const interval = taskState?.intervalMillis === 0 ? 0 : 7;
        const id =
          message.data.task.metadata.externalID ?? message.data.task.id;

        dispatch(
          syncPromptFromReview({ id, wasSkipped, newInterval: interval }),
        );
      }
    }

    function onResize() {
      dispatch(updateReviewModuleFrames());
    }

    window.addEventListener("message", onMessage);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("resize", onResize);
    };
  }, [dispatch]);
}
