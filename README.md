# The Tech Shed website

A database-free landing page and project blog built with [Eleventy](https://www.11ty.dev/). It uses the original Tech Shed logo and dark, neon-green visual identity. The generated `_site` folder contains ordinary static HTML, CSS, JavaScript and images.

## Run locally

```sh
npm install
npm run dev
```

The development server refreshes when source files change. The generated homepage can also be opened directly from `_site/index.html`; its assets and internal links use portable relative paths.

## Create a blog post

1. Duplicate any file in `src/posts/`.
2. Give it a URL-friendly filename, such as `building-a-home-lab.md`.
3. Update the metadata at the top:

```yaml
---
title: Building a quieter home lab
description: A one-sentence summary used on listings and by search engines.
date: 2026-08-01
category: Build log
readingTime: 6 min read
---
```

4. Write the post below the second `---` using Markdown.
5. Run `npm run build`.

The post automatically appears on the blog page, the homepage, the Atom feed and the sitemap. No database or admin account is required.

## Production build

```sh
npm ci
npm run build
```

Publish the contents of `_site`. Configure the host to serve `_site/404.html` for missing pages.
