import { useEffect, useState } from "react";

export interface SelectionBounds {
  left: number;
  top: number;
  bottom: number;
}

export function useSelectionBounds(): {
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
      if (e.target instanceof Node && document.getElementById("demo-root")!.contains(e.target)){
        setSelectionPosition(null);
      } else if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionPosition({
          left:
            e.pageX > rect.right
              ? rect.right
              : e.pageX < rect.left
              ? rect.left
              : e.pageX,
          top: window.scrollY + rect.top,
          bottom: window.scrollY + rect.bottom,
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
        !document.getElementById("demo-root")!.contains(e.target)
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
  }, []);
  
  return {
    selectionPosition,
    selectionRange,
    clearSelectionPosition: () => setSelectionPosition(null),
  };
}
