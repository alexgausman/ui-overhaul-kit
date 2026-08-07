# Bootstrap prompt

Paste this into a fresh agent session — Claude Code, Codex, or anything that
can run shell commands and read images — in the repo you want overhauled.
There is nothing to set up first: it fetches the kit, reads your code,
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
- data rules: anything that must never be touched, whether you may exercise
  features that write data, and which safety mode applies — exact cleanup,
  intercepted mutations, or real writes against a disposable snapshot
- how this ships: whether you may deploy, or should iterate against a local
  instance
- how far to go in this first session — see the scopes below — and whether to
  stop after the baseline audit or carry straight on
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

**6. Scope and stopping.** Steps 1–5 are roughly an hour whatever I answer;
what I pick in step 3 decides what happens *after* the audit:

- **Audit only** — write the report and stop. Cheapest way to see what you're
  dealing with, and the right default if you have not run this before.
- **Focused pass** — audit, then fix one page or one flow end to end.
- **Deep run** — audit, then work down its priorities in small verified
  commits until the budget is gone, ending with a report and a before/after
  gallery for me to read in the morning.

However far you go, **stop cleanly**: finish the change in hand, verify it with
a harness run, commit it, write up the pass, and tell me where you stopped and
what you would do next. A half-applied change with no commit is worse than
never starting. As you near the budget, stop at the next commit boundary rather
than opening something new.

Check `date -u` at phase boundaries. You have no other sense of elapsed time,
and you cannot estimate your own remaining runtime — so treat the budget as
something you *measure*, not something you feel.

---

Notes:

- Step 5 ends at a checkpoint on purpose, even for a deep run: the audit report
  is worth reading before a long unattended session. Say so in step 3 if you'd
  rather it carry straight on without you.
- Scopes are budgets, not promises. "Deep run" means "keep going until the
  budget is spent, stopping cleanly", not "this will take exactly eight hours".
- Continuing in a later chat, or setting up by hand: see
  [`continue-prompt.md`](continue-prompt.md).
