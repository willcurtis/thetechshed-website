---
title: One QR generator, several genuinely useful payloads
description: Building a validated QR code tool that works equally well from a desktop window or a terminal.
date: 2026-08-02
category: QR Generator
readingTime: 4 min read
---

## More than putting text in squares

The QR Generator started with a simple requirement: turn a URL into a reliable image without reaching for a web service. It now handles links, Wi-Fi credentials, vCards, SMS messages, calendar events, telephone links, email addresses and plain text.

Each payload has its own rules. Wi-Fi values need escaping, calendar events need valid times, and a QR image needs a sufficient quiet-zone border to remain dependable. Validation happens before an image is written, so mistakes are explained rather than quietly encoded.

## Two ways to work

The desktop application provides an immediate preview and PNG or JPEG export. The command-line interface is better for repeatable jobs and automation. Both use the same underlying payload and image code, which keeps their behaviour consistent.

Colours, scale, border size and error-correction level can all be configured. The defaults remain deliberately conservative: the first job is producing a code that scans.

[Explore the QR Generator on GitHub](https://github.com/willcurtis/qr-generator).
