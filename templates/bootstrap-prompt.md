# Bootstrap prompt

Paste this into a fresh Claude Code chat, in the repo you want overhauled.
There is nothing to set up first — the agent fetches the kit, reads your code,
interviews you, and starts.

---

I want to overhaul this app's frontend using the UI Overhaul Kit at
https://github.com/alexgausman/ui-overhaul-kit. Work through these in order and
don't skip ahead.

**1. Get the kit.** Clone it somewhere temporary (not into this repo), read its
`methodology.md` and `harness/README.md`, and copy its `harness/` directory into
this repo. Install the harness's own dependencies — `cd harness && npm install
&& npx playwright install chromium`. It keeps a separate `package.json` on
purpose, so Playwright never enters this app's dependency tree or Docker build.
This message authorizes that setup; the broader mandate comes in step 3.

**2. Learn the app, then draft.** From the codebase work out: the stack and
styling approach, how to run it locally and on what port, where the frontend
code lives, every user-facing route, whether it has auth and how sessions are
issued, and anything that looks like a hard-won fix you should not regress.
Then draft a task list — the 5–10 things someone actually *does* in this app.

**3. Interview me, then write the brief.** Ask me, in one message, only what you
cannot infer:

- what actually bothers me about the current UI, in my words
- what you may do without asking — install tools, adopt a design system,
  restructure or rebuild pages — and what is off-limits
- data rules: anything that must never be touched, and whether you may exercise
  features that write real data (reverting everything afterwards)
- how this ships: whether you may deploy, or should iterate against a local
  instance
- my corrections to your draft task list

Show me your step-2 findings and that draft list alongside the questions, so I
am correcting something concrete instead of writing from a blank page. Then
write `docs/frontend-overhaul.md` from the kit's `templates/brief-template.md`
using my answers, and show it to me before acting on it.

That document is your mandate. I need to have *decided* what is in it, not
merely failed to object to it — so ask rather than assume, and if I skip a
question, record it as undecided instead of filling in something permissive.

**4. Build the harness config.** Write `harness/apps/<this-app>.mjs`: base URL,
routes pinned to stable content ids, interaction states (modals, empty states,
focus, hover), and one flow per task from the list. If the app has auth, add a
session-mint script built on the app's own session machinery and modeled on the
kit's `examples/app-session-script.ts` — loopback-only, short-lived, revocable,
never an auth bypass.

**5. Baseline audit.** Run the full no-changes audit and write the report under
`docs/frontend/`: defects, unreachable pages, task costs, performance, layout,
design critique, what's worth keeping, priorities. Point the harness at a
production build rather than a dev server — a dev server with a broken HMR
socket serves pages where nothing hydrates, and every flow will look broken
while every screenshot looks fine.

Then stop and let me read the report before you change any UI.

---

Notes:

- That last line makes the audit a checkpoint. To let it run straight through,
  replace it with: *"Then proceed into implementation by the audit's priorities
  without waiting for me."*
- Continuing in a later chat, or setting up by hand: see
  [`continue-prompt.md`](continue-prompt.md).
