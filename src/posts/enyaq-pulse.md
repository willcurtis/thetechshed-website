---
title: "Building Enyaq Pulse: a private dashboard for a connected EV"
description: How a responsive dashboard, a local Python collector and resilient SQLite history turn MyŠkoda data into a clearer view of an Enyaq.
date: 2026-08-04
category: Enyaq Pulse
readingTime: 12 min read
previewImage: /images/posts/enyaq-pulse/dashboard-overview.jpg
previewImageAlt: Enyaq Pulse dashboard showing battery range and active charging information
projectStatus: Coming soon
---

<aside class="post-status" aria-label="Project status">
  <p><strong>Project status: coming soon</strong></p>
  <p>Enyaq Pulse is currently in private preview while the live-data path is tested against a 2026 Škoda Enyaq. The screenshots in this article use the built-in demonstration data.</p>
</aside>

## Starting with a simple question

The idea behind Enyaq Pulse began with a straightforward question: could the information available in MyŠkoda be turned into a dashboard that is quicker to read, better at showing history and safe to leave running on a desktop or dedicated display?

The answer is yes, but the interesting part is not drawing a battery gauge. The real build challenge is everything around it: collecting data without exposing vehicle credentials, coping with an unofficial and changeable upstream service, preserving useful information when one endpoint fails, and making cloud-reported vehicle state feel coherent without pretending it is second-by-second telemetry.

Enyaq Pulse is the first working version of that answer. It is a private, read-only dashboard designed around a 2026 Škoda Enyaq. A responsive web interface handles presentation while a small Python service runs locally, connects to MyŠkoda and stores a history of successful readings in SQLite.

The result is a dashboard that can show the state of the car now, place it in the context of recent driving and charging, and remain useful when the upstream service is temporarily incomplete.

<figure class="post-figure post-figure--wide">
  <img src="/images/posts/enyaq-pulse/dashboard-overview.jpg" width="1280" height="720" alt="Enyaq Pulse desktop dashboard showing a 64 percent battery, 261 kilometre range and active 7.2 kilowatt charging session" decoding="async">
  <figcaption>The desktop overview puts battery, range and the active charging session at the top of the page. All values shown here are demonstration data.</figcaption>
</figure>

## What the dashboard can show

The interface is organised around the questions that matter when walking past the car, planning the next journey or reviewing how it has been used:

- current battery percentage, target charge and estimated range;
- whether the cable is connected and whether the car is charging;
- Alternating Current or Direct Current charge type, power, charge rate and estimated time remaining when those fields are available;
- odometer, outside temperature, monthly distance and estimated monthly energy use;
- seven-day or 30-day state-of-charge history;
- 30-day average electrical consumption and the most recent journey's distance and consumption;
- recent charging sessions, including energy, duration and estimated cost when a tariff has been configured;
- lock, door, window, light, climate and cloud-connection status; and
- a clear last-updated time, data-source label and warning when information may be stale.

MyŠkoda reports capabilities per vehicle, so Enyaq Pulse treats unavailable values as unknown rather than filling the gaps with guesses. That distinction matters. A dashboard about a physical vehicle has to make uncertainty visible.

## Designing for a glance

The visual design uses a near-black background, off-white type and a bright electric-lime accent. The colour is functional as well as distinctive: it traces the battery dial and progress bar, then expands to fill the charging card when a session is active. The most time-sensitive information therefore has the strongest visual weight.

The hero area answers three questions immediately: how much battery is left, how far the car is expected to travel and what is happening at the charge point. Secondary figures sit in a narrow summary strip, while history and detail move farther down the page.

A small status badge switches between demonstration and live-vehicle modes. The refresh control allows an immediate update, while the browser quietly checks the dashboard endpoint every minute. That does not mean the car is polled every minute: the browser is reading the latest safe snapshot from the collector, not repeatedly waking the upstream vehicle service.

## Two applications with a deliberate boundary

Enyaq Pulse is really two applications joined by a small, read-only data contract.

```text
Enyaq -> MyŠkoda cloud -> local Python collector -> SQLite
                                      |
browser dashboard <- server proxy <- read-only JSON
```

The web application is built with React and TypeScript using the Next.js application model, with vinext and Vite providing the current deployment path. It owns the layout, charts, responsive behaviour and refresh experience. Its server-side `/api/dashboard` route either returns demonstration data or proxies a configured collector.

The collector is a FastAPI application written in Python. It is intended to run somewhere private and persistent, such as a Mac, home server or Raspberry Pi. The collector owns authentication, upstream communication, normalisation and local history.

Keeping those responsibilities separate gives the project an important security property: MyŠkoda credentials never need to enter the browser or become part of a hosted web build.

## Building the collector

The live collector uses the community-maintained `myskoda` Python client to access the same cloud services used by MyŠkoda. This is not a public, guaranteed Škoda developer API, so the integration has been designed as a replaceable edge rather than something allowed to leak through the whole project.

For each refresh, the collector first finds the configured Vehicle Identification Number (VIN), or selects the first vehicle on the account when no VIN has been supplied. It then requests several areas concurrently: vehicle information, charging, general status, climate, cloud reachability, monthly trip statistics, individual journeys, charging sessions and maintenance information.

Running those requests concurrently keeps the refresh time bounded by the slowest service instead of the sum of every request. More importantly, they are gathered in a way that allows individual failures to be inspected. A timeout in charging history should not make the current battery percentage disappear.

