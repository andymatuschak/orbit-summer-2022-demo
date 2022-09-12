import React, { useCallback } from "react";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import App from "./App";

export default function IMSApp() {
  const markerX = useLayoutDependentValue(
    useCallback(() => {
      const main = document.getElementById("content")!;
      const rect = main.children.item(0)!.getBoundingClientRect();
      return rect.right + 16;
    }, []),
  );

  return <App marginX={markerX} textRoot={document.getElementById("content")!}/>;
}
