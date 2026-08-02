"""File-format helpers for The Tech Shed blog editor."""

from __future__ import annotations

import json
import math
import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from pathlib import Path


WORDS_PER_MINUTE = 200
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass(slots=True)
class BlogPost:
    title: str = ""
    slug: str = ""
    description: str = ""
    publish_date: str = ""
    category: str = "Project note"
    reading_minutes: int = 1
    body: str = ""


def slugify(value: str) -> str:
    """Create a conservative URL and filename-safe slug."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", ascii_text)).strip("-")


def estimate_reading_minutes(body: str) -> int:
    words = re.findall(r"\b[\w’'-]+\b", body, flags=re.UNICODE)
    return max(1, math.ceil(len(words) / WORDS_PER_MINUTE))


def yaml_string(value: str) -> str:
    """JSON strings are valid YAML strings and safely escape punctuation."""
    return json.dumps(value.strip(), ensure_ascii=False)


def validate_post(post: BlogPost) -> list[str]:
    errors: list[str] = []
    if not post.title.strip():
        errors.append("Enter a title.")
    if not post.slug.strip():
        errors.append("Enter a slug.")
    elif not SLUG_PATTERN.fullmatch(post.slug):
        errors.append("The slug may contain lowercase letters, numbers and single hyphens only.")
    if not post.description.strip():
        errors.append("Enter a description for listings and search results.")
    elif len(post.description.strip()) > 180:
        errors.append("Keep the description to 180 characters or fewer.")
    try:
        date.fromisoformat(post.publish_date)
    except ValueError:
        errors.append("Use a valid publish date in YYYY-MM-DD format.")
    if not post.category.strip():
        errors.append("Enter a category.")
    if post.reading_minutes < 1 or post.reading_minutes > 120:
        errors.append("Reading time must be between 1 and 120 minutes.")
    if not post.body.strip():
        errors.append("Write some post content.")
    return errors


def render_post(post: BlogPost) -> str:
    """Render the Markdown and Eleventy front matter used by the site."""
    return (
        "---\n"
        f"title: {yaml_string(post.title)}\n"
        f"description: {yaml_string(post.description)}\n"
        f"date: {post.publish_date}\n"
        f"category: {yaml_string(post.category)}\n"
        f"readingTime: {post.reading_minutes} min read\n"
        "---\n\n"
        f"{post.body.strip()}\n"
    )


def _decode_value(value: str) -> str:
    value = value.strip()
    if value.startswith('"'):
        try:
            return str(json.loads(value))
        except json.JSONDecodeError:
            pass
    return value.strip("'\"")


def parse_post(text: str, fallback_slug: str = "") -> BlogPost:
    """Load posts written by the editor or by hand in the site's usual format."""
    parts = text.split("---", 2)
    if len(parts) != 3 or parts[0].strip():
        raise ValueError("The selected file does not contain valid front matter.")

    metadata: dict[str, str] = {}
    for line in parts[1].strip().splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = _decode_value(value)

    reading_match = re.search(r"\d+", metadata.get("readingTime", "1"))
    return BlogPost(
        title=metadata.get("title", ""),
        slug=fallback_slug,
        description=metadata.get("description", ""),
        publish_date=metadata.get("date", date.today().isoformat()),
        category=metadata.get("category", "Project note"),
        reading_minutes=int(reading_match.group()) if reading_match else 1,
        body=parts[2].strip(),
    )


def safe_post_path(posts_dir: Path, slug: str) -> Path:
    if not SLUG_PATTERN.fullmatch(slug):
        raise ValueError("Invalid post slug.")
    target = (posts_dir / f"{slug}.md").resolve()
    if target.parent != posts_dir.resolve():
        raise ValueError("Post path must remain inside the posts directory.")
    return target
