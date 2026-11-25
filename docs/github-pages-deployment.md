# GitHub Pages Deployment Guide

This document describes the steps for publishing Out of Warranty documentation and privacy policy pages via GitHub Pages from the `/docs` folder.

## Publishing Steps

1. **Repository Visibility:** Ensure the repository is public (`bahattinercan/out-of-warranty`). GitHub Pages runs on free accounts for public repositories.
2. **Settings Tab:** In the GitHub repository, open the **Settings** tab and navigate to **Pages** in the left sidebar.
3. **Build Source:** Under **Build and deployment > Source**, select **Deploy from a branch**.
4. **Branch and Folder Settings:** In the **Branch** dropdown, select `main`, and in the folder dropdown, select `/docs`. Click **Save**.
5. **Initial Build:** Once saved, the first build takes about one minute; progress can be monitored under the **Actions** tab in the `pages-build-deployment` workflow.
6. **Published URLs:** When the build completes, the pages will be accessible at:
   - `https://bahattinercan.github.io/out-of-warranty/index.html`
   - `https://bahattinercan.github.io/out-of-warranty/privacy-and-data.html`
   - `https://bahattinercan.github.io/out-of-warranty/privacy-en.html`
7. **Updates & Redelivery:** Any time documentation changes are committed to the `main` branch, GitHub Pages automatically rebuilds and deploys the updated version.
8. **Verification:** Confirm that page links and character encodings render properly without mojibake or layout breakage.
