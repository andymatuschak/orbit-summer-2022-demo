import { useEffect } from "react";
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

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [dispatch]);
}
