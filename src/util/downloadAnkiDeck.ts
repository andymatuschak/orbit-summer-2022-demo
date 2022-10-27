import { saveAs } from "file-saver";
import { getSiteName } from "./getSiteName";

export async function downloadAnkiDeck() {
  const siteName = getSiteName();
  const sitePrompts: any = { siteName, prompts: {}, baseURI: document.baseURI };

  // HACK: accessing redux-persist's data directly because we need to save all prompts for this book, not just the current page's
  const localStorage = window.localStorage;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("persist:")) continue;
    const path = key.split("persist:")[1];
    if (path.split("/")[1] === window.location.pathname.split("/")[1]) {
      sitePrompts.prompts[path] = JSON.parse(
        JSON.parse(localStorage.getItem(key)!).prompts,
      );
    }
  }

  const response = await fetch(
    `${
      process.env["NODE_ENV"] === "production"
        ? "https://orbit-summer-2022-demo-backend.vercel.app"
        : "http://localhost:3010"
    }/api`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sitePrompts),
    },
  );
  if (response.ok) {
    const blob = await response.blob();
    saveAs(blob, `${siteName}.apkg`);
  } else {
    alert(await response.text());
  }
}
