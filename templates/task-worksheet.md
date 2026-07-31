# Task worksheet

The task list is the highest-leverage input you give the flow. It's what turns
"the UI is annoying" into measurements: per task, the harness records clicks,
typed fields, URL entries (a page you can only reach by typing its address),
full document loads, and elapsed time — starting from where you'd actually be
standing, because the trip to the page is where friction hides.

## How to write one

- 5–10 tasks, in your words, concrete enough to perform ("add a show to my
  list while browsing", not "manage my library").
- Include where each starts. "Star an item *from the search results*" and
  "star an item *from its own page*" are different tasks with different costs.
- Include at least one discovery-shaped task ("find a specific X by name from
  wherever I am") and one composite journey ("answer: what should I watch
  tonight?"). Composites expose missing guided paths that single actions
  don't.
- Don't pre-judge the answer. Write the task even if you suspect the UI
  handles it well — cheap confirmations calibrate the expensive complaints.
- If you'd rather not write these yourself, have the agent draft them from
  the app's features and correct its draft when you read the audit.

## Worked example

The list from the app this kit was extracted from (a personal TV tracker).
Note the shape: mostly single actions with a stated starting point, plus one
global-discovery task (8), one composite journey (9), and one pure
information-need (10).

| # | Task | Starts from |
|---|------|-------------|
| 1 | Add a show to My Shows while browsing the catalog | catalog |
| 2 | Star a show | catalog; also from the show's own page |
| 3 | Set a rating signal on a show you're looking at | the show's page |
| 4 | Write a note on a show you're looking at | the show's page |
| 5 | Log the episodes you watched tonight | the show's page |
| 6 | Run a "similar shows" search | catalog |
| 7 | Triage one card in the recommendation queue | the queue page |
| 8 | Find a specific show by name from wherever you are | an unrelated page |
| 9 | Answer "what should I watch tonight?" | catalog |
| 10 | See where a show streams | the show's page |

What the baseline measured, for flavor: task 3 cost 6 clicks, 2 typed fields,
and a URL entry (the page that held the control had no inbound link — the
navigation graph found that, no screenshot could); task 1 was already 1 click
with no reload, which was worth knowing so the overhaul didn't regress it.
After the first two improvement steps, the URL entries were gone and global
search made task 8 two clicks from anywhere.

## Encoding tasks as flows

Each task becomes a `flow` in your `harness/apps/<app>.mjs` — see the worked
example configs. Rules that keep the numbers honest (enforced by the runner):

- Every user-visible click goes through the provided `click()` so it's
  counted; typing and URL entries are recorded as their own step kinds.
- Flows that change state declare a `cleanup` (runs after the measurement is
  frozen, so undoing is never counted as cost).
- Actions the UI can't undo use `interceptMutations()` — the request is
  answered locally; costs are real, nothing is written.
