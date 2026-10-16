#!/usr/bin/env python3
"""Create and delete project pages so they match data/projects.json.

Each entry gets an index.html rendered from projects/template.html.
Folders under projects/ and hackathons/ that are no longer listed are removed.

An entry with "redirect" is only a link. No page is generated for it, and
repoUrl is ignored. That keeps a same-domain GitHub Pages project, such as
/MineMaps, from being replaced by a README writeup in this repo.
"""

import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "projects.json"
TEMPLATE_PATH = ROOT / "projects" / "template.html"
SITEMAP_PATH = ROOT / "sitemap.xml"
SITE_ORIGIN = "https://hrgsen.one"

MANAGED_ROOTS = ("projects", "hackathons")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
REDIRECT_PATH = re.compile(r"^/[A-Za-z0-9][A-Za-z0-9._-]*$")
RESERVED_REDIRECTS = {"/projects", "/hackathons"}

DATE_BLOCK = """<div class="project-date">
                                <span>Project started: {date}</span>
                            </div>"""

REPO_BLOCK = """<div class="project-repo">
                                <a href="{url}" target="_blank" rel="noopener noreferrer">
                                    <img src="/img/social-logos/GitHub.png" alt="GitHub">
                                    <span>View on GitHub</span>
                                </a>
                            </div>"""


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def normalize_redirect(project, index):
    raw = project.get("redirect")
    if raw is None or raw == "":
        return None
    label = project.get("id", index)
    if not isinstance(raw, str):
        fail(f"{label} redirect must be a string")

    value = raw.strip()
    if value.startswith(("http://", "https://")):
        return value

    value = value.rstrip("/")
    if not REDIRECT_PATH.match(value) or value.lower() in RESERVED_REDIRECTS:
        fail(
            f"{label} redirect {raw!r} must be a first-level path like /MineMaps "
            "or an absolute http(s) URL"
        )
    return value


def publishes_page(project):
    return not project.get("redirect")


def load_projects():
    try:
        projects = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"missing {DATA_PATH.relative_to(ROOT)}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {DATA_PATH.relative_to(ROOT)}: {exc}")

    if not isinstance(projects, list):
        fail("data/projects.json must be an array")

    seen_paths = set()
    seen_redirects = set()
    for index, project in enumerate(projects):
        if not isinstance(project, dict):
            fail(f"entry {index} is not an object")
        for key in ("id", "title"):
            if not project.get(key):
                fail(f"entry {index} ({project.get('id', '?')}) is missing {key}")

        redirect = normalize_redirect(project, index)
        if redirect:
            if redirect in seen_redirects:
                fail(f"duplicate redirect {redirect}")
            seen_redirects.add(redirect)
            project["redirect"] = redirect
            continue

        for key in ("path", "markdownUrl"):
            if not project.get(key):
                fail(f"entry {index} ({project.get('id', '?')}) is missing {key}")

        path = project["path"]
        parts = path.strip("/").split("/")
        if len(parts) != 2 or parts[0] not in MANAGED_ROOTS or not SLUG.match(parts[1]):
            fail(
                f"{project['id']} has path {path!r}; "
                "expected /projects/<slug> or /hackathons/<slug>"
            )
        if path in seen_paths:
            fail(f"duplicate path {path}")
        seen_paths.add(path)

    return projects


def render(project, template):
    date = project.get("startDate") or project.get("year") or ""
    date_block = DATE_BLOCK.format(date=html.escape(date)) if date else ""

    repo_url = project.get("repoUrl") or ""
    repo_block = (
        REPO_BLOCK.format(url=html.escape(repo_url, quote=True)) if repo_url else ""
    )

    robots = (
        '\n    <meta name="robots" content="noindex, nofollow" />'
        if project.get("noindex")
        else ""
    )

    replacements = {
        "{{TITLE}}": html.escape(project["title"]),
        "{{DESCRIPTION}}": html.escape(project.get("description") or "", quote=True),
        "{{ROBOTS}}": robots,
        "{{DATE_BLOCK}}": date_block,
        "{{REPO_BLOCK}}": repo_block,
        "{{MARKDOWN_URL}}": json.dumps(project["markdownUrl"]),
    }

    page = template
    for token, value in replacements.items():
        if token not in page:
            fail(f"template is missing {token}")
        page = page.replace(token, value)

    leftover = re.findall(r"\{\{[A-Z0-9_]+\}\}", page)
    if leftover:
        fail("template still has placeholders: " + ", ".join(leftover))
    return page


