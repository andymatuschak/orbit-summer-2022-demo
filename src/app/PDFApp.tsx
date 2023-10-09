import React, { useCallback } from "react";
import { useAuthorSaveDataFeature } from "../hooks/useAuthorSaveDataFeature";
import { useLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import { viewportToRoot } from "../util/viewportToRoot";
import App from "./App";

export default function PDFApp() {
  const markerX = useLayoutDependentValue(
    useCallback(() => {
      const main = document.getElementById("viewer")!;
      const rect = main.children.item(0)!.getBoundingClientRect();
      return rect.right + viewportToRoot().x + 12;
    }, []),
  );

  useAuthorSaveDataFeature(document.title);

  return (
    <App
      marginX={markerX}
      textRoot={document.getElementById("viewer")!}
      promptLists={{}}
    />
  );
}
