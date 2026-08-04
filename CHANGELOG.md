# Changelog

All notable user-facing changes to The Tech Shed website are documented here.

## Unreleased

### Added

- A long-form Enyaq Pulse build story covering the responsive dashboard, local MyŠkoda collector, SQLite history, resilience and security model, with desktop and mobile screenshots and a coming-soon status.
- Dark mode for the hosted London Underground demo, including automatic system-theme detection and a persistent manual toggle.
- A hosted, live London Underground status demo linked from its homepage project card and project note.
- A new browser tools directory linked from the main navigation and homepage.
- An IPv4 subnet calculator for CIDR ranges, subnet and wildcard masks, broadcast addresses, and usable host capacity.
- A privacy-friendly Wi-Fi QR generator with WPA, WEP, open and hidden-network support plus PNG downloads.
- A VLSM-based VLAN and subnet planner with overlap-free allocation, capacity summaries, and CSV export.
- A DNS record builder for validated A, AAAA, CNAME, MX, TXT, and SRV zone records.

### Fixed

- Allowed the hosted demo's hashed inline assets and TfL status requests through the production Content Security Policy without enabling unrestricted inline code.
- Balanced the tools directory into a two-column desktop layout with a compact, responsive mobile stack.
- Added asset versioning so browsers and content delivery networks do not reuse stale CSS or JavaScript after a deployment.
- Corrected canonical URLs and sitemap references to use the final apex hostname.
- Improved the Wi-Fi QR placeholder contrast to meet WCAG requirements.
- Neutralised spreadsheet formula prefixes in exported VLAN-plan names.
- Added restrictive browser and server security policies for supported Apache and Nginx deployments.
