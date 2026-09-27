---
title: "Enyaq Pulse: official MyŠkoda data, local history and a Pi dashboard"
description: "Enyaq Pulse now uses the official MyŠkoda Public API, with quota-aware collection, a Raspberry Pi kiosk view and a private Docker deployment."
date: 2026-08-04
category: Enyaq Pulse
readingTime: 5 min read
previewImage: /images/posts/enyaq-pulse/dashboard-overview.jpg
previewImageAlt: Earlier Enyaq Pulse demonstration dashboard, before the official API migration
projectStatus: Private deployment
---

<aside class="post-status" aria-label="Project status">
  <p><strong>Project update · 27 September 2026</strong></p>
  <p>Enyaq Pulse has moved beyond its initial preview: it uses the official MyŠkoda Public API and has a private Raspberry Pi Docker deployment, plus a separate desktop-kiosk installation path. It remains a private, read-only project. The images below show the earlier demonstration interface, not current live vehicle data.</p>
</aside>

## From a working preview to a private deployment

Enyaq Pulse started with a simple question: could the information available in MyŠkoda become a dashboard that is quicker to read, keeps useful history and works on a dedicated home display?

The project now combines a responsive web dashboard, a local Python collector and SQLite history. Since the original August build, the biggest change has happened behind the interface: the unofficial client has been replaced by the official MyŠkoda Public API. A compact Raspberry Pi kiosk view and a headless Docker deployment have also been added.

The aim remains practical: show battery, charging and vehicle status clearly, keep credentials on the server, and make missing or stale information visible.

<figure class="post-figure post-figure--wide">
  <img src="/images/posts/enyaq-pulse/dashboard-overview.jpg" width="1280" height="720" alt="Earlier Enyaq Pulse prototype with demonstration battery and charging values" decoding="async">
  <figcaption>Earlier demonstration interface. Some panels shown in these August screenshots were removed when the project moved to the official API.</figcaption>
</figure>

## What the current dashboard shows

The current integration focuses on the fields available through the official vehicle response:

- battery percentage, target charge and estimated range;
- charging state, AC/DC type, power, charge rate and remaining time when available;
- odometer and locally accumulated battery history;
- lock, door, window, light and climate status;
- the vehicle image supplied by Škoda; and
- capture time, stale-data notices, partial-data warnings and API allowance information.

Capabilities vary by vehicle and account. Missing values stay unknown; they are not converted into reassuring-looking zeros.

The migration also narrowed the scope. Public API v1 does not supply the trip statistics, outside temperature, cloud connection state or charging-session history used by the earlier prototype. The current dashboard therefore does not promise journey analysis, monthly efficiency figures or tariff-based charging-session costs. Local battery snapshots remain useful, but they are not a substitute for a journey or charging-session feed.

## One vehicle request, then cached reads

The collector now authenticates with an API key created in MyŠkoda and a configured vehicle identification number. It makes one vehicle request per refresh, rather than collecting separate categories through the unofficial client.

```text
Enyaq -> official MyŠkoda Public API -> local Python collector -> SQLite
                                              |
browser dashboard <- server-side proxy <- cached read-only JSON
```

The default upstream polling interval is 30 minutes, with a minimum of five minutes. The collector records quota and key-expiry metadata from the API response so the dashboard can expose relevant warnings. Browser refresh reads the cached collector response; it does not trigger another vehicle request.

This separation matters on a quota-limited service. Multiple collectors sharing a key still share its allowance, and starting or restarting a collector triggers an initial poll. Response headers are the authority on the allowance remaining.

## Keeping useful history without hiding failures

Successful snapshots are stored locally in SQLite. If a complete refresh fails, the previous snapshot remains available. If the API returns partial data, the collector preserves the corresponding last-known-good values and reports the problem.

The deployed history chart uses the latest reading for each Europe/London calendar day, with seven-day and 30-day date filters. Empty history is shown as empty rather than plotted as a fabricated zero. History grows from collected observations; the API does not backfill a complete record of earlier driving and charging.

Vehicle capture time and collector polling time are also different. A successful request can return older vehicle information, so freshness labels remain an important part of the screen.

<figure class="post-figure post-figure--wide">
  <img src="/images/posts/enyaq-pulse/dashboard-analytics.jpg" width="1280" height="720" alt="Earlier demonstration analytics screen with prototype battery, distance and consumption panels" loading="lazy" decoding="async">
  <figcaption>Historical prototype screenshot. Battery history continues in the current build; the trip and consumption panels shown here are not supplied by the official API integration.</figcaption>
</figure>

## Two Raspberry Pi deployment options

The desktop-kiosk path targets 64-bit Raspberry Pi OS Desktop. Its installer sets up the collector and dashboard as services, configures desktop auto-login and launches Chromium full-screen. The dedicated kiosk route is designed for the official seven-inch display at 800 × 480, with larger labels and three layout options.

A separate headless Docker deployment runs the web application and collector in two ARM64 containers behind the home server's HTTPS proxy. The collector holds the API credentials and persistent SQLite history; the web service reads its cached response over an internal connection. This provides a private browser dashboard without requiring a desktop session on the host.

These are separate deployment paths. The headless service does not need the desktop installer, and a working browser kiosk view alone does not prove a physical display's boot and auto-login behaviour. That hardware check remains distinct from the build and browser validation.

## Private credentials and read-only behaviour

The API key stays with the collector. It is not compiled into browser JavaScript, stored in snapshot history or returned by the dashboard endpoint. An internal token protects communication between the web application and collector.

Enyaq Pulse does not unlock doors, change charging targets or start climate control. It remains a read-only view of cloud-reported state, with a demonstration mode for checking layouts and setup without vehicle credentials.

The Docker deployment includes persistent history and host backup coverage. Recovery also needs the source and configuration to rebuild the application images; a copy of the source repository alone is not a backup of the running service's data.

## Current status and next steps

Enyaq Pulse is now a privately deployed dashboard with an official-API collector, local history and a dedicated kiosk interface. The deployment record includes live-source and stored-snapshot checks, browser checks of the main dashboard and 800 × 480 kiosk, and service restart and backup verification.

That does not make it a public product release. Longer-term observation of freshness, API behaviour and everyday usability remains useful, alongside physical kiosk boot checks where that installation path is used.

The dashboard reports what the MyŠkoda cloud knows. It is not direct real-time vehicle telemetry and does not expose battery cell voltages or battery state of health. Enyaq Pulse is not affiliated with or endorsed by Škoda Auto.
