# The Tech Shed website

A database-free landing page and project blog built with [Eleventy](https://www.11ty.dev/). It uses the original Tech Shed logo and dark, neon-green visual identity. The generated `_site` folder contains ordinary static HTML, CSS, JavaScript and images.

## Run locally

```sh
npm install
npm run dev
```

The development server refreshes when source files change. The generated homepage can also be opened directly from `_site/index.html`; its assets and internal links use portable relative paths.

## Create a blog post

### Graphical editor

On macOS, double-click `tools/blog-editor/launch-blog-editor.command`, or run:

```sh
python3 tools/blog-editor/blog_editor.py
```

The branded editor generates safe metadata and filenames, estimates reading time, previews the finished Markdown and can rebuild the site after saving. It uses Python's built-in Tkinter toolkit, so it needs no extra Python packages. See [`tools/blog-editor/README.md`](tools/blog-editor/README.md) for details.

### Create a post manually

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

## GitHub Pages deployment

Pushes to `main` automatically run `.github/workflows/deploy-pages.yml`. The workflow installs the locked npm dependencies, builds the Eleventy site and publishes `_site` to GitHub Pages. It can also be started manually from the repository's Actions tab.

GitHub Pages must use **GitHub Actions** as its publishing source in **Settings → Pages**. Configure and verify the custom domain in those settings before changing public DNS.

GitHub Pages does not process `.htaccess` or the Nginx configuration in `deploy/`. If the site moves from the existing webserver, equivalent custom response headers must be provided by a compatible reverse proxy or CDN.

## Production security headers

The build copies `src/.htaccess` into `_site` for Apache-compatible hosting. It sets the canonical HTTPS hostname, disables directory listings and adds the site's security headers.

For Nginx, include `deploy/nginx-security-headers.conf` inside the HTTPS `server` block, test the configuration and reload Nginx:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

The Nginx server should redirect both HTTP and `www.thetechshed.dev` to `https://thetechshed.dev`. The two-year HSTS policy covers subdomains, so confirm every subdomain supports HTTPS before applying it. HSTS preloading is deliberately not enabled because submitting the domain to browser preload lists is a separate, long-term operational decision.
