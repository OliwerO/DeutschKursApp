# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch.

## The 3-Layer Architecture

**Layer 1: Directive (What to do)**
- Basically just SOPs written in Markdown, live in `directives/`
- Define the goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee

**Layer 2: Orchestration (Decision making)**
- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution. E.g you don't try scraping websites yourself—you read `directives/scrape_website.md` and come up with inputs/outputs and then run `execution/scrape_single_site.py`

**Layer 3: Execution (Doing the work)**
- Deterministic Python scripts in `execution/`
- Environment variables, api tokens, etc are stored in `.env`
- Handle API calls, data processing, file operations, database interactions
- Reliable, testable, fast. Use scripts instead of manual work. Commented well.

**Why this works:** if you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. The solution is push complexity into deterministic code. That way you just focus on decision-making.

## Operating Principles

**1. Check for tools first**
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist.

**2. Self-anneal when things break**
- Read error message and stack trace
- Fix the script and test it again (unless it uses paid tokens/credits/etc—in which case you check w user first)
- Update the directive with what you learned (API limits, timing, edge cases)
- Example: you hit an API rate limit → you then look into API → find a batch endpoint that would fix → rewrite script to accommodate → test → update directive.

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better approaches, common errors, or timing expectations—update the directive. But don't create or overwrite directives without asking unless explicitly told to. Directives are your instruction set and must be preserved (and improved upon over time, not extemporaneously used and then discarded).

## Self-annealing loop

Errors are learning opportunities. When something breaks:
1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

## File Organization

**Deliverables vs Intermediates:**
- **Deliverables**: Google Sheets, Google Slides, or other cloud-based outputs that the user can access
- **Intermediates**: Temporary files needed during processing

**Directory structure:**
- `.tmp/` - All intermediate files (dossiers, scraped data, temp exports). Never commit, always regenerated.
- `execution/` - Python scripts (the deterministic tools)
- `directives/` - SOPs in Markdown (the instruction set)
- `.env` - Environment variables and API keys
- `credentials.json`, `token.json` - Google OAuth credentials (required files, in `.gitignore`)

**Key principle:** Local files are only for processing. Deliverables live in cloud services (Google Sheets, Slides, etc.) where the user can access them. Everything in `.tmp/` can be deleted and regenerated.

## Summary

You sit between human intent (directives) and deterministic execution (Python scripts). Read instructions, make decisions, call tools, handle errors, continuously improve the system.

Be pragmatic. Be reliable. Self-anneal.

---

# Project Brief: DeutschKurs Materialgenerator v2

## Overview

**DeutschKurs Materialgenerator** is a web app that generates print-ready German language learning materials for adult DaZ (Deutsch als Zweitsprache) learners using the Claude API. Teachers select a target group, topic, level (A1–B2), material type, and duration — then receive classroom-ready worksheets with solution keys.

**Current state:** Working single-page app (`index.html`, ~2,400 lines monolith) with Cloudflare Worker proxy (`worker.js`). Fully functional but hard to maintain and missing modern UX patterns.

## Tech Stack

| Layer | Current | Target (unchanged unless noted) |
|-------|---------|-------------------------------|
| Frontend | Vanilla HTML/CSS/JS (single file) | Vanilla HTML/CSS/JS (split into separate files) |
| API | Claude Sonnet 4.5, 8192 max tokens | Same model, add streaming + prompt caching |
| Proxy | Cloudflare Worker (`worker.js`) | Same, add streaming support |
| Storage | localStorage (API keys, history) | sessionStorage for keys, localStorage for history |
| Export | PDF (print dialog), Word (.doc), Clipboard | Same |
| Hosting | Static file / Cloudflare | Same |

**No frameworks.** This stays vanilla HTML/CSS/JS. No build step, no bundler, no React/Vue/Svelte.

## Constraints

- **No frameworks or build tools** — must remain a static site deployable by dropping files on any server
- **Backwards compatible** — existing Worker URL and API key flows must keep working
- **German UI only** — no i18n needed (users are German language teachers)
- **Print-first output** — generated materials must remain print-optimized (A4, page breaks, orphan control)
- **Budget-conscious** — prompt caching and streaming are priorities because they reduce cost and latency
- **Offline-tolerant** — history and saved configs must work without network

## Phases

### Phase 1: Code Splitting & Cleanup

Split the monolith into maintainable files without changing any functionality.

**Tasks:**
- Extract CSS into `style.css`
- Extract JS into `app.js`
- Extract the system prompt into `system-prompt.js` (exported as a const)
- Keep `index.html` as structure only
- Add DOMPurify (CDN) for sanitizing API output before rendering
- Move API key storage from localStorage to sessionStorage

**Done when:**
- App works identically to current version
- `index.html` is under 200 lines
- No inline `<style>` or `<script>` blocks (except the script/link tags loading the external files)
- API output is sanitized before DOM insertion

### Phase 2: Streaming Responses

Replace the current "wait for full response" pattern with streaming.

**Tasks:**
- Update `worker.js` to support streaming (proxy SSE from Anthropic API)
- Update `app.js` to consume SSE stream and render incrementally
- Replace the simulated progress bar with real incremental content display
- Handle stream errors gracefully (partial content recovery)

**Done when:**
- First tokens appear within 1-2 seconds of clicking generate
- Content renders incrementally as tokens arrive
- Progress indication reflects actual generation progress
- Errors mid-stream show what was generated so far + error message
- Worker and direct-API modes both support streaming

### Phase 3: Prompt Caching

Reduce cost and latency by caching the large system prompt.

**Tasks:**
- Add `cache_control` to the system prompt in API requests (Anthropic prompt caching)
- Verify cache hits via response headers
- Log cache hit/miss ratio (console only, for debugging)

**Done when:**
- System prompt is cached across requests (visible in `cache_creation_input_tokens` / `cache_read_input_tokens` response fields)
- Subsequent requests in the same session are measurably faster
- No functional changes to output quality

### Phase 4: UX Improvements

**Tasks:**
- Add retry logic with exponential backoff for failed API requests (max 2 retries)
- Improve error messages: show specific error type (rate limit, network, auth, server error) with suggested action
- Add request debouncing on the generate button (prevent double-clicks)
- Add C-Test as a material type in the UI (already supported in the system prompt for B2)
- Make help tooltips tap-friendly on mobile (not hover-only)

**Done when:**
- Transient failures (network blips, 429s) auto-retry without user action
- Error messages tell the user what to do, not just what went wrong
- Double-clicking generate doesn't fire two requests
- C-Test is selectable in the UI and generates correct output at B2 level
- Tooltips work on touch devices

### Phase 5: Template Library

Let teachers save and reuse their favorite configurations.

**Tasks:**
- Add "Save as Template" button that stores current form state to localStorage
- Add template picker (dropdown or chip list) to quickly load saved configs
- Include 3-5 built-in default templates (e.g., "A1 Arztbesuch Lückentext", "B1 Wohnung Dialog")
- Allow deleting saved templates

**Done when:**
- Teachers can save, load, and delete custom templates
- Built-in templates are available on first use
- Templates persist across sessions (localStorage)
- Template data is separate from history data

## Out of Scope (for now)

- Backend/database (stays client-side)
- User accounts or authentication
- Multi-language UI
- Image generation or Bildwörter feature
- Automated testing (nice-to-have but not blocking)
- PWA / offline-first capabilities