def page_path(project):
    return ROOT / project["path"].strip("/") / "index.html"


def sync_pages(projects, template):
    created, updated, unchanged = [], [], []

    for project in projects:
        if not publishes_page(project):
            continue
        destination = page_path(project)
        destination.parent.mkdir(parents=True, exist_ok=True)
        rendered = render(project, template)
        relative = destination.relative_to(ROOT).as_posix()

        if not destination.exists():
            destination.write_text(rendered, encoding="utf-8")
            created.append(relative)
        elif destination.read_text(encoding="utf-8") != rendered:
            destination.write_text(rendered, encoding="utf-8")
            updated.append(relative)
        else:
            unchanged.append(relative)

    return created, updated, unchanged


def sync_deletions(projects):
    wanted = {
        project["path"].strip("/")
        for project in projects
        if publishes_page(project)
    }
    deleted = []

    for root_name in MANAGED_ROOTS:
        root = ROOT / root_name
        if not root.is_dir():
            continue
        for child in sorted(root.iterdir()):
            if not child.is_dir():
                continue
            relative = f"{root_name}/{child.name}"
            if relative in wanted:
                continue

            files = [path for path in child.rglob("*") if path.is_file()]
            if files != [child / "index.html"]:
                print(
                    f"skipped {relative}: folder has files other than index.html",
                    file=sys.stderr,
                )
                continue

            shutil.rmtree(child)
            deleted.append(relative + "/")

    return deleted


def sync_sitemap(projects):
    locs = [
        f"{SITE_ORIGIN}/",
        f"{SITE_ORIGIN}/projects/",
    ]
    for project in projects:
        if not publishes_page(project) or project.get("noindex"):
            continue
        locs.append(f"{SITE_ORIGIN}{project['path'].rstrip('/')}/")

    # Home and the directory stay first; project URLs follow in path order.
    head, tail = locs[:2], sorted(set(locs[2:]))
    urls = []
    for index, loc in enumerate(head + tail):
        priority = "1.0" if index == 0 else "0.9" if index == 1 else "0.7"
        urls.append(
            "  <url>\n"
            f"    <loc>{html.escape(loc)}</loc>\n"
            f"    <priority>{priority}</priority>\n"
            "  </url>"
        )

    sitemap = (
        '<?xml version="1.0" encoding="utf-8" standalone="yes"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '  xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )

    previous = SITEMAP_PATH.read_text(encoding="utf-8") if SITEMAP_PATH.exists() else ""
    if previous != sitemap:
        SITEMAP_PATH.write_text(sitemap, encoding="utf-8")
        return True
    return False


def warn_redirect_collisions(projects):
    for project in projects:
        redirect = project.get("redirect") or ""
        if not redirect.startswith("/") or redirect.startswith("//"):
            continue
        segment = redirect.strip("/").split("/")[0]
        candidate = ROOT / segment
        if candidate.exists():
            print(
                f"warning: {candidate.relative_to(ROOT)} is in this repo and "
                f"uses the same URL as {project['id']} ({redirect})",
                file=sys.stderr,
            )


def main():
    if not TEMPLATE_PATH.is_file():
        fail(f"missing {TEMPLATE_PATH.relative_to(ROOT)}")

    projects = load_projects()
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    warn_redirect_collisions(projects)
    created, updated, unchanged = sync_pages(projects, template)
    deleted = sync_deletions(projects)
    sitemap_changed = sync_sitemap(projects)

    redirects = [project for project in projects if project.get("redirect")]
    print(f"projects in JSON: {len(projects)}")
    print(f"redirects (no page generated): {len(redirects)}")
    for project in redirects:
        print(f"  → {project['id']} {project['redirect']}")
    print(f"created: {len(created)}")
    for path in created:
        print(f"  + {path}")
    print(f"updated: {len(updated)}")
    for path in updated:
        print(f"  ~ {path}")
    print(f"unchanged: {len(unchanged)}")
    print(f"deleted: {len(deleted)}")
    for path in deleted:
        print(f"  - {path}")
    print("sitemap: updated" if sitemap_changed else "sitemap: unchanged")


if __name__ == "__main__":
    main()
