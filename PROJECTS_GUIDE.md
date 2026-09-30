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
- **`homeOrder`**: Integer sorting order on the homepage (1 is first).
- **`listOrder`**: Integer sorting order within its category in the `/projects` directory.
- **`group`**: Category name (`Software`, `Electronics`, `Hackathons`, or a new custom category).
- **`markdownUrl`**: The raw GitHub link to the project's README. The site will fetch and render this automatically.
- **`status`**: E.g. `"Active"`, `"Completed"`, or `"Demo"`.

---

### Step 2: Generate the page

From the repo root:

```bash
python3 scripts/sync-projects.py
```

That writes `index.html` for every entry in `data/projects.json`, using `projects/template.html`, and deletes any `projects/<slug>/` or `hackathons/<slug>/` folder that is no longer listed. It also refreshes `sitemap.xml`.

Edit `projects/template.html` only when the page layout itself should change, then run the script again.

The homepage ledger and the `/projects` directory read `data/projects.json` in the browser, so they update from that file alone.
