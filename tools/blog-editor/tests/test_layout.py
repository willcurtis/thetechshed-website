"""Regression tests for the blog editor's responsive desktop layout."""

from __future__ import annotations

import sys
import tkinter as tk
import unittest
from pathlib import Path


EDITOR_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(EDITOR_DIR))

from blog_editor import BlogEditor  # noqa: E402


class BlogEditorLayoutTests(unittest.TestCase):
    def setUp(self) -> None:
        try:
            self.editor = BlogEditor()
        except tk.TclError as error:
            self.skipTest(f"Tk display is unavailable: {error}")

    def tearDown(self) -> None:
        if hasattr(self, "editor"):
            self.editor.destroy()

    def test_footer_actions_remain_visible_at_minimum_height(self) -> None:
        self.editor.geometry("1000x620")
        self.editor.update_idletasks()

        window_bottom = self.editor.winfo_rooty() + self.editor.winfo_height()
        button_bottom = self.editor.publish_button.winfo_rooty() + self.editor.publish_button.winfo_height()

        self.assertTrue(self.editor.footer.winfo_ismapped())
        self.assertLessEqual(button_bottom, window_bottom)
        self.assertGreater(self.editor.notebook.winfo_height(), 100)


if __name__ == "__main__":
    unittest.main()
