# Tech Shed Blog Post Editor

A branded graphical editor for creating the Markdown posts used by the website. It uses Python's built-in Tkinter toolkit and does not require a database or additional Python packages.

## Launch on macOS

Double-click `launch-blog-editor.command`, or run:

```sh
python3 tools/blog-editor/blog_editor.py
```

The editor uses the original Tech Shed logo and colour palette. New posts are saved to `src/posts/<slug>.md`; Eleventy automatically applies the website's shared layout and branding.

## Features

- automatic safe slug generation
- required metadata and date validation
- description-length checks
- reading-time estimation
- Markdown formatting helpers
- finished source preview
- opening and editing existing posts
- overwrite confirmation
- optional site build after saving
- guarded commit, pull-request and merge workflow for the current post

No content is uploaded anywhere. Everything is written locally to the repository.

## Commit and merge

The **Commit & merge post** button:

1. saves and validates the current post;
2. asks for confirmation showing the exact file and `origin/main` destination;
3. runs the production site build;
4. requires authenticated GitHub CLI access and a synchronized `main` branch;
5. refuses to continue if unrelated repository changes are present;
6. creates a temporary branch and commits only the current Markdown file;
7. pushes, opens a pull request and merges it into `main`.

Install and authenticate the GitHub CLI before using this option:

```sh
gh auth login
```
