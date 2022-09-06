import { useEffect } from "react";

export function useResizeHandler(onResize: () => void) {
  useEffect(() => {
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [onResize]);
}
