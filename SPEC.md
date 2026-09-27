# IS9 Weekly Deliverables Tracker: Spec v2

Supersedes v1 (commit 43b1631), which assumed nine VPs filling in nine tabs. Ethan enters everything, so everything downstream of that changed.

This file is the contract. Every cell address, formula, endpoint action and acceptance check lives in [docs/BUILD-REFERENCE.md](docs/BUILD-REFERENCE.md), which is written for whoever builds it, not for whoever runs it.

## 1. What it is

Ethan writes each officer's weekly deliverables. Each officer opens a private link on their phone and ticks items off. Every Sunday, Claude reads one tab through the Google Drive connector and updates the 10-page Canva carousel `DAHVvLLgskQ`. Canva editing is not part of this build; the weekly procedure lives in `canva/CANVA_RUN.md`.

| Who | What they touch |
|---|---|
| Ethan, on his DLSU account | Owns the Sheet, the script, the deployment, the repo. Adds, edits and reopens every item. |
| 13 officers: 4 EVPs and 9 VPs | One private link each, their own items only. One action: tick or untick. They never open the Sheet and never sign in. |
| Claude, through the Drive connector | Reads `01 \| Canva Feed`. |

Out of scope: editing Canva, the EBEXECOM MasterSheet, giving anyone Sheet access, progress percentages, file uploads as proof.

## 2. The pieces

- **A Google Sheet** on Ethan's DLSU account, five tabs: `00 | Configuration`, `01 | Canva Feed`, `02 | Deliverables`, `03 | Archive`, `04 | Log` (hidden).
- **A container-bound Apps Script project**: the JSON endpoint, the emails, the hourly job, and the setup that builds and repairs the workbook.
- **A React app** in `app/`, built to static files, hosted free on GitHub Pages under `github.com/is9-dlsu`. The repo is public, because a free organization cannot publish Pages from a private repo.
- **One hourly trigger** that runs every scheduled job.
- **Four emails**, all sent by the script from Ethan's DLSU account.

## 3. The rules that matter

**Status is a checklist.** `Open` or `Accomplished`, defined in Configuration, never hardcoded. Ticking is reversible for 60 seconds, then only Ethan can reopen an item. Nothing in the code keys on the label: everything reads a derived `Active` flag, so renaming a status, or going back to four of them, costs one Configuration edit.

**No cap on items, ten slots per page.** A committee with eleven active items gets a second Canva page, so the carousel is 1 title page plus 9 committee pages plus one continuation page per overflowing committee. The worst case is 19 slides, which is under Instagram's manual limit of 20. Beyond 20 items one committee cannot be shown in full: the extra items live in the app, the emails and the Sunday brief, and the feed flags what was not published.

**The week rolls over on Sunday.** Week start is the Monday of the week containing tomorrow. So Sunday's run always describes the week that starts the next morning, and Monday to Saturday describe the week in progress.

**Overdue has two meanings, deliberately.** Everywhere a human reads it, overdue means the deadline has passed and the item is still active. In the Canva feed, the `OVERDUE` window means the deadline falls before the week start, exactly as v1 defined it. They agree on Sunday, which is the only day the feed is read.

**Fourteen people, nine publish.** The President and the four EVPs have deliverables, private links, emails and a line in the Sunday brief like everyone else, but no Canva page. Only the nine committees publish, and only their flags can hold the carousel. The reason is arithmetic: Instagram caps a carousel at 20 slides, and publishing all 14 with continuation pages reaches 29 in the worst case, produced by ordinary use rather than by anything anyone did wrong.

**Carousel pages are computed, not fixed.** A page is identified by its owner and part number, not by a page number that never moves. The master design holds 19 pages built once by hand, each committee's page followed by its continuation page, and the weekly run edits text and exports only the pages that week needs. Canva's connector can add a page but cannot duplicate one, and where an added page lands is undocumented, so nothing in the weekly run creates or deletes pages.

**The sign-off is weekly, not a setting.** Prepared by and Checked by change every week, so Ethan sets them in the app each week, from a picker over the 14, and the Sheet keeps one row per week. `Ready for Canva` reads NO until this week's sign-off is set, because the alternative is quietly printing last week's names.

**Tokens live in Script Properties, never in a cell.** The Canva reader account has view access to the whole workbook, so a token in Configuration would be a token published to it.

**Nothing personal reaches the repo.** No name, no address, no token, no URL that matters. The roster lives in the Sheet; the endpoint and app URLs live in Configuration and are read by every email. A pre-commit scan enforces it.

