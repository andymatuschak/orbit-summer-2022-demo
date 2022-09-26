import { saveAs } from "file-saver";

export async function downloadAnkiDeck() {
  const sitePathComponent = window.location.pathname.split("/")[1];
  let siteName: string;
  if (sitePathComponent === "ims") {
    siteName = "Intro to Modern Statistics";
  } else if (sitePathComponent === "shape-up") {
    siteName = "Shape Up";
  } else {
    throw new Error(`Unknown site name ${sitePathComponent}`);
  }
  const sitePrompts: any = { siteName, prompts: {}, baseURI: document.baseURI };

  // HACK: accessing redux-persist's data directly because we need to save all prompts for this book, not just the current page's
  const localStorage = window.localStorage;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("persist:")) continue;
    const path = key.split("persist:")[1];
    if (path.split("/")[1] === sitePathComponent) {
      sitePrompts.prompts[path] = JSON.parse(
        JSON.parse(localStorage.getItem(key)!).prompts,
      );
    }
  }
  const response = await fetch("http://localhost:3010/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sitePrompts),
  });
  if (response.ok) {
    const blob = await response.blob();
    saveAs(blob, `${siteName}.apkg`);
  } else {
    alert(await response.text());
  }
}
