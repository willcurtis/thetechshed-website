import csv
import io
import re
import zipfile

from flask import Flask, render_template, request, send_file
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

MAX_UPLOAD_BYTES = 2 * 1024 * 1024
MAX_ROWS = 500
MAX_OUTPUT_BYTES = 10 * 1024 * 1024
ALLOWED_NAME = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0


def error(message: str, status: int = 400):
    return render_template("index.html", error=message), status


@app.errorhandler(RequestEntityTooLarge)
def upload_too_large(_exception):
    return error("The combined upload must be no larger than 2 MB.", 413)


@app.route("/tools/config-generator/", methods=["GET", "POST"])
def config_generator():
    if request.method == "GET":
        return render_template("index.html", error=None)

    template_file = request.files.get("template")
    csv_file = request.files.get("csv")
    filename_column = request.form.get("filename_column", "").strip()

    if not template_file or not csv_file:
        return error("Select both a template and a CSV file.")
    if not ALLOWED_NAME.fullmatch(filename_column):
        return error("The filename column may contain only letters, numbers, hyphens and underscores.")

    try:
        template = template_file.read().decode("utf-8")
        csv_text = csv_file.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        return error("Both files must use UTF-8 text encoding.")

    try:
        reader = csv.DictReader(io.StringIO(csv_text))
        headers = reader.fieldnames or []
        normalized_headers = {
            header[1:-1] if header.startswith("[") and header.endswith("]") else header: header
            for header in headers
        }
        if filename_column not in normalized_headers:
            return error(f'The CSV does not contain a "{filename_column}" column.')
        source_filename_column = normalized_headers[filename_column]

        archive_buffer = io.BytesIO()
        seen_names: set[str] = set()
        output_size = 0
        row_count = 0

        with zipfile.ZipFile(archive_buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            for row_count, row in enumerate(reader, start=1):
                if row_count > MAX_ROWS:
                    return error(f"The CSV may contain no more than {MAX_ROWS} data rows.")
                raw_name = (row.get(source_filename_column) or "").strip()
                safe_name = secure_filename(raw_name)
                if not safe_name or safe_name != raw_name or not ALLOWED_NAME.fullmatch(safe_name):
                    return error(f"Row {row_count} contains an invalid output filename.")

                output_name = f"{safe_name}.txt"
                if output_name.casefold() in seen_names:
                    return error(f'Filename "{output_name}" occurs more than once.')
                seen_names.add(output_name.casefold())

                config = template
                for key, value in row.items():
                    placeholder = key if key.startswith("[") and key.endswith("]") else f"[{key}]"
                    config = config.replace(placeholder, value or "")
                encoded = config.encode("utf-8")
                output_size += len(encoded)
                if output_size > MAX_OUTPUT_BYTES:
                    return error("The generated files exceed the 10 MB output limit.")
                archive.writestr(output_name, encoded)
    except (csv.Error, TypeError, ValueError):
        return error("The CSV could not be read. Check its headers and formatting.")

    if row_count == 0:
        return error("The CSV contains no data rows.")

    archive_buffer.seek(0)
    return send_file(
        archive_buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name="configs.zip",
        max_age=0,
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=3000)
