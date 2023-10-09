export function getSiteName() {
  const sitePathComponent = window.location.pathname.split("/")[1];
  if (sitePathComponent === "ims") {
    return "Intro to Modern Statistics";
  } else if (sitePathComponent === "shape-up") {
    return "Shape Up";
  } else if (window.location.pathname.startsWith("/sh/br")) {
    return "Bounded Regret";
  } else if (window.location.pathname.startsWith("/sh/da")) {
    return "Delta Academy";
  } else if (window.location.pathname.startsWith("/pdf")) {
    const url = new URL(window.location.href);
    const file = url.searchParams.get("file");
    if (file?.startsWith("/mk/physics")) {
      return "University Physics";
    } else if (file?.startsWith("/mk/griffiths")) {
      return "Griffiths IQM";
    } else {
      return undefined;
    }
  }
  throw new Error(`Unknown site name ${sitePathComponent}`);
}

export function getDocumentTitle() {
  if (window.location.pathname.startsWith("/pdf")) {
    const url = new URL(window.location.href);
    const file = url.searchParams.get("file");
    if (file?.startsWith("/mk/physics") || file?.startsWith("/mk/griffiths")) {
      const components = file!.split("/");
      const lastComponent = components[components.length - 1];
      const filenameMatch = lastComponent.match(/^(.+?)\.pdf$/);
      if (filenameMatch) {
        return `Chapter ${filenameMatch[1]}`;
      }
    } else {
      try {
        // @ts-ignore
        return PDFViewerApplication.documentInfo["Title"] ?? "Untitled PDF";
      } catch (e) {
        console.error("Couldn't get PDF title");
        return "Untitled PDF";
      }
    }
  }
  return document.title;
}
