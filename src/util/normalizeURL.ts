// This is an extremely inadequate implementation, good enough for now.
// See e.g. Hypothes.is's thoughtful implementation: https://github.com/hypothesis/h/blob/b4fd0d88e7600958f81b0c8088584bc9592dd420/h/util/uri.py
export function normalizeURL(url: string) {
  const workingURL = new URL(url);
  workingURL.hash = "";
  if (workingURL.pathname.endsWith("/")) {
    workingURL.pathname = workingURL.pathname.slice(0, -1);
  }
  return workingURL.href;
}
