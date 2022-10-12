import React, { useCallback } from "react";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import App from "./App";

export default function BRApp() {
  const markerX = useLayoutDependentValue(
    useCallback(() => {
      const main = document.getElementsByTagName("article").item(0)!;
      const rect = main.children.item(0)!.getBoundingClientRect();
      return rect.right + 16;
    }, []),
  );

  return (
    <App
      marginX={markerX}
      textRoot={document.getElementById("content")!}
      promptLists={{}}
    />
  );
}
