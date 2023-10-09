import { saveAs } from "file-saver";
import { getPersistenceKey } from "../app/store";
import { prototypeBackendBaseURL } from "../config";
import { getDocumentTitle, getSiteName } from "./siteMetadata";

export async function downloadAnkiDeck() {
  const siteName = getSiteName();
  const documentTitle = getDocumentTitle();
  const sourceLabel = siteName
    ? `${siteName} - ${documentTitle}`
    : documentTitle;
  const sitePrompts: any = {
    sourceLabel,
    deckName: siteName ? `${siteName}::${documentTitle}` : documentTitle,
    prompts: {},
    baseURI: document.baseURI,
  };

  // HACK: accessing redux-persist's data directly because we need to save all prompts for this book, not just the current page's
  const localStorage = window.localStorage;
  const currentPersistenceKey = getPersistenceKey();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("persist:")) continue;
    const persistenceKey = key.split("persist:")[1];
    if (persistenceKey === currentPersistenceKey) {
      sitePrompts.prompts[persistenceKey] = JSON.parse(
        JSON.parse(localStorage.getItem(key)!).prompts,
      );
    }
  }

  const response = await fetch(prototypeBackendBaseURL + "/exportAnkiDeck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sitePrompts),
  });
  if (response.ok) {
    const blob = await response.blob();
    saveAs(blob, `${sourceLabel}.apkg`);
  } else {
    alert(await response.text());
  }
}
