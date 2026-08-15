import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.js";

const origin = "https://thetechshed.dev";
const request = (path, options = {}) => new Request(`https://the-tech-shed-mac-lookup.will-4c9.workers.dev${path}`, { headers: { Origin: origin }, ...options });

test("rejects requests from unapproved origins", async () => {
  const response = await worker.fetch(new Request("https://the-tech-shed-mac-lookup.will-4c9.workers.dev/lookup?mac=443839", { headers: { Origin: "https://example.com" } }), {});
  assert.equal(response.status, 403);
});

test("validates MAC addresses before contacting the API", async () => {
  const response = await worker.fetch(request("/lookup?mac=not-a-mac"), {});
  assert.equal(response.status, 400);
  assert.equal((await response.json()).status, "invalid");
});

test("normalises input and returns a vendor", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url) => {
    assert.equal(url, "https://api.macvendors.com/44%3A38%3A39");
    return new Response("Cumulus Networks, inc", { status: 200 });
  };
  const response = await worker.fetch(request("/lookup?mac=44-38-39"), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { mac: "44:38:39", status: "found", vendor: "Cumulus Networks, inc" });
});

test("maps an upstream 404 to a vendor miss", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => new Response("Not Found", { status: 404 });
  const response = await worker.fetch(request("/lookup?mac=001122334455"), {});
  assert.equal(response.status, 404);
  assert.equal((await response.json()).status, "not_found");
});
