# Adding & Managing Projects Guide

All project metadata and display configurations are now managed through a single central file:
📁 **`data/projects.json`**

---

## 1. Quick Add: Adding a New Project

When you build a new project, follow these two simple steps:

### Step 1: Add an entry to `data/projects.json`

Append your project object to the array in `data/projects.json`:

```json
{
  "id": "my-new-project",
  "title": "My New Project",
  "description": "Short, clear one-sentence summary for the index table.",
  "group": "Software",
  "path": "/projects/my-new-project",
  "markdownUrl": "https://raw.githubusercontent.com/rh45-one/my-new-project/refs/heads/main/README.md",
  "repoUrl": "https://github.com/rh45-one/my-new-project",
  "showOnHome": true,
  "homeOrder": 1,
  "listOrder": 1,
  "tags": ["Python", "FastAPI", "Docker"],
  "year": "2026",
  "startDate": "September 2026",
  "endDate": null,
  "status": "Active"
}
```

### Configuration Options:
- **`showOnHome`**: `true` if you want it listed in the "Selected Work" tabular ledger on the homepage; `false` to keep it only in the `/projects` directory.
- **`year`**: The year shown on the homepage ledger. Use the year the project started.
- **`startDate`**: Shown on the project page as "Project started", and used to sort every list newest first. `homeOrder` and `listOrder` only break ties when two projects share that date.
- **`group`**: Category name (`Software`, `Electronics`, `Hackathons`, or a new custom category).
- **`markdownUrl`**: The raw GitHub link to the project's README. The site will fetch and render this automatically.
- **`status`**: E.g. `"Active"`, `"Completed"`, or `"Demo"`.
- **`redirect`**: Optional. A first-level path such as `"/MineMaps"`, or a full `http(s)` URL. When this is set, portfolio links go there instead of a README page, GitHub links are hidden, and `path`, `markdownUrl`, and `repoUrl` are not used. The sync script does not generate a page for that entry.

Use `redirect` when the project is its own GitHub Pages site on this same domain. The portfolio repo is the site root. Another repo owned by the same account is served at `/<repository-name>`, so `MineMaps` is already at `/MineMaps`. Do not add a `MineMaps/` folder to this repo, and do not point `path` at that URL. A writeup page is a different path (`/projects/...`) and is not what you want for these sites.

```json
{
  "id": "minemaps",
  "title": "MineMaps",
  "description": "Minecraft-style real-world map for Android phones and Android Auto.",
  "group": "Software",
  "redirect": "/MineMaps",
  "showOnHome": true,
  "year": "2026",
  "startDate": "October 2026",
  "endDate": null,
  "status": "Active"
}
```

---

### Step 2: Generate the page

From the repo root:

```bash
python3 scripts/sync-projects.py
```

That writes `index.html` for every entry in `data/projects.json` that does not set `redirect`, using `projects/template.html`, and deletes any `projects/<slug>/` or `hackathons/<slug>/` folder that is no longer listed. Redirect entries stay in the JSON and are left alone. It also refreshes `sitemap.xml`.

Edit `projects/template.html` only when the page layout itself should change, then run the script again.

The homepage ledger and the `/projects` directory read `data/projects.json` in the browser, so they update from that file alone.
