#!/usr/bin/env python3
"""Branded graphical editor for The Tech Shed Markdown blog posts."""

from __future__ import annotations

import subprocess
import threading
import tkinter as tk
from datetime import date
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from git_publisher import PublishError, publish_post
from post_model import (
    BlogPost,
    estimate_reading_minutes,
    parse_post,
    render_post,
    safe_post_path,
    slugify,
    validate_post,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
POSTS_DIR = PROJECT_ROOT / "src" / "posts"
LOGO_PATH = PROJECT_ROOT / "src" / "images" / "tts-round-outline.png"

BG = "#0a0a0a"
SURFACE = "#111713"
SURFACE_RAISED = "#17211d"
TEXT = "#e8f2ed"
MUTED = "#a7bab1"
ACCENT = "#36f9b0"
FOCUS = "#fff06a"
BORDER = "#29443a"


class BlogEditor(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("The Tech Shed · Blog Post Editor")
        self.geometry("1120x780")
        self.minsize(900, 620)
        self.configure(bg=BG)
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        self.current_path: Path | None = None
        self.slug_is_manual = False
        self._preview_job: str | None = None
        self._logo: tk.PhotoImage | None = None

        self.title_var = tk.StringVar()
        self.slug_var = tk.StringVar()
        self.description_var = tk.StringVar()
        self.date_var = tk.StringVar(value=date.today().isoformat())
        self.category_var = tk.StringVar(value="Project note")
        self.reading_var = tk.IntVar(value=1)
        self.status_var = tk.StringVar(value="Ready · posts inherit The Tech Shed branding automatically")

        self._configure_style()
        self._build_ui()
        self._bind_events()
        self._insert_starter_content()
        self._update_preview()

    def _configure_style(self) -> None:
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("TFrame", background=BG)
        style.configure("Panel.TFrame", background=SURFACE)
        style.configure("TLabel", background=BG, foreground=TEXT, font=("Helvetica Neue", 11))
        style.configure("Muted.TLabel", foreground=MUTED)
        style.configure("Accent.TLabel", foreground=ACCENT, font=("Helvetica Neue", 10, "bold"))
        style.configure("Title.TLabel", foreground=TEXT, font=("Helvetica Neue", 22, "bold"))
        style.configure("Panel.TLabel", background=SURFACE, foreground=TEXT)
        style.configure("TEntry", fieldbackground=SURFACE_RAISED, foreground=TEXT, insertcolor=ACCENT, bordercolor=BORDER, padding=7)
        style.configure("TCombobox", fieldbackground=SURFACE_RAISED, foreground=TEXT, arrowcolor=ACCENT, bordercolor=BORDER, padding=6)
        style.map("TCombobox", fieldbackground=[("readonly", SURFACE_RAISED)], foreground=[("readonly", TEXT)])
        style.configure("TButton", background=SURFACE_RAISED, foreground=TEXT, bordercolor=BORDER, padding=(12, 8), font=("Helvetica Neue", 10, "bold"))
        style.map("TButton", background=[("active", BORDER)], foreground=[("active", TEXT)])
        style.configure("Accent.TButton", background=ACCENT, foreground="#00140d", bordercolor=ACCENT)
        style.map("Accent.TButton", background=[("active", "#ffffff")], foreground=[("active", "#00140d")])
        style.configure("TNotebook", background=BG, borderwidth=0)
        style.configure("TNotebook.Tab", background=SURFACE, foreground=MUTED, padding=(14, 8))
        style.map("TNotebook.Tab", background=[("selected", SURFACE_RAISED)], foreground=[("selected", ACCENT)])

    def _build_ui(self) -> None:
        header = ttk.Frame(self)
        header.grid(row=0, column=0, sticky="ew", padx=24, pady=(20, 12))

        if LOGO_PATH.exists():
            try:
                source = tk.PhotoImage(file=str(LOGO_PATH))
                factor = max(1, source.width() // 72)
                self._logo = source.subsample(factor, factor)
                ttk.Label(header, image=self._logo).pack(side="left", padx=(0, 14))
                self.iconphoto(True, self._logo)
            except tk.TclError:
                self._logo = None

        heading = ttk.Frame(header)
        heading.pack(side="left", fill="x", expand=True)
        ttk.Label(heading, text="THE TECH SHED", style="Accent.TLabel").pack(anchor="w")
        ttk.Label(heading, text="Blog Post Editor", style="Title.TLabel").pack(anchor="w")
        ttk.Label(heading, text="Create branded, database-free project notes.", style="Muted.TLabel").pack(anchor="w")

        header_actions = ttk.Frame(header)
        header_actions.pack(side="right")
        ttk.Button(header_actions, text="New", command=self.new_post).pack(side="left", padx=4)
        ttk.Button(header_actions, text="Open…", command=self.open_post).pack(side="left", padx=4)
        ttk.Button(header_actions, text="Save", style="Accent.TButton", command=self.save_post).pack(side="left", padx=4)

        metadata = ttk.Frame(self, style="Panel.TFrame", padding=16)
        metadata.grid(row=1, column=0, sticky="ew", padx=24, pady=(0, 12))
        metadata.columnconfigure(1, weight=2)
        metadata.columnconfigure(3, weight=1)

        self._field(metadata, "Title", self.title_var, 0, 0, span=3)
        self._field(metadata, "Slug", self.slug_var, 1, 0)
        self._field(metadata, "Publish date", self.date_var, 1, 2)
        self._field(metadata, "Description", self.description_var, 2, 0, span=3)

        ttk.Label(metadata, text="Category", style="Panel.TLabel").grid(row=3, column=0, sticky="w", padx=(0, 8), pady=(8, 0))
        categories = ("Project note", "Build log", "Tool note", "Tutorial", "Networking", "Automation", "Open source")
        ttk.Combobox(metadata, textvariable=self.category_var, values=categories).grid(row=3, column=1, sticky="ew", padx=(0, 18), pady=(8, 0))
        ttk.Label(metadata, text="Reading time", style="Panel.TLabel").grid(row=3, column=2, sticky="w", padx=(0, 8), pady=(8, 0))
        ttk.Spinbox(metadata, from_=1, to=120, textvariable=self.reading_var, width=8).grid(row=3, column=3, sticky="w", pady=(8, 0))

        self.notebook = ttk.Notebook(self)
        self.notebook.grid(row=2, column=0, sticky="nsew", padx=24, pady=(0, 12))
        editor_tab = ttk.Frame(self.notebook, style="Panel.TFrame")
        preview_tab = ttk.Frame(self.notebook, style="Panel.TFrame")
        self.notebook.add(editor_tab, text="Write")
        self.notebook.add(preview_tab, text="Markdown preview")

        toolbar = ttk.Frame(editor_tab, style="Panel.TFrame", padding=(10, 8))
        toolbar.pack(fill="x")
        ttk.Button(toolbar, text="Heading", command=lambda: self._insert_markup("\n## Heading\n\n", 4, 11)).pack(side="left", padx=3)
        ttk.Button(toolbar, text="Subheading", command=lambda: self._insert_markup("\n### Subheading\n\n", 5, 15)).pack(side="left", padx=3)
        ttk.Button(toolbar, text="Bold", command=lambda: self._wrap_selection("**", "**", "important text")).pack(side="left", padx=3)
        ttk.Button(toolbar, text="Link", command=lambda: self._wrap_selection("[", "](https://example.com)", "link text")).pack(side="left", padx=3)
        ttk.Button(toolbar, text="Code", command=lambda: self._wrap_selection("`", "`", "command")).pack(side="left", padx=3)
        ttk.Button(toolbar, text="Estimate reading time", command=self.estimate_time).pack(side="right", padx=3)

        self.body_text = tk.Text(editor_tab, wrap="word", undo=True, bg=SURFACE_RAISED, fg=TEXT, insertbackground=ACCENT, selectbackground=BORDER, relief="flat", padx=16, pady=14, font=("SF Mono", 12), spacing1=2, spacing3=4)
        self.body_text.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        self.preview_text = tk.Text(preview_tab, wrap="word", state="disabled", bg=SURFACE_RAISED, fg=MUTED, relief="flat", padx=16, pady=14, font=("SF Mono", 11))
        self.preview_text.pack(fill="both", expand=True, padx=10, pady=10)

        self.footer = ttk.Frame(self)
        self.footer.grid(row=3, column=0, sticky="ew", padx=24, pady=(0, 18))
        ttk.Label(self.footer, textvariable=self.status_var, style="Muted.TLabel").pack(side="left", fill="x", expand=True)
        self.save_build_button = ttk.Button(self.footer, text="Save & build site", style="Accent.TButton", command=self.save_and_build)
        self.save_build_button.pack(side="right", padx=(8, 0))
        self.build_button = ttk.Button(self.footer, text="Build site", command=self.build_site)
        self.build_button.pack(side="right")
        self.publish_button = ttk.Button(self.footer, text="Commit & merge post", command=self.publish_current_post)
        self.publish_button.pack(side="right", padx=(0, 8))

    def _field(self, parent: ttk.Frame, label: str, variable: tk.Variable, row: int, column: int, span: int = 1) -> None:
        ttk.Label(parent, text=label, style="Panel.TLabel").grid(row=row, column=column, sticky="w", padx=(0, 8), pady=(0 if row == 0 else 8, 0))
        ttk.Entry(parent, textvariable=variable).grid(row=row, column=column + 1, columnspan=span, sticky="ew", padx=(0, 18 if column < 2 else 0), pady=(0 if row == 0 else 8, 0))

    def _bind_events(self) -> None:
        self.title_var.trace_add("write", self._title_changed)
        for variable in (self.title_var, self.slug_var, self.description_var, self.date_var, self.category_var, self.reading_var):
            variable.trace_add("write", self._schedule_preview)
        self.body_text.bind("<<Modified>>", self._body_changed)
        self.slug_var.trace_add("write", self._slug_changed)
        self.bind("<Control-s>", lambda _event: self.save_post())
        self.bind("<Command-s>", lambda _event: self.save_post())
        self.protocol("WM_DELETE_WINDOW", self.destroy)

    def _insert_starter_content(self) -> None:
        self.body_text.insert("1.0", "## What I built\n\nIntroduce the project and the problem it solves.\n\n## How it works\n\nExplain the useful technical details, decisions and lessons.\n\n## Find out more\n\n[Explore the project on GitHub](https://github.com/willcurtis).\n")
        self.body_text.edit_modified(False)

    def _title_changed(self, *_args: object) -> None:
        if not self.slug_is_manual:
            self.slug_var.set(slugify(self.title_var.get()))

    def _slug_changed(self, *_args: object) -> None:
        expected = slugify(self.title_var.get())
        value = self.slug_var.get()
        if value and value != expected:
            self.slug_is_manual = True

    def _body_changed(self, _event: tk.Event) -> None:
        if self.body_text.edit_modified():
            self.body_text.edit_modified(False)
            self._schedule_preview()

    def _schedule_preview(self, *_args: object) -> None:
        if self._preview_job:
            self.after_cancel(self._preview_job)
        self._preview_job = self.after(180, self._update_preview)

    def _collect_post(self) -> BlogPost:
        try:
            reading = int(self.reading_var.get())
        except (tk.TclError, ValueError):
            reading = 0
        return BlogPost(
            title=self.title_var.get(),
            slug=self.slug_var.get().strip(),
            description=self.description_var.get(),
            publish_date=self.date_var.get().strip(),
            category=self.category_var.get(),
            reading_minutes=reading,
            body=self.body_text.get("1.0", "end-1c"),
        )

    def _update_preview(self) -> None:
        self._preview_job = None
        source = render_post(self._collect_post())
        self.preview_text.configure(state="normal")
        self.preview_text.delete("1.0", "end")
        self.preview_text.insert("1.0", source)
        self.preview_text.configure(state="disabled")

    def _insert_markup(self, text: str, select_start: int, select_end: int) -> None:
        index = self.body_text.index("insert")
        self.body_text.insert(index, text)
        start = f"{index}+{select_start}c"
        end = f"{index}+{select_end}c"
        self.body_text.tag_add("sel", start, end)
        self.body_text.mark_set("insert", end)
        self.body_text.focus_set()

    def _wrap_selection(self, before: str, after: str, placeholder: str) -> None:
        try:
            selected = self.body_text.get("sel.first", "sel.last")
            start = self.body_text.index("sel.first")
            self.body_text.delete("sel.first", "sel.last")
        except tk.TclError:
            selected = placeholder
            start = self.body_text.index("insert")
        replacement = f"{before}{selected}{after}"
        self.body_text.insert(start, replacement)
        self.body_text.tag_add("sel", f"{start}+{len(before)}c", f"{start}+{len(before) + len(selected)}c")
        self.body_text.focus_set()

    def estimate_time(self) -> None:
        minutes = estimate_reading_minutes(self.body_text.get("1.0", "end-1c"))
        self.reading_var.set(minutes)
        self.status_var.set(f"Estimated reading time: {minutes} minute{'s' if minutes != 1 else ''}")

    def new_post(self) -> None:
        self.current_path = None
        self.slug_is_manual = False
        self.title_var.set("")
        self.slug_var.set("")
        self.description_var.set("")
        self.date_var.set(date.today().isoformat())
        self.category_var.set("Project note")
        self.reading_var.set(1)
        self.body_text.delete("1.0", "end")
        self._insert_starter_content()
        self.status_var.set("New post · complete the fields and save when ready")

    def open_post(self) -> None:
        path_string = filedialog.askopenfilename(initialdir=POSTS_DIR, title="Open blog post", filetypes=(("Markdown posts", "*.md"), ("All files", "*.*")))
        if not path_string:
            return
        path = Path(path_string)
        try:
            post = parse_post(path.read_text(encoding="utf-8"), fallback_slug=path.stem)
        except (OSError, UnicodeError, ValueError) as exc:
            messagebox.showerror("Could not open post", str(exc), parent=self)
            return
        self.current_path = path
        self.slug_is_manual = False
        self.title_var.set(post.title)
        self.slug_var.set(post.slug)
        self.description_var.set(post.description)
        self.date_var.set(post.publish_date)
        self.category_var.set(post.category)
        self.reading_var.set(post.reading_minutes)
        self.body_text.delete("1.0", "end")
        self.body_text.insert("1.0", post.body)
        self.body_text.edit_modified(False)
        self.status_var.set(f"Opened {path.name}")
        self._update_preview()

    def save_post(self) -> bool:
        post = self._collect_post()
        errors = validate_post(post)
        if errors:
            messagebox.showerror("Post needs attention", "\n\n".join(errors), parent=self)
            return False
        POSTS_DIR.mkdir(parents=True, exist_ok=True)
        try:
            target = safe_post_path(POSTS_DIR, post.slug)
        except ValueError as exc:
            messagebox.showerror("Invalid filename", str(exc), parent=self)
            return False
        if target.exists() and target != self.current_path:
            replace = messagebox.askyesno("Post already exists", f"Replace {target.name}?", parent=self, icon="warning")
            if not replace:
                return False
        try:
            target.write_text(render_post(post), encoding="utf-8")
        except OSError as exc:
            messagebox.showerror("Could not save post", str(exc), parent=self)
            return False
        self.current_path = target
        self.status_var.set(f"Saved {target.relative_to(PROJECT_ROOT)}")
        return True

    def save_and_build(self) -> None:
        if self.save_post():
            self.build_site()

    def build_site(self) -> None:
        self.status_var.set("Building the site…")
        self._set_build_buttons("disabled")
        threading.Thread(target=self._run_build, daemon=True).start()

    def _set_build_buttons(self, state: str) -> None:
        self.build_button.configure(state=state)
        self.save_build_button.configure(state=state)
        self.publish_button.configure(state=state)

    def _run_build(self) -> None:
        try:
            result = subprocess.run(["npm", "run", "build"], cwd=PROJECT_ROOT, text=True, capture_output=True, timeout=180, check=False)
        except (OSError, subprocess.TimeoutExpired) as exc:
            self.after(0, lambda: self._build_finished(False, str(exc)))
            return
        output = (result.stdout + "\n" + result.stderr).strip()
        self.after(0, lambda: self._build_finished(result.returncode == 0, output))

    def _build_finished(self, success: bool, output: str) -> None:
        self._set_build_buttons("normal")
        if success:
            self.status_var.set("Site build complete · output is ready in _site/")
            messagebox.showinfo("Build complete", "The post is published into the local _site build.", parent=self)
        else:
            self.status_var.set("Build failed · review the error message")
            messagebox.showerror("Build failed", output[-2500:] or "The build returned an error.", parent=self)

    def publish_current_post(self) -> None:
        if not self.save_post() or self.current_path is None:
            return
        post = self._collect_post()
        confirmed = messagebox.askyesno(
            "Commit and merge this post?",
            (
                f"Post: {self.current_path.relative_to(PROJECT_ROOT)}\n"
                "Destination: GitHub origin/main\n\n"
                "The editor will build the site, create a temporary branch, commit only this post, "
                "open a pull request and merge it.\n\nContinue?"
            ),
            parent=self,
            icon="question",
        )
        if not confirmed:
            self.status_var.set("GitHub publication cancelled")
            return
        self.status_var.set("Validating, committing and merging the post…")
        self._set_build_buttons("disabled")
        threading.Thread(target=self._run_publish, args=(post,), daemon=True).start()

    def _run_publish(self, post: BlogPost) -> None:
        try:
            build = subprocess.run(
                ["npm", "run", "build"],
                cwd=PROJECT_ROOT,
                text=True,
                capture_output=True,
                timeout=180,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            self.after(0, lambda message=str(exc): self._publish_failed(f"The site build could not run.\n\n{message}"))
            return
        if build.returncode != 0:
            output = (build.stdout + "\n" + build.stderr).strip()
            self.after(0, lambda: self._publish_failed(f"The site build failed.\n\n{output[-2500:]}"))
            return
        try:
            result = publish_post(PROJECT_ROOT, self.current_path, post.title, post.slug)
        except (PublishError, OSError, subprocess.TimeoutExpired) as exc:
            self.after(0, lambda message=str(exc): self._publish_failed(message))
            return
        self.after(0, lambda: self._publish_finished(result.commit, result.pull_request_url))

    def _publish_failed(self, message: str) -> None:
        self._set_build_buttons("normal")
        self.status_var.set("GitHub publication stopped safely")
        messagebox.showerror("Could not publish post", message, parent=self)

    def _publish_finished(self, commit: str, pull_request_url: str) -> None:
        self._set_build_buttons("normal")
        self.status_var.set(f"Published and merged · commit {commit}")
        messagebox.showinfo(
            "Post published",
            f"The post was committed, pushed and merged into main.\n\n{pull_request_url}",
            parent=self,
        )


if __name__ == "__main__":
    BlogEditor().mainloop()