The response from each service is mapped into one stable dashboard shape. Enumerated API values become readable labels, range is converted from metres to kilometres, monthly energy is derived from distance and average consumption, and charging-session costs are calculated only when a price per kilowatt-hour has been configured.

The current build polls MyŠkoda every 30 minutes by default and enforces a minimum interval of five minutes. That conservative approach respects the fact that the data comes through a cloud service rather than directly from the car and reduces the risk of unnecessary upstream requests.

## One data contract, two modes

Mock mode is not a static picture or a special front-end shortcut. It returns the same structured dashboard payload as live mode, including vehicle details, current charging figures, efficiency, history, session records, status and capture metadata.

That makes the demonstration useful throughout development. The layout, refresh path, type definitions and rendered-page tests all exercise the same contract that live vehicle data will use. A new installation can also be run without credentials, which makes the setup process safer and lets the interface be evaluated before anyone connects an account.

<figure class="post-figure post-figure--wide">
  <img src="/images/posts/enyaq-pulse/dashboard-analytics.jpg" width="1280" height="720" alt="Enyaq Pulse dashboard showing a seven-day battery history chart, monthly distance and electrical consumption figures" loading="lazy" decoding="async">
  <figcaption>History adds context to a single state-of-charge value. The interface can switch between seven and 30 recent snapshots.</figcaption>
</figure>

## Preserving the last known good state

Connected-car services do not always return every category of data at the same time. Enyaq Pulse handles that at two levels.

If a complete refresh fails, the collector leaves the most recent successful snapshot untouched. The dashboard can continue to display it with a stale-data notice rather than replacing a useful screen with an error.

If only part of a refresh fails, the collector preserves the corresponding section from the previous snapshot. A charging failure keeps the previous battery and charging values; a status failure keeps the previous lock, door, window and light state; a trip failure keeps the previous efficiency figures. Successfully refreshed sections are still allowed through.

Each good payload is written to a deliberately small SQLite table containing its capture time, battery percentage and full normalised JSON. The database retains up to 400 days of snapshots, while the current interface requests the latest 30 battery readings for its history view. SQLite keeps deployment simple: there is no external database to administer, back up or secure for this first version.

This approach does not disguise old data. The payload carries its source, capture time, stale flag and an optional notice so the interface can explain exactly what it is showing.

## Keeping credentials on the private side

The collector reads credentials from a local environment file and supports either a refresh token or an email-and-password login. Those values are used only to create the upstream session. They are not written to SQLite, returned in the dashboard response or compiled into JavaScript.

When the web server and collector are separated, the read-only dashboard endpoint can be protected with a bearer token. Comparison uses a timing-safe function, responses are marked `no-store`, and the web proxy stops waiting after 12 seconds rather than leaving a request hanging indefinitely.

The first release is intentionally read-only. It does not unlock doors, change charging targets, start climate control or send any other command to the car. That narrows both the security risk and the amount of behaviour that has to be trusted while the data integration is still being validated.

## Responsive without becoming a different product

The dashboard collapses from a wide two-column layout into a single, readable flow on smaller screens. Battery and charging remain the first two panels, the status badge is simplified, and secondary information follows in the same priority order as the desktop view.

Nothing important is hidden behind a desktop-only interaction. The same dashboard can therefore work as a browser tab, a phone-friendly status page or, eventually, a dedicated home display.

<figure class="post-figure post-figure--portrait">
  <img src="/images/posts/enyaq-pulse/dashboard-mobile.jpg" width="390" height="844" alt="Mobile Enyaq Pulse dashboard with responsive battery and charging cards" loading="lazy" decoding="async">
  <figcaption>The mobile layout keeps the core battery and charging story intact rather than reducing the experience to a list of numbers.</figcaption>
</figure>

## Testing the complete path

The project has separate checks for the web interface and collector. The web suite builds the production application, renders the page and verifies that key content and security boundaries survive the build. Linting covers the React, TypeScript, worker and test code.

Collector tests exercise configuration, authentication, API behaviour, SQLite storage and the last-known-good recovery path. Mock mode is tested as a first-class operating mode rather than an unverified development convenience.

Visual testing also uncovered a server-and-browser time-zone mismatch in the last-updated label. Both date-formatting paths are now fixed to Europe/London, preventing the server-rendered time changing by an hour when React takes over in the browser. It is a small detail, but exactly the sort of detail that makes a status dashboard feel unreliable if it is left unresolved.

## What Enyaq Pulse is not

Enyaq Pulse reports the state known to the MyŠkoda cloud. It is not connected directly to the car's Controller Area Network (CAN), and it should not be treated as real-time diagnostic equipment.

Low-level Battery Management System data such as individual cell voltages and battery state of health is not available through this integration. The unofficial API may also change without notice, and exact fields vary with the vehicle, market and services enabled on the account.

Those limitations are part of the product design. The collector isolates the unstable integration, the dashboard exposes freshness, and missing values remain missing.

## Coming soon

The private preview is complete and the core build is working. Before a broader release, the live collector will be validated against the target 2026 Enyaq over normal driving, home charging and rapid-charging sessions. That will provide the evidence needed to refine capability detection, confirm which history fields are consistently returned and improve the setup guidance for long-running installations.

The first public release is planned to include the responsive dashboard, demonstration mode, local collector, SQLite history, tariff-based cost estimates, resilient last-known-good behaviour and a complete private setup guide.

**Enyaq Pulse is coming soon.**
