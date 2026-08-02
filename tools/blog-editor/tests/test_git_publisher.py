import subprocess
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from git_publisher import PublishError, changed_paths, make_branch_name, publish_post  # noqa: E402


class FakeRunner:
    def __init__(self, post_path="src/posts/new-post.md", extra_change=None):
        self.calls = []
        self.post_path = post_path
        self.extra_change = extra_change

    def __call__(self, args, cwd):
        command = list(args)
        self.calls.append(command)
        stdout = ""
        if command[:3] == ["git", "branch", "--show-current"]:
            stdout = "main\n"
        elif command[:2] == ["git", "status"]:
            stdout = f"?? {self.post_path}\n"
            if self.extra_change:
                stdout += f" M {self.extra_change}\n"
        elif command[:3] == ["git", "rev-list", "--left-right"]:
            stdout = "0\t0\n"
        elif command[:3] == ["git", "rev-parse", "--short"]:
            stdout = "abc1234\n"
        elif command[:3] == ["gh", "pr", "create"]:
            stdout = "https://github.com/example/repo/pull/1\n"
        return subprocess.CompletedProcess(command, 0, stdout, "")


class GitPublisherTests(unittest.TestCase):
    def test_changed_paths(self):
        self.assertEqual(changed_paths(" M src/posts/a.md\n?? src/posts/b.md\n"), {"src/posts/a.md", "src/posts/b.md"})

    def test_branch_name(self):
        moment = datetime(2026, 8, 2, 20, 30, 40, tzinfo=timezone.utc)
        self.assertEqual(make_branch_name("new-post", moment), "codex/blog-new-post-20260802-203040")
        with self.assertRaises(PublishError):
            make_branch_name("../unsafe", moment)

    def test_publish_runs_guarded_workflow(self):
        root = Path("/project")
        post = root / "src/posts/new-post.md"
        runner = FakeRunner()
        result = publish_post(root, post, "New post", "new-post", runner=runner)
        self.assertEqual(result.commit, "abc1234")
        self.assertEqual(result.pull_request_url, "https://github.com/example/repo/pull/1")
        self.assertIn(["git", "add", "--", "src/posts/new-post.md"], runner.calls)
        self.assertTrue(any(call[:3] == ["gh", "pr", "merge"] for call in runner.calls))

    def test_publish_refuses_unrelated_changes(self):
        root = Path("/project")
        runner = FakeRunner(extra_change="README.md")
        with self.assertRaisesRegex(PublishError, "unrelated"):
            publish_post(root, root / "src/posts/new-post.md", "New post", "new-post", runner=runner)
        self.assertFalse(any(call[:2] == ["git", "switch"] for call in runner.calls))


if __name__ == "__main__":
    unittest.main()
