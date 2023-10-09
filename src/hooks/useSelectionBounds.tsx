import { useEffect, useState } from "react";
import { viewportToRoot } from "../util/viewportToRoot";

export interface SelectionBounds {
  left: number;
  top: number;
  bottom: number;
}

export function useSelectionBounds(textRoot?: Element): {
  selectionPosition: SelectionBounds | null;
  clearSelectionPosition: () => void;
  selectionRange: Range | null;
} {
  const [selectionPosition, setSelectionPosition] =
    useState<SelectionBounds | null>(null);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);

  useEffect(() => {
    const onEnd = (e: MouseEvent) => {
      const selection = document.getSelection();
      if (
        e.target instanceof Node &&
        document.getElementById("demo-root")!.contains(e.target) &&
        (!textRoot || !textRoot.contains(e.target))
      ) {
        setSelectionPosition(null);
      } else if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const offset = viewportToRoot();
        setSelectionPosition({
          left:
            e.pageX > rect.right
              ? rect.right
              : e.pageX < rect.left
              ? rect.left
              : e.pageX,
          top: offset.y + rect.top,
          bottom: offset.y + rect.bottom,
        });
        setSelectionRange(range);
      }
    };

    const onChange = () => {
      const selection = document.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionPosition(null);
        setSelectionRange(null);
      }
    };

    const onSelectStart = (e: Event) => {
      if (
        e.target instanceof Node &&
        (!document.getElementById("demo-root")!.contains(e.target) ||
          textRoot?.contains(e.target))
      ) {
        document.addEventListener("mouseup", onEnd);
        document.addEventListener("selectionchange", onChange);
      }
    };

    document.addEventListener("selectstart", onSelectStart);
    return () => {
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("selectionchange", onChange);
    };
  }, [textRoot]);

  return {
    selectionPosition,
    selectionRange,
    clearSelectionPosition: () => setSelectionPosition(null),
  };
}
