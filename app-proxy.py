from flask import Flask, request, send_file, render_template
import tempfile
import zipfile
import os
import csv
import io

app = Flask(__name__, static_url_path='/tools/config-generator/static')

@app.route('/tools/config-generator/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        template_file = request.files['template']
        csv_file = request.files['csv']
        filename_column = request.form['filename_column']

        template = template_file.read().decode('utf-8')

        with tempfile.TemporaryDirectory() as tempdir:
            output_files = []

            csv_stream = io.StringIO(csv_file.read().decode('utf-8-sig'))
            reader = csv.DictReader(csv_stream)
            headers = reader.fieldnames

            bracketed_key = f"[{filename_column}]"
            if bracketed_key not in headers:
                return f"Error: '[{filename_column}]' not found in CSV headers."

            for row in reader:
                config = template
                for key, value in row.items():
                    config = config.replace(key, value)

                safe_name = f"{row[bracketed_key]}.txt".replace(" ", "_")
                filepath = os.path.join(tempdir, safe_name)
                with open(filepath, 'w') as f:
                    f.write(config)
                output_files.append(filepath)

            zip_path = os.path.join(tempdir, 'configs.zip')
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file in output_files:
                    zipf.write(file, os.path.basename(file))

            return send_file(zip_path, as_attachment=True)

    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=False, host='127.0.0.1', port=3000)
