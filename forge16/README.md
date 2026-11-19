# FORGE16 — The Mastery Protocol

A personal, 16-week technical-interview training dashboard powered by a snapshot of the owner's Google Sheet.

## Training content
- **16 complete weeks** of Monday–Sunday missions from **November 23, 2026 to March 14, 2027**
- **136 curated LeetCode problems** from the two LeetCode spreadsheet tabs
- **43 interview drills** with links, time limits, acceptance checks and Java no-AI practice
- **37 AI-assisted interview tasks** including LeetCode Premium Projects, GitHub repo capstones and a HackerRank Chakra demo
- A small daily system: cold solving, spaced recall, timed assessments, review and reflection.

The source dataset is in `data.js`, generated from **LeetCode, LC Practice, Interview Drills, AI Assisted Cases** in the linked Google Sheet on November 19, 2026. **This is a snapshot, not a live Sheets integration**; changes in the spreadsheet do not automatically update the site.

## Use

The app is intentionally static and dependency-free. Open `index.html` in a browser, or serve this directory:

```bash
python -m http.server 5173
# open http://localhost:5173/
```

On mobile, use the responsive navigation menu. Keyboard shortcuts: **G** command center, **/** search, **Esc** close dialog.

### Privacy and sync

Completion, score, and notes live **only in localStorage in the browser used**. They are not pushed to GitHub, Google Sheets or a server. Use **Export progress** to save a JSON backup, then **Restore progress** on another device. Clearing local storage erases local progress unless you have a backup.

No user accounts, analytics, tracking scripts, credentials, or backend services are used.

### Accessibility and quality

Semantic navigation, keyboard controls, dialog close on Escape, focus-visible states, reduced-motion support, and a responsive desktop/tablet/mobile layout are provided. The project uses Google Fonts; system fallbacks work offline.

### Score rules

XP is a personal motivational counter, **not** a standardized measure of interview ability. Weekly progress excludes optional/stretch missions; final readiness should be established by independent cold-solving performance and real mock-interview results.

## Source

[Google Sheets — Georgia Tech 4 Year Plan](https://docs.google.com/spreadsheets/d/1p9RK32Mo-HEs35A6Ze8OM0FwnpSfpX4cc2qaLBM-YSg/edit)

## Deployment

This app lives under `forge16/` of the user's GitHub repository to avoid overwriting the existing personal website. For Vercel, set the project's **Root Directory** to `forge16`. No build command is required; output is the project root. This app is fully static.

## Technologies

Vanilla HTML5, CSS3, JavaScript, SVG progress rings, browser localStorage. No dependencies and no API keys.
