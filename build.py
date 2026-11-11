#!/usr/bin/env python3
"""
Build FM27 Scout Lab into one HTML file.

The tool is edited as many small files under src/. This script joins them,
in the order listed in src/index.html, into a single file you can open or publish:

    python build.py                      -> writes dist/fm27-scout-lab.html
    python build.py --compare FILE       -> also checks the result is identical to FILE

Needs only Python 3 (no extra packages).

How it works: every {{include: some/file}} marker in src/index.html is replaced
by the contents of src/some/file. Nothing else is changed.
"""

import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
TEMPLATE = os.path.join(SRC, "index.html")
OUT_DIR = os.path.join(ROOT, "dist")
OUT = os.path.join(OUT_DIR, "fm27-scout-lab.html")

MARKER = re.compile(r"\{\{include: ([^}]+)\}\}")


def read_text(path):
    with open(path, "rb") as handle:
        text = handle.read().decode("utf-8")
    # Keep line endings consistent even if Windows converted them.
    return text.replace("\r\n", "\n")


def load_part(name):
    path = os.path.normpath(os.path.join(SRC, name.strip()))
    if not path.startswith(SRC + os.sep):
        sys.exit("ERROR: include points outside src/: " + name)
    if not os.path.isfile(path):
        sys.exit("ERROR: src/index.html lists a file that does not exist: src/" + name)
    text = read_text(path)
    # Each file ends with one line break of its own; the template supplies the join.
    if text.endswith("\n"):
        text = text[:-1]
    return text


def build():
    if not os.path.isfile(TEMPLATE):
        sys.exit("ERROR: cannot find " + TEMPLATE)
    template = read_text(TEMPLATE)
    used = []

    def replace(match):
        used.append(match.group(1).strip())
        return load_part(match.group(1))

    # A function is used so file contents are inserted exactly as they are.
    html = MARKER.sub(replace, template)
    return html, used


def unused_files(used):
    listed = set(os.path.normpath(u) for u in used)
    extra = []
    for folder, _dirs, files in os.walk(SRC):
        for name in files:
            rel = os.path.relpath(os.path.join(folder, name), SRC)
            if rel != "index.html" and os.path.normpath(rel) not in listed:
                extra.append(rel.replace(os.sep, "/"))
    return sorted(extra)


def main():
    compare = None
    args = sys.argv[1:]
    if args and args[0] == "--compare":
        if len(args) < 2:
            sys.exit("Usage: python build.py --compare FILE")
        compare = args[1]

    html, used = build()
    data = html.encode("utf-8")
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, "wb") as handle:
        handle.write(data)

    print("Built dist/fm27-scout-lab.html from %d files (%d KB)." % (len(set(used)), len(data) // 1024))

    extra = unused_files(used)
    if extra:
        print("WARNING: these files are in src/ but not listed in src/index.html, so they are NOT in the build:")
        for name in extra:
            print("  - " + name)

    if compare:
        with open(compare, "rb") as handle:
            other = handle.read().replace(b"\r\n", b"\n")
        if other == data:
            print("IDENTICAL to " + compare + " (sha256 " + hashlib.sha256(data).hexdigest()[:16] + "...)")
        else:
            print("DIFFERENT from " + compare)
            sys.exit(1)


if __name__ == "__main__":
    main()
