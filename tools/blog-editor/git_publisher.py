"""Guarded GitHub publishing workflow for a single blog post."""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Sequence


CommandRunner = Callable[[Sequence[str], Path], subprocess.CompletedProcess[str]]


class PublishError(RuntimeError):
    """A safe, user-facing publishing failure."""


@dataclass(frozen=True, slots=True)
class PublishResult:
    branch: str
    commit: str
    pull_request_url: str


def run_command(args: Sequence[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(args),
        cwd=cwd,
        text=True,
        capture_output=True,
        timeout=180,
        check=False,
    )


def changed_paths(porcelain_output: str) -> set[str]:
    """Extract paths from `git status --porcelain=v1` output."""
    paths: set[str] = set()
    for line in porcelain_output.splitlines():
        if len(line) < 4:
            continue
        value = line[3:].strip()
        if " -> " in value:
            value = value.split(" -> ", 1)[1]
        paths.add(value.strip('"'))
    return paths


def make_branch_name(slug: str, now: datetime | None = None) -> str:
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise PublishError("The post slug is not safe for a Git branch.")
    timestamp = (now or datetime.now(timezone.utc)).strftime("%Y%m%d-%H%M%S")
    return f"codex/blog-{slug}-{timestamp}"


def _checked(
    runner: CommandRunner,
    args: Sequence[str],
    cwd: Path,
    failure_message: str,
) -> subprocess.CompletedProcess[str]:
    try:
        result = runner(args, cwd)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise PublishError(f"{failure_message}\n\n{exc}") from exc
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise PublishError(f"{failure_message}\n\n{detail}".strip())
    return result


def publish_post(
    project_root: Path,
    post_path: Path,
    title: str,
    slug: str,
    runner: CommandRunner = run_command,
) -> PublishResult:
    """Commit one post on a branch, open a PR, and merge it into origin/main."""
    root = project_root.resolve()
    post = post_path.resolve()
    posts_dir = (root / "src" / "posts").resolve()
    if post.parent != posts_dir or post.suffix != ".md":
        raise PublishError("Only Markdown files inside src/posts can be published.")

    relative_post = post.relative_to(root).as_posix()
    _checked(runner, ["gh", "auth", "status"], root, "GitHub CLI is not authenticated. Run `gh auth login` first.")

    branch_result = _checked(runner, ["git", "branch", "--show-current"], root, "Could not determine the current Git branch.")
    current_branch = branch_result.stdout.strip()
    if current_branch != "main":
        raise PublishError(f"Publishing must start on main. The current branch is {current_branch or 'unknown'}.")

    status_result = _checked(runner, ["git", "status", "--porcelain=v1", "--untracked-files=all"], root, "Could not inspect repository changes.")
    changes = changed_paths(status_result.stdout)
    if relative_post not in changes:
        raise PublishError("This post has no uncommitted changes to publish.")
    unrelated = sorted(changes - {relative_post})
    if unrelated:
        preview = "\n".join(f"• {path}" for path in unrelated[:12])
        extra = f"\n• …and {len(unrelated) - 12} more" if len(unrelated) > 12 else ""
        raise PublishError(f"Commit or set aside these unrelated changes first:\n\n{preview}{extra}")

    _checked(runner, ["git", "fetch", "origin", "main"], root, "Could not refresh origin/main.")
    sync_result = _checked(runner, ["git", "rev-list", "--left-right", "--count", "main...origin/main"], root, "Could not compare main with origin/main.")
    if sync_result.stdout.strip() != "0\t0" and sync_result.stdout.split() != ["0", "0"]:
        raise PublishError("Local main and origin/main differ. Pull or resolve the branch before publishing.")

    branch = make_branch_name(slug)
    _checked(runner, ["git", "switch", "-c", branch], root, "Could not create the publishing branch.")
    _checked(runner, ["git", "add", "--", relative_post], root, "Could not stage the blog post.")
    _checked(runner, ["git", "commit", "-m", f"Publish blog post: {title}"], root, "Could not commit the blog post.")
    commit_result = _checked(runner, ["git", "rev-parse", "--short", "HEAD"], root, "Could not read the new commit identifier.")
    commit = commit_result.stdout.strip()
    _checked(runner, ["git", "push", "-u", "origin", branch], root, "Could not push the publishing branch.")

    body = (
        f"## Blog post\n\nPublishes **{title}** from `{relative_post}`.\n\n"
        "## Validation\n\n- generated through the Tech Shed Blog Post Editor\n"
        "- production site build completed before publication\n"
    )
    pr_result = _checked(
        runner,
        [
            "gh", "pr", "create", "--base", "main", "--head", branch,
            "--title", f"Publish blog post: {title}", "--body", body,
        ],
        root,
        "Could not create the pull request.",
    )
    pull_request_url = pr_result.stdout.strip().splitlines()[-1]
    if not pull_request_url.startswith("https://"):
        raise PublishError("GitHub did not return a pull request URL; the branch was pushed but not merged.")

    _checked(
        runner,
        ["gh", "pr", "merge", pull_request_url, "--merge", "--delete-branch"],
        root,
        f"The pull request was created but could not be merged automatically: {pull_request_url}",
    )
    return PublishResult(branch=branch, commit=commit, pull_request_url=pull_request_url)