**The endpoint is public, so it is hostile until proven otherwise.** Every request is a POST with `Content-Type: text/plain` carrying JSON, because that is what works cross-origin (measured 2026-09-27: a JSON content type and any custom header both fail). No request does anything before its token is validated.

## 4. The Canva feed contract

The strings are v1's, word for word, and they do not change without Ethan's approval:

| Field | Example |
|---|---|
| Week line | `WEEK 04  \|  SEP 28 TO OCT 4  \|  A.Y. 2026 - 2027` |
| Legends | `DUE SEP 28 TO 29`, `DUE SEP 30 TO OCT 4`, `DUE AFTER OCT 4` |
| VP line | `JUAN DELA CRUZ  \|  VICE PRESIDENT` |
| Tagline | `WEEKLY DELIVERABLES  \|  WEEK 04  \|  SEP 28 TO OCT 4  \|  10 TASKS` |
| Deadline text | `Due Mon, Sep 28`, or `Overdue: Fri, Sep 25` |
| Remark text | `·  Send final name to Publication` |

Double spaces around pipes, the middle dot, the uppercase, and the `1 TASK` singular are all part of the contract. Ten proposed changes are listed in the reference's Appendix A2 with the interim behaviour that ships until Ethan rules on each.

## 5. The emails

| When | To | Sent only if |
|---|---|---|
| Monday 07:00 | each officer | they have active items |
| Daily 07:00 | each officer | something of theirs is due tomorrow or overdue |
| Sunday | Ethan | always: ready or not, what is overdue, what was accomplished, what needs attention |
| On failure | Ethan | at most once per job per day, and the error is re-thrown so Google's own notice fires |

One email per person per type, never one per item. A TEST mode sends everything to Ethan instead. The quota guard stops sending before the daily limit rather than half-sending a batch.

## 6. Accepted risks

- Anyone holding an officer's link can tick that officer's items. Every change is logged with a timestamp, and any link can be reissued from the menu.
- The endpoint URL is public. Tokens are the only gate.
- A DLSU administrator could disable Apps Script or external sharing at any time. Both were confirmed available on 2026-09-27.
- Moving the Sheet to a shared drive breaks the web app until it is redeployed.

## 7. Handover

Ownership transfers inside the DLSU domain, so the next president inherits the Sheet intact. The GitHub organization outlives any one account. A GitHub Pages URL does not redirect after a repo transfer, which is why the app URL is a setting that every email reads rather than a constant. The full checklist is `docs/HANDOVER.md`.

## 8. Phases and gates

| Phase | Deliverable | Gate |
|---|---|---|
| 0. Spike | Cross-origin call proven, 2026-09-27 | Done |
| 1. Spec | This file plus the reference | Ethan approves |
| 2. Logic | Pure functions plus Node tests, nothing in Drive | Tests pass, sample output reviewed |
| 3. Sheet | Sheet created, script bound and pushed, Build run twice | Ethan approves before creation |
| 4. App | Endpoint, React app, deployment, real Drive read | Works on Ethan's phone |
| 5. Emails | One weekend in TEST mode | Ethan approves the wording |
| 6. Go live | Links issued, emails live, sample data cleared | First live weekend watched |
| 7. Canva | `CANVA_RUN.md`, the claude.ai Project, a dry run on a copy | Carousel matches the feed |

## 9. What Ethan supplies at Gate A

1. The 14 names and addresses, pasted into the Sheet.
2. Term 1 runs `2026-09-07` to `2026-12-13`, 14 weeks. Terms 2 and 3 are filled when DLSU publishes them. A blank end date pauses every job mid-trimester.
3. The repo name, which fixes the app URL.
4. A ruling on each proposed contract change in Appendix A2.
5. The Canva master design built out to 19 pages: the title page, then each committee page followed by its continuation page, in the order this spec lists. One session in Canva, once.

## 10. Conventions

- Settings live in `00 | Configuration` and are read through named ranges, never hardcoded, never by cell address.
- Setup is idempotent: re-running creates what is missing and repairs formatting and validation, and never touches an item, a token, an archive row or a log row.
- No em dashes in anything a person reads.
- The workbook is Poppins throughout, with gridlines on and a frozen header row on every tab. Colors come from the IS9 palette only: `#085040`, `#58756a`, `#5d4170`, `#8a64a9`, `#8b74a1`, `#724485`, `#e9ebd4`, `#F8FBFD`. Dark text is `#085040`. `#1C2120` never appears in the workbook, and survives only as the number text hex the Canva feed prints.
- Asia/Manila everywhere, in the spreadsheet and in `appsscript.json`.
- `IS9WD` prefixes functions and named ranges, matching Ethan's other sistemas.
