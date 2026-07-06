# DeutschKurs Materialgenerator

Web app generating print-ready German learning materials (DaZ, A1–B2) via the
Claude API. **v2 shipped 2026-03-13 (PR #1)** — code split, streaming, prompt
caching, retry/UX, template library all done.

Stack: vanilla HTML/CSS/JS (`index.html`, `app.js`, `style.css`,
`system-prompt.js`) + Cloudflare Worker proxy (`worker.js`). No frameworks, no
build step — must stay deployable as static files.

Constraints that still hold: backwards-compatible Worker URL and API-key flows;
German-only UI; print-first output (A4, page breaks); API keys in
sessionStorage, history in localStorage; sanitize API output (DOMPurify)
before DOM insertion.

Out of scope: backend/DB, accounts, multi-language UI, image generation.
