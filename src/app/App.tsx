import React, { useCallback} from "react";
import PrototypeUI from "../components/PrototypeUI";
import { useAsyncLayoutDependentValue } from "../hooks/useLayoutDependentValue";
import { useStore } from "../hooks/useStore";
import { resolvePromptLocations } from "../util/resolvePromptLocations";

export interface AppProps {
  marginX: number;
}

export default function App({ marginX }: AppProps) {
  const [store, setStore] = useStore();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const promptLocations = useAsyncLayoutDependentValue(
    null,
    useCallback(async () => {
      if (!store) return null;
      return await resolvePromptLocations(store.prompts);
      // TODO: We don't really want to rerun this every time `store` changes. Think more carefully about this...
    }, [store]),
  );

  console.log(promptLocations);

  if (store && promptLocations) {
    return (
      <PrototypeUI
        marginX={marginX}
        store={store /* TODO: use context provider, etc */}
        setStore={setStore}
        promptLocations={promptLocations}
      />
    );
  } else {
    return null;
  }
}
