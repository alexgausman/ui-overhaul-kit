# Product pass prompt

Paste this into a fresh agent session in the repo you want reviewed. A product
pass produces a findings-and-proposals document — it does not change the app.
Run it after a feature phase lands, not weekly. (If this repo has never had a
UI pass, that's fine — the product pass stands alone; it only borrows the task
list idea.)

---

I want a product pass over this app, following `product-pass.md` from the kit
at https://github.com/alexgausman/ui-overhaul-kit. Clone the kit somewhere
temporary and read that file first — it defines the method, the evidence rule,
and the report structure. Work through these in order:

**1. Learn the app.** From the codebase and docs work out: what this app is
for, who it currently serves (state your inference — single-user personal
tool vs multi-user — and weight the lenses accordingly), every surface and
verb it exposes, and where its data lives. If the repo has a task worksheet
or brief from a UI pass, read those too.

**2. Gather the evidence.** Build the feature inventory. Write (or reuse) a
small **read-only** usage script that reports revealed usage per feature —
counts and last-activity dates from the app's own database — and commit it to
the repo as a keeper. Map features to the tasks people actually do. Note
which surfaces can't be measured at all.

**3. Interview me, in one message.** Show me your inventory and usage numbers
first, then ask only what you can't infer: what I actually use versus what I
thought I'd use, jobs I do outside the app that belong in it, features I
doubt, who I imagine ever using this besides me, and anything I consider
sacred regardless of usage. My answers are evidence; record them as such.

**4. Write the report** under `docs/product/`, following the structure in
`product-pass.md`: inventory with usage, findings (organization, orphans,
overlaps, concept portability), ranked proposals — each with a verdict class
(keep / grow / merge / shrink / remove / new avenue), cited evidence, rough
cost, confidence, and a personal/general tag — plus what you deliberately
did *not* propose, and timing/token spend. Every claim cites a usage number,
a task, data the app holds, or an observed workaround. No implementation:
the report ends with the shortlist you'd start with, and you stop there.

Check `date -u` at phase boundaries; you cannot estimate elapsed time by
feel. Respect this repo's agent instructions (AGENTS.md / CLAUDE.md) —
especially any data rules; the usage script must be read-only.

---

Notes:

- Implementation of accepted proposals is ordinary follow-up work in later
  sessions — deliberately not part of the pass.
- If the interview would block an unattended run, the agent should write the
  report with its questions listed as "open questions for the owner" instead
  of waiting.
