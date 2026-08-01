# Continue prompt

For the two cases [`bootstrap-prompt.md`](bootstrap-prompt.md) doesn't cover:
**resuming an overhaul in a later chat** (they usually span several), and
**starting from a setup you did by hand** rather than letting the agent do it.

An overhaul is a sequence of chats, not one long session. Each new chat needs
the same three things: where the brief is, where things left off, and the scope
of *this* session.

## Resuming

Fill the placeholders and paste into a fresh chat in your repo.

---

We're continuing the frontend overhaul of ⟨app name⟩ (⟨repo path⟩, runs at
⟨local URL⟩). Read `docs/frontend-overhaul.md` — it's the brief and carries my
mandate and permissions, which still stand — then `docs/frontend/README.md` for
the report index and where things left off.

This session's scope: ⟨e.g. "a focused pass on the checkout flow" / "fix the
misses in docs/frontend/my-notes.md" / "a deep run through the night, going
wide by the priorities in the latest report"⟩.

Usual loop: measure the before state with the harness, change, verify with a
run, commit each fix separately, and write the pass up under `docs/frontend/`
including its wall-clock and estimated token spend. Long leash as before — use
your judgment and adapt, as long as it's documented.

---

## Starting from a manual setup

If you copied `harness/` in and filled out the brief yourself, the agent only
needs pointing at them.

---

We're starting a frontend overhaul of ⟨app name⟩ (⟨repo path⟩, runs at ⟨local
URL⟩). Read `docs/frontend-overhaul.md` before doing anything — it's your brief
and carries my mandate, pre-approved permissions, method and task list. The
method it references is in ⟨methodology.md location⟩, and there's a UI
observation harness in `harness/` (its README explains it; `harness/apps/` has
a skeleton and a complete worked example).

Start by adapting the harness to this app — write `harness/apps/⟨app⟩.mjs`, and
⟨if the app has auth⟩ a session-mint script modeled on the kit's example — then
run a no-changes baseline audit and write up the report with a critique and
priorities. Measure against a production build, not a dev server. I'll read the
report and confirm direction before you change any UI.

---

## Notes

- To let a session run straight through instead of stopping at the audit,
  replace the last sentence with: *"Then proceed into implementation by the
  audit's priorities without waiting for me."*
- **Give each session a scope.** "Continue the overhaul" produces drift; "a
  focused pass on X" produces a report you can read in five minutes. The
  methodology's run scopes — audit (~1h), focused pass (1–2h), deep run (~8h) —
  are the useful vocabulary.
- **Owner feedback is its own scope.** When you come back with a list of misses,
  say so and point at the file. The methodology has a triage rubric for folding
  them back into the flow, and it only fires if the agent knows that's what the
  session is.
