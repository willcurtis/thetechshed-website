import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

const origin = "https://thetechshed.dev";
const request = (query, options = {}) => new Request(`https://the-tech-shed-dns-lookup.will-4c9.workers.dev/lookup?${query}`, { headers: { Origin: origin }, ...options });

test("rejects unapproved origins", async () => {
  const response = await worker.fetch(new Request("https://example.workers.dev/lookup?name=example.com&type=A", { headers: { Origin: "https://example.com" } }), {});
  assert.equal(response.status, 403);
});

test("validates record types and names", async () => {
  assert.equal((await worker.fetch(request("name=example.com&type=ANY"), {})).status, 400);
  assert.equal((await worker.fetch(request("name=bad%20name&type=A"), {})).status, 400);
});

test("normalises DNS records and response metadata", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url) => {
    assert.equal(url.searchParams.get("name"), "example.com");
    assert.equal(url.searchParams.get("type"), "1");
    return Response.json({ Status: 0, TC: false, RA: true, AD: true, Answer: [{ name: "example.com.", type: 1, TTL: 300, data: "192.0.2.1" }] });
  };
  const response = await worker.fetch(request("name=Example.COM.&type=a"), {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control"), /max-age=300/);
  assert.deepEqual(await response.json(), { status: "NOERROR", query: { input: "example.com.", name: "example.com", type: "A" }, dnssec: true, truncated: false, recursionAvailable: true, answers: [{ name: "example.com.", type: "A", ttl: 300, data: "192.0.2.1" }], authority: [] });
});

test("converts IPv4 and IPv6 addresses for PTR lookups", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const names = [];
  globalThis.fetch = async (url) => { names.push(url.searchParams.get("name")); return Response.json({ Status: 3, AD: false }); };
  await worker.fetch(request("name=192.0.2.1&type=PTR"), {});
  await worker.fetch(request("name=2001%3Adb8%3A%3A1&type=PTR"), {});
  assert.equal(names[0], "1.2.0.192.in-addr.arpa");
  assert.equal(names[1], "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa");
});
