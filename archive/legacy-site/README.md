# The Tech Shed website

Public portfolio and project site for [thetechshed.dev](https://www.thetechshed.dev), with a small Flask application for generating network configuration files.

## Local development

Static pages can be served from the repository root:

```sh
python3 -m http.server 8080
```

Run the configuration generator in a virtual environment:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app app run --port 3000
```

The production WSGI application is `app:app`. Compatibility entry points remain in `index.py` and `app-proxy.py`.

## Tests

```sh
pytest
```

## Deployment notes

- Serve all public files through HTTPS.
- Route `/tools/config-generator/` to the Flask application.
- Keep Python source, tests and example input files outside direct web access where the host permits it.
- Confirm Apache supports `mod_rewrite` and `mod_headers` before deploying `.htaccess`.
- Review the privacy notice and security contact annually.
