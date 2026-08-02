---
title: A clearer window into WeatherLink data
description: Presenting live station observations, gauges and history without turning the weather into a wall of numbers.
date: 2026-08-01
category: Weather Dashboard
readingTime: 5 min read
---

## Designing for a glance

Weather stations produce a broad set of observations, but a useful dashboard has to establish hierarchy. Current temperature and conditions should be instantly readable; wind, pressure, rainfall, solar and UV data should be available without competing for attention.

The WeatherLink Dashboard combines metric cards, gauges, a wind-direction compass and selectable 24-hour charts. It supports metric and imperial units and normalises the different field names returned by several Davis station families.

## Desktop or dedicated display

It runs as a cross-platform Python desktop application and can also be installed on a Raspberry Pi in an optional kiosk mode. Network requests happen in the background so a slow API response does not freeze the interface.

Credentials stay in a local environment file rather than source code. Where a WeatherLink plan does not include historical access, the dashboard continues to show current observations and explains the limitation clearly.

[Explore the WeatherLink Dashboard on GitHub](https://github.com/willcurtis/weatherlink-dashboard).
