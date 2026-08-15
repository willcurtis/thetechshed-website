const API_BASE = "https://api.macvendors.com";
const DEFAULT_ORIGINS = "https://thetechshed.dev";

const json = (body, status, origin, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Access-Control-Allow-Origin": origin,
    "Cache-Control": status === 200 ? "public, max-age=86400" : "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  }
});

const normalizeMac = (value) => {
  const clean = (value || "").trim().toUpperCase().replace(/[\s:./-]/g, "");
  if (!/^(?:[0-9A-F]{6}|[0-9A-F]{12})$/.test(clean)) return null;
  return clean.match(/.{2}/g).join(":");
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = new Set((env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map((item) => item.trim()).filter(Boolean));
    if (!allowedOrigins.has(origin)) return new Response("Forbidden", { status: 403 });

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "Access-Control-Allow-Headers": "Accept", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Origin": origin, "Access-Control-Max-Age": "86400", Vary: "Origin" } });
    }
    if (request.method !== "GET") return json({ status: "error", message: "Method not allowed." }, 405, origin, { Allow: "GET, OPTIONS" });

    const url = new URL(request.url);
    if (url.pathname !== "/lookup") return json({ status: "error", message: "Not found." }, 404, origin);
    const mac = normalizeMac(url.searchParams.get("mac"));
    if (!mac) return json({ status: "invalid", message: "Enter exactly 6 or 12 hexadecimal characters." }, 400, origin);

    let upstream;
    try {
      upstream = await fetch(`${API_BASE}/${encodeURIComponent(mac)}`, { headers: { Accept: "text/plain", "User-Agent": "The-Tech-Shed-MAC-Lookup/1.0" }, cf: { cacheEverything: true, cacheTtl: 2592000 } });
    } catch {
      return json({ status: "error", message: "The vendor service could not be reached." }, 502, origin);
    }

    if (upstream.status === 404) return json({ mac, status: "not_found", vendor: null }, 404, origin);
    if (upstream.status === 429) {
      const retryAfter = upstream.headers.get("Retry-After");
      return json({ mac, status: "rate_limited", vendor: null, message: "The vendor service is temporarily rate limited." }, 429, origin, retryAfter ? { "Retry-After": retryAfter } : {});
    }
    if (!upstream.ok) return json({ mac, status: "error", vendor: null, message: "The vendor service returned an error." }, 502, origin);

    const vendor = (await upstream.text()).trim();
    if (!vendor || vendor.length > 300) return json({ mac, status: "error", vendor: null, message: "The vendor service returned an unexpected response." }, 502, origin);
    return json({ mac, status: "found", vendor }, 200, origin);
  }
};
