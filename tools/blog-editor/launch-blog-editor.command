#!/bin/zsh
set -e
cd "${0:A:h}"
exec python3 blog_editor.py
