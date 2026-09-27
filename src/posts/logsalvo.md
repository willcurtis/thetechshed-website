---
title: "LogSalvo: a native Mac workspace moves towards TestFlight"
description: "The native SwiftUI syslog traffic studio now has sender, receiver and forwarding workflows, with TestFlight packaging in place and release validation continuing."
date: 2026-08-01
category: "LogSalvo"
readingTime: 3 min read
projectStatus: Beta validation
---

<aside class="post-status" aria-label="Project status">
  <p><strong>Project update · 27 September 2026</strong></p>
  <p>LogSalvo's native macOS edition is at version 0.4.0. Build 3 was uploaded to App Store Connect and submitted for TestFlight beta review on 24 September. The latest recorded review state was “Waiting for Review”; installation and functional acceptance through TestFlight remain open.</p>
</aside>

## From a cross-platform tool to a native Mac workspace

LogSalvo began as a Python syslog traffic studio with a desktop interface and command-line tools. That original project remains the cross-platform reference. The newer Swift edition brings the same practical purpose to a native SwiftUI workspace: generating realistic traffic, receiving logs, inspecting what arrived and forwarding it to other systems.

The Mac app now has working Send and Receive workspaces, saved sender profiles, native settings and system, light and dark appearances. Its dedicated Traffic Pulse icon and “Syslog Traffic Studio” identity run through the application and packaging.

[Explore the native Mac workspace](../../projects/logsalvo-swift/index.html).

## Testing both ends of the pipeline

The sender supports RFC 3164 and RFC 5424 messages over UDP, TCP and TLS, with templates, structured data, message padding, controlled rates, retries, cancellation and dry-run previews. TLS options include system or custom certificate-authority trust and Keychain-backed client identities.

The receiver listens on UDP or TCP and handles RFC syslog alongside JSON, Cisco IOS, CEF and UniFi payloads. Live sorting, filters, a raw-message inspector and pause-and-queue controls make it possible to investigate busy streams without losing the original evidence. Selected traffic can be exported as CSV, JSON Lines or raw payloads.

Forwarding extends the workspace beyond a single sender and listener. Exact payloads can be relayed to multiple UDP, TCP or TLS destinations, with filtering, bounded queues, retries, loop prevention and delivery counters. Optional Mac notifications flag listener failures and matching messages, with privacy controls and limits on repeated alerts.

## Where the release stands

The current work is about validating distribution as well as application features. There are two separate paths: a direct-download Developer ID build and a sandboxed TestFlight build.

September's TestFlight work exposed startup and packaging faults. Fixes now ensure release packaging uses the executable produced by the current Swift build, with isolated build directories and regression checks against accidentally shipping an older binary. The replacement 0.4.0 build 3 passed Apple upload validation and was submitted for beta review on 24 September.

That is a release milestone, but it does not establish a generally available release. The tracking issue still requires installation through TestFlight and checks of startup, sending, receiving, TLS and export. A validated, notarised direct-download release, signed-helper testing and Intel validation also remain release gates.

## Listener ports depend on the edition

The current TestFlight build is sandboxed and deliberately limits local listeners to ports 1024–65535, such as 5514. It does not include the privileged LaunchDaemon helper.

The direct-download edition retains a separate administrator-approved helper path for protected local ports, including syslog port 514. Its production validation remains part of the release work. Sending messages to a remote collector on port 514 is a different operation and does not require a privileged local listener.

This describes the current implementation; it is not a conclusion that every possible App Store-compatible approach to local port 514 has been ruled out.

## What comes next

The next milestone is an installed, functionally verified beta, followed by completion of the remaining production release checks. Until those steps are recorded, the native Mac edition remains in beta validation rather than a public production release.

Only send test traffic to systems you own or are authorised to test.

[Explore the original cross-platform LogSalvo on GitHub](https://github.com/willcurtis/logsalvo).
