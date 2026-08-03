# Changelog

All notable user-facing changes to The Tech Shed website are documented here.

## Unreleased

### Added

- A new browser tools directory linked from the main navigation and homepage.
- An IPv4 subnet calculator for CIDR ranges, subnet and wildcard masks, broadcast addresses, and usable host capacity.
- A privacy-friendly Wi-Fi QR generator with WPA, WEP, open and hidden-network support plus PNG downloads.
- A VLSM-based VLAN and subnet planner with overlap-free allocation, capacity summaries, and CSV export.
- A DNS record builder for validated A, AAAA, CNAME, MX, TXT, and SRV zone records.

### Fixed

- Balanced the tools directory into a two-column desktop layout with a compact, responsive mobile stack.
- Added asset versioning so browsers and content delivery networks do not reuse stale CSS or JavaScript after a deployment.
- Corrected canonical URLs and sitemap references to use the final apex hostname.
- Improved the Wi-Fi QR placeholder contrast to meet WCAG requirements.
- Neutralised spreadsheet formula prefixes in exported VLAN-plan names.
- Added restrictive browser and server security policies for supported Apache and Nginx deployments.
