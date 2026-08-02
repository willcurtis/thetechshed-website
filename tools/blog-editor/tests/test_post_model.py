import sys
import unittest
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from post_model import (  # noqa: E402
    BlogPost,
    estimate_reading_minutes,
    parse_post,
    render_post,
    safe_post_path,
    slugify,
    validate_post,
)


class PostModelTests(unittest.TestCase):
    def test_slugify_is_url_safe(self):
        self.assertEqual(slugify("What’s New: Wi-Fi & QR Codes?"), "whats-new-wi-fi-qr-codes")

    def test_estimates_reading_time(self):
        self.assertEqual(estimate_reading_minutes("word " * 201), 2)
        self.assertEqual(estimate_reading_minutes(""), 1)

    def test_render_and_parse_round_trip(self):
        post = BlogPost(
            title='A title: with "quotes"',
            slug="a-title",
            description="A concise description.",
            publish_date="2026-08-02",
            category="Build log",
            reading_minutes=3,
            body="## Introduction\n\nUseful content.",
        )
        rendered = render_post(post)
        loaded = parse_post(rendered, fallback_slug="a-title")
        self.assertEqual(loaded, post)

    def test_validation_reports_missing_fields(self):
        errors = validate_post(BlogPost(publish_date="not-a-date", reading_minutes=0))
        self.assertGreaterEqual(len(errors), 6)

    def test_safe_post_path_stays_in_posts_directory(self):
        with TemporaryDirectory() as directory:
            posts = Path(directory)
            self.assertEqual(safe_post_path(posts, "valid-post"), (posts / "valid-post.md").resolve())
            with self.assertRaises(ValueError):
                safe_post_path(posts, "../escape")

    def test_valid_post_has_no_errors(self):
        post = BlogPost(
            title="Useful post",
            slug="useful-post",
            description="A useful description.",
            publish_date=date.today().isoformat(),
            category="Project note",
            reading_minutes=2,
            body="## Details\n\nSome useful content.",
        )
        self.assertEqual(validate_post(post), [])


if __name__ == "__main__":
    unittest.main()
