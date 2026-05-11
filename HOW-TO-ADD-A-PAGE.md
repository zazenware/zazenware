# How to add a new page

This is the canonical pattern for any new public-facing HTML page in `/frontend`.

## 1. Copy the template

Copy `frontend/_page-template.html` (added in E-04) to a new file, e.g., `frontend/about.html`.

## 2. Update the `<title>`

```html
<title>About — zazenware</title>
```

Format: `Page Name — zazenware`.

## 3. Update the `<meta name="description">`

One sentence, plain English, under 160 characters.

## 4. Replace `<main>` content

Anything between `<main id="main-content">` and `</main>`. Keep the `id="main-content"` exactly — the skip-to-content link points to it.

## 5. Use real semantic landmarks

Every page must have, in order:

1. Skip-to-content link (first focusable element — provided by the header partial)
2. `<header>` (injected via `<div id="site-header"></div>`)
3. `<main id="main-content">` (your unique content)
4. `<footer>` (injected via `<div id="site-footer"></div>`)

## 6. Add the page to the footer

Edit `frontend/partials/footer.html` if the page should be linked from every page.

## 7. Verify

- Tab from the address bar: first focusable element is the skip link
- Exactly one `<h1>` on the page
- `<html lang="en">` is present
- The page loads correctly when served from `npx serve frontend`

---

## Forbidden on any page

- Multiple `<h1>` tags
- Skipped heading levels (e.g., `<h1>` → `<h3>`)
- Hardcoded hex colour values (use `var(--zw-*)` tokens from `styles/tokens.css`)
- Inline `<style>` blocks
- Inline event handlers (`onclick`, `onsubmit`, etc.)
