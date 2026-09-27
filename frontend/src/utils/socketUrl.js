const DEFAULT_API_URL = "http://localhost:5000/api";

export const getSocketServerUrl = (apiUrl = process.env.REACT_APP_API_URL) => {
  const rawUrl = (apiUrl || DEFAULT_API_URL).trim();

  if (!rawUrl) {
    return DEFAULT_API_URL.replace(/\/api$/, "");
  }

  try {
    const baseUrl =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "http://localhost";
    const url = new URL(rawUrl, baseUrl);
    const pathname = url.pathname.replace(/\/+$/, "");

    if (pathname === "/api") {
      url.pathname = "/";
    }

    url.search = "";
    url.hash = "";

    return url.toString().replace(/\/+$/, "");
  } catch (_error) {
    const normalizedUrl = rawUrl.replace(/\/+$/, "");
    return normalizedUrl.endsWith("/api")
      ? normalizedUrl.slice(0, -4) || "/"
      : normalizedUrl;
  }
};
