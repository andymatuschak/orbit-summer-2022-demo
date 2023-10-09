export function isPDF() {
  // @ts-ignore
  return typeof window.PDFViewerApplication !== "undefined";
}
