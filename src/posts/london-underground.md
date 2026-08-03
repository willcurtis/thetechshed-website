---
title: Live Underground status built for the screen on the wall
description: A lightweight TfL dashboard that adapts from a full browser view to a compact DAKboard widget.
date: 2026-08-02
category: London Underground
readingTime: 4 min read
---

## The right information at the right distance

A status display viewed across a room needs different priorities from a journey-planning application. The London Underground dashboard focuses on line identity, current service state and disruption details using official TfL colours and data.

The project includes full-screen and viewport-fitting dashboards as well as a compact DAKboard widget. The widget can switch between list and grid layouts, use light, dark or transparent themes, show disrupted services only and restrict the display to selected lines.

## Lightweight by design

The browser dashboards have no application dependencies and fetch live status directly from TfL without an API key. An optional Node server adds a cached JSON endpoint for displays or integrations that need structured data.

That separation keeps the simplest deployment truly static while leaving room for more advanced uses.

[Open the live London Underground status demo](/demos/london-underground/index.html), or
[Explore the London Underground DAKboard project on GitHub](https://github.com/willcurtis/london-underground-dakboard).
