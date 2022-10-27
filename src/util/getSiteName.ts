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
  } else {
    throw new Error(`Unknown site name ${sitePathComponent}`);
  }
}
