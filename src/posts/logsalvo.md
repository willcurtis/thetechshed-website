---
title: LogSalvo turns syslog testing into a proper workspace
description: Generating and receiving realistic syslog traffic with enough control for collectors, parsers and alert pipelines.
date: 2026-08-01
category: LogSalvo
readingTime: 6 min read
---

## Testing both ends of the pipeline

LogSalvo is a cross-platform syslog traffic studio for testing collectors, SIEM platforms, firewall rules, parsers and alerts. It combines a tested sender and receiver core behind both a command-line interface and a desktop GUI.

The sender supports RFC 3164 and RFC 5424 messages over UDP, TCP and TLS, including RFC 6587 framing, templates, controlled rates, retries and dry runs. That makes it possible to reproduce a particular event or create sustained traffic without improvising shell loops.

## Receiving and inspecting

The receiver listens over UDP or TCP, parses common syslog formats and keeps the original payload available for inspection. Filters cover message text, sender, hostname, application, facility and severity. Visible results can be exported for further analysis.

Support for CEF, Cisco, UniFi and JSON payloads makes the tool useful beyond perfectly formatted lab messages. Malformed input remains visible rather than disappearing, because broken logs are often the thing being investigated.

Only send test traffic to systems you own or are authorised to test.

[Explore LogSalvo on GitHub](https://github.com/willcurtis/logsalvo).
