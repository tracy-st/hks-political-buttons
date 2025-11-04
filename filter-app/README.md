# Political Buttons — Color Browser

This is a small static UI to browse the images and color metadata in `data/colors_output.csv`.

What it does
- Loads `data/colors_output.csv` using PapaParse (browser).
- Shows a responsive grid of thumbnails (uses the `image_url` field from the CSV).
- Click a thumbnail to open a detail panel with the top colors and proportions.
- Filter by a picked color (color picker + tolerance) or by color name (red, blue, green, etc.).

How to run

Modern browsers block fetch of local files when opening `index.html` from the filesystem. Run a simple static server at the repository root and open the page in your browser:

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

Or with Node (if you have serve):

```bash
npx serve .
```

Notes
- The UI uses remote `image_url` values present in the CSV for thumbnails. If you prefer using the local `images/` directory instead, I can update the code to match filenames.
- PapaParse is loaded from CDN; if you need an offline version I can add it to the repo.

Next steps I can help with
- Add a small server script to serve local images if you want to use the `images/` directory.
- Add sorting, exports, or more advanced color-match logic (e.g., clustering).
