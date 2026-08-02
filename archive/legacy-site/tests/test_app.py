import io
import zipfile

import pytest

from app import app


@pytest.fixture()
def client():
    app.config.update(TESTING=True)
    return app.test_client()


def upload(client, csv_text, filename_column="hostname", template="name [hostname]\nip [ip]\n"):
    return client.post(
        "/tools/config-generator/",
        data={
            "filename_column": filename_column,
            "template": (io.BytesIO(template.encode()), "template.txt"),
            "csv": (io.BytesIO(csv_text.encode()), "devices.csv"),
        },
        content_type="multipart/form-data",
    )


def test_generates_expected_archive(client):
    response = upload(client, "hostname,ip\nswitch-01,192.0.2.1\n")
    assert response.status_code == 200
    assert response.mimetype == "application/zip"
    with zipfile.ZipFile(io.BytesIO(response.data)) as archive:
        assert archive.namelist() == ["switch-01.txt"]
        assert archive.read("switch-01.txt") == b"name switch-01\nip 192.0.2.1\n"


@pytest.mark.parametrize("name", ["../../escape", "/tmp/escape", "two words", ".hidden"])
def test_rejects_unsafe_filenames(client, name):
    response = upload(client, f"hostname,ip\n{name},192.0.2.1\n")
    assert response.status_code == 400
    assert b"invalid output filename" in response.data


def test_rejects_duplicate_filenames(client):
    response = upload(client, "hostname,ip\nswitch,192.0.2.1\nswitch,192.0.2.2\n")
    assert response.status_code == 400
    assert b"occurs more than once" in response.data


def test_rejects_missing_filename_column(client):
    response = upload(client, "device,ip\nswitch,192.0.2.1\n")
    assert response.status_code == 400
    assert b"does not contain" in response.data


def test_supports_bracketed_example_headers(client):
    response = upload(client, "[hostname],[ip]\nswitch-01,192.0.2.1\n")
    assert response.status_code == 200
    with zipfile.ZipFile(io.BytesIO(response.data)) as archive:
        assert archive.read("switch-01.txt") == b"name switch-01\nip 192.0.2.1\n"
