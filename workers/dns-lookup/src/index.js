const DNS_ENDPOINT = "https://cloudflare-dns.com/dns-query";
const DEFAULT_ORIGINS = "https://thetechshed.dev";
const RECORD_TYPES = Object.freeze({ A: 1, NS: 2, CNAME: 5, SOA: 6, PTR: 12, MX: 15, TXT: 16, AAAA: 28, SRV: 33, DS: 43, DNSKEY: 48, HTTPS: 65, CAA: 257 });
const TYPE_NAMES = Object.freeze({
  ...Object.fromEntries(Object.entries(RECORD_TYPES).map(([name, value]) => [value, name])),
  46: "RRSIG"
});
const STATUS_NAMES = Object.freeze({ 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 4: "NOTIMP", 5: "REFUSED" });

const json = (body, status, origin, cacheControl = "no-store") => new Response(JSON.stringify(body), { status, headers: { "Access-Control-Allow-Origin": origin, "Cache-Control": cacheControl, "Content-Type": "application/json; charset=utf-8", "Referrer-Policy": "no-referrer", Vary: "Origin", "X-Content-Type-Options": "nosniff" } });

const ipv4Ptr = (value) => {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
  return `${parts.reverse().join(".")}.in-addr.arpa`;
};

const expandIpv6 = (value) => {
  if (!/^[0-9a-f:]+$/i.test(value) || (value.match(/::/g) || []).length > 1) return null;
  const sides = value.toLowerCase().split("::");
  const left = sides[0] ? sides[0].split(":") : [];
  const right = sides[1] ? sides[1].split(":") : [];
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  const missing = 8 - left.length - right.length;
  if ((sides.length === 1 && missing !== 0) || (sides.length === 2 && missing < 1)) return null;
  return [...left, ...Array(missing).fill("0"), ...right].map((part) => part.padStart(4, "0"));
};

const ipv6Ptr = (value) => {
  const parts = expandIpv6(value);
  return parts ? `${parts.join("").split("").reverse().join(".")}.ip6.arpa` : null;
};

const normalizeName = (input, type) => {
  const value = (input || "").trim().toLowerCase();
  if (type === "PTR") {
    const reverse = ipv4Ptr(value) || ipv6Ptr(value);
    if (reverse) return { input: value, name: reverse };
  }
  const name = value.endsWith(".") ? value.slice(0, -1) : value;
  if (!name || name.length > 253 || !/^[a-z0-9_.-]+$/.test(name)) return null;
  const labels = name.split(".");
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9_]/.test(label) || !/[a-z0-9_]$/.test(label))) return null;
  return { input: value, name };
};

const normalizeRecords = (records) => Array.isArray(records) ? records.slice(0, 100).filter((record) => record && typeof record.name === "string" && Number.isInteger(record.type) && Number.isFinite(record.TTL) && typeof record.data === "string").map((record) => ({ name: record.name, type: TYPE_NAMES[record.type] || `TYPE${record.type}`, ttl: Math.max(0, record.TTL), data: record.data })) : [];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = new Set((env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map((item) => item.trim()).filter(Boolean));
    if (!allowedOrigins.has(origin)) return new Response("Forbidden", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Headers": "Accept", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Origin": origin, "Access-Control-Max-Age": "86400", Vary: "Origin" } });
    if (request.method !== "GET") return json({ status: "error", message: "Method not allowed." }, 405, origin);

    const url = new URL(request.url);
    if (url.pathname !== "/lookup") return json({ status: "error", message: "Not found." }, 404, origin);
    const type = (url.searchParams.get("type") || "A").toUpperCase();
    if (!Object.hasOwn(RECORD_TYPES, type)) return json({ status: "invalid", message: "Choose a supported DNS record type." }, 400, origin);
    const query = normalizeName(url.searchParams.get("name"), type);
    if (!query) return json({ status: "invalid", message: type === "PTR" ? "Enter a valid IP address or reverse-DNS name." : "Enter a valid ASCII domain name." }, 400, origin);

    const upstreamUrl = new URL(DNS_ENDPOINT);
    upstreamUrl.searchParams.set("name", query.name); upstreamUrl.searchParams.set("type", String(RECORD_TYPES[type])); upstreamUrl.searchParams.set("do", "true"); upstreamUrl.searchParams.set("cd", "false");
    let upstream;
    try { upstream = await fetch(upstreamUrl, { headers: { Accept: "application/dns-json" } }); }
    catch (problem) { console.error(JSON.stringify({ message: "DNS upstream request failed", error: problem instanceof Error ? problem.message : String(problem) })); return json({ status: "error", message: "Cloudflare DNS could not be reached." }, 502, origin); }
    if (!upstream.ok) return json({ status: "error", message: "Cloudflare DNS returned an upstream error." }, 502, origin);

    let payload;
    try { payload = await upstream.json(); }
    catch { return json({ status: "error", message: "Cloudflare DNS returned an unexpected response." }, 502, origin); }
    if (!payload || !Number.isInteger(payload.Status)) return json({ status: "error", message: "Cloudflare DNS returned an unexpected response." }, 502, origin);
    const answers = normalizeRecords(payload.Answer);
    const authority = normalizeRecords(payload.Authority);
    const ttlValues = [...answers, ...authority].map((record) => record.ttl).filter((ttl) => ttl > 0);
    const maxAge = ttlValues.length ? Math.min(Math.min(...ttlValues), 86400) : 60;
    return json({ status: STATUS_NAMES[payload.Status] || `RCODE${payload.Status}`, query: { input: query.input, name: query.name, type }, dnssec: payload.AD === true, truncated: payload.TC === true, recursionAvailable: payload.RA === true, answers, authority }, 200, origin, `public, max-age=${maxAge}`);
  }
};
