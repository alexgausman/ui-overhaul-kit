# Kickoff prompt

Fill the placeholders, then paste this into a fresh Claude Code chat in your
repo. It assumes you've committed your filled-in brief as
`docs/frontend-overhaul.md` and copied the kit's `harness/` into the repo.

---

We're starting a frontend overhaul of ⟨app name⟩ (⟨repo path⟩, runs at
⟨local URL⟩). Read docs/frontend-overhaul.md before doing anything — it is
your brief and carries my mandate, pre-approved permissions, method, and task
list. The method it references is in ⟨methodology.md location⟩, and there's a
UI observation harness in harness/ (its README explains it; harness/apps/
contains a skeleton and a complete worked example).

The short version: I want the frontend to feel like a finished, marketable
product — polished, responsive, and efficient to use (common actions in 1–2
clicks without page reloads). You have a long leash: install tools, adapt the
harness to this app (write harness/apps/⟨app⟩.mjs and, since the app has
auth, a session-mint script modeled on the kit's example), adopt
⟨Tailwind + shadcn/ui base-nova⟩, restructure or rebuild where that gets a
better outcome, and implement when you're ready. Use your judgment and adapt
as you go — just document decisions, findings, and before/afters under
docs/frontend/ as the brief describes.

Start with the harness and a no-changes baseline audit — screenshots across
viewports, load timings, accessibility scan, the task/click map — and write
up the report with a critique and priorities before making changes. I'll read
it and confirm direction before you start changing the UI.

---

Notes:

- The last paragraph makes the audit a checkpoint. If you'd rather let it run
  straight through to implementation, replace it with: "Begin with the
  baseline audit, then proceed into implementation by the audit's priorities
  without waiting for me."
- For later sessions (the overhaul usually spans several chats), swap the
  final paragraph for where things stand, e.g.: "The baseline audit and steps
  1–2 are done — read docs/frontend/README.md for the report index. Continue
  from the priorities in the latest report at ⟨scope: a focused pass on X /
  a deep run through the night⟩."
