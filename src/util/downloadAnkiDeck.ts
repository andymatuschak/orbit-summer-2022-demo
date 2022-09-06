import { saveAs } from "file-saver";

export async function downloadAnkiDeck(siteName: string) {
  const savedState = {}; // TODO: Update for summer demo data wiring
  if (savedState) {
    const response = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(savedState),
    });
    if (response.ok) {
      const blob = await response.blob();
      saveAs(blob, `${siteName}.apkg`);
    } else {
      alert(await response.text());
    }
  }
}
