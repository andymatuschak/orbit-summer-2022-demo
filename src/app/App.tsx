import React, { useCallback } from "react";
import PrototypeUI from "../components/PrototypeUI";
import { useAsyncLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import { resolvePromptLocations } from "../util/resolvePromptLocations";
import { useAppSelector } from "./store";

export interface AppProps {
  marginX: number;
}

export default function App({ marginX }: AppProps) {
  const prompts = useAppSelector((state) => state.prompts);

  const promptLocations = useAsyncLayoutDependentValue(
    null,
    useCallback(async () => {
      if (Object.keys(prompts).length > 0) {
        return await resolvePromptLocations(prompts);
      } else {
        return null;
      }
      // TODO: We don't really want to rerun this every time `prompts` changes. Think more carefully about this...
    }, [prompts]),
  );

  if (promptLocations) {
    return <PrototypeUI marginX={marginX} promptLocations={promptLocations} />;
  } else {
    return null;
  }
}
