import { useEffect } from "react";
import { updateReviewModuleFrames } from "../app/inlineReviewModuleSlice";
import { syncPromptFromReview } from "../app/promptSlice";
import { useAppDispatch } from "../app/store";

export function useReviewAreaIntegration() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    function onMessage(message: MessageEvent) {
      const data = message.data as any;
      if (data && data.type === "taskUpdate") {
        const taskState =
          data.task.componentStates["main"] ?? data.task.componentStates[0];

        const wasSkipped = taskState?.lastRepetitionTimestampMillis === null;
        const interval = taskState?.intervalMillis === 0 ? 0 : 7;
        const id = data.task.metadata.externalID ?? data.task.id;

        const sourceReviewAreaID = [
          ...document.getElementsByTagName("orbit-reviewarea"),
        ].find(
          (element: Element) =>
            (element as any).iframe.contentWindow === message.source,
        )?.id;
        if (!sourceReviewAreaID) {
          console.warn("Couldn't find review area source for IPC");
          return;
        }

        dispatch(
          syncPromptFromReview({
            id,
            wasSkipped,
            newInterval: interval,
            sourceReviewAreaID,
          }),
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
