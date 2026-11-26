# GitHub Pages Deployment Guide

This document describes the public Out of Warranty game and its privacy policy pages on GitHub Pages.

## Publishing Steps

1. **Repository Visibility:** Ensure the repository is public (`bahattinercan/out-of-warranty`). GitHub Pages runs on free accounts for public repositories.
2. **Settings Tab:** In the GitHub repository, open **Settings** and navigate to **Pages**.
3. **Build Source:** Under **Build and deployment > Source**, select **Deploy from a branch**.
4. **Branch and Folder Settings:** Select branch `main` and folder `/ (root)`, then save.
5. **Published URLs:** The game and policies are available at:
   - Game: `https://bahattinercan.github.io/out-of-warranty/`
   - Turkish privacy policy: `https://bahattinercan.github.io/out-of-warranty/docs/privacy-and-data.html`
   - English privacy policy: `https://bahattinercan.github.io/out-of-warranty/docs/privacy-en.html`
6. **Updates & Verification:** Commits to `main` trigger a Pages deployment. Confirm all three URLs load, the game assets load without console errors, and policy text renders correctly.
7. **SEO Files:** The root `robots.txt`, `sitemap.xml`, and `llms.txt` are published with the game. After a deployment, open each URL under the project path and confirm that the sitemap's game and privacy URLs load. Run `node tests/seo.js` before publishing to check metadata, JSON-LD, and crawler files.

For the document map, see [docs index](./index.md).
