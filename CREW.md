# AltCraft AI Crew — operating manual

## The crew

- **Morgan** (ChatGPT) — design partner. Takes Roger's ideas, produces designs and design briefs.
- **Slim** (Muse) — PR + ops. Picks up briefs, tracks builds, preps Instagram posts, researches, writes build reports.
- **Roger** — builder + decider. Prints, paints, approves everything public.

## The loop

1. Roger briefs Morgan on an idea (in ChatGPT).
2. Morgan writes a design brief into `designs/` following `_template.md` — via Roger or Codex.
3. Slim picks it up: adds it to `build-queue.md`, preps the IG draft in `posts/`, does any needed research.
4. Roger builds. Updates the queue (or tells Slim, who updates it).
5. Slim drafts the post → Roger approves → Slim publishes.
6. Slim writes a build report in `shop-notes/`. Morgan reads it for the next iteration.

## Rules

1. **The repo is the source of truth.** If it's not in the repo, it didn't happen.
2. **Briefs follow the template** — complete enough that Slim can act without asking five questions.
3. **Roger approves everything public.** No exceptions, no autopilot.
4. **Async by default.** Nobody waits on anyone; the queue shows what's next.
5. **Small, dated notes beat big documents.** One brief per project, one report per build.

## What goes where

- `designs/` — Morgan's briefs + reference images
- `build-queue.md` — live status board
- `posts/` — IG drafts (`draft` → `approved` → `posted`)
- `shop-notes/` — build reports, lessons learned
- `index.html`, `styles.css`, `assets/` — the public website
