import { useEffect, useState } from "react";

export function usePageHeight() {
  const [pageHeight, setPageHeight] = useState<number>(
    document.body.clientHeight
  );

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) =>
      setPageHeight(entries[0].target.clientHeight)
    );
    resizeObserver.observe(document.body);
    return () => resizeObserver.disconnect();
  }, []);

  return pageHeight;
}
