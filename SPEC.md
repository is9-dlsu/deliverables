# IS9 Weekly Deliverables Tracker: Spec v2

Supersedes v1 (commit 43b1631), which assumed nine VPs filling in nine tabs. Ethan enters everything, so everything downstream of that changed.

This file is the contract. Every cell address, formula, endpoint action and acceptance check lives in [docs/BUILD-REFERENCE.md](docs/BUILD-REFERENCE.md), which is written for whoever builds it, not for whoever runs it.

## 1. What it is

Ethan writes each officer's weekly deliverables. Each officer opens a private link on their phone and ticks items off. Every Sunday, Claude reads one tab through the Google Drive connector and updates the 15-page Canva carousel `DAHVvLLgskQ`. Canva editing is not part of this build; the weekly procedure lives in `canva/CANVA_RUN.md`.

| Who | What they touch |
|---|---|
| Ethan, on his DLSU account | Owns the Sheet, the script, the deployment, the repo. Adds, edits and reopens every item. |
| 13 officers: 4 EVPs and 9 VPs | One private link each, their own items only. One action: tick or untick. They never open the Sheet and never sign in. |
| Claude, through the Drive connector | Reads `01 \| Canva Feed`, which says so in plain English in its own first row. |

Out of scope: editing Canva, the EBEXECOM MasterSheet, giving anyone Sheet access, progress percentages, file uploads as proof.

## 2. The pieces

- **A Google Sheet** on Ethan's DLSU account, ten tabs. Eight are numbered and seven of those are visible: `00 | Dashboard`, `01 | Configuration`, `02 | Canva Feed`, `03 | Deliverables`, `04 | Statistics`, `05 | Officer Tables`, `06 | Archive`, `07 | Log` (hidden). Two more are machine tabs and both are hidden: `_Engine` and `_Views`.
  - `00 | Dashboard` answers one question: **what do I do right now**. Six cards, three across, two rows of three: this week, the `Ready for Canva` verdict with its seven gates, the four things no automation can do for Ethan, whether the machine is running, the broken cell counts with the row room left, and the five scheduled jobs. It is read only, nothing on it is typed, **no cell on it is cream**, it names no officer, and it carries no chart, because a chart is 330 px and this tab's whole claim is one screen with no scrolling. Every value is read from a named range that already exists and **not one is recomputed**, so the tab cannot disagree with what it summarises: the seven gates are mirrored from `04 | Statistics` rather than evaluated a third time. Its largest single gain is promoting the machine's own state out of the hidden tabs, because until it existed nothing Ethan could see said whether the hourly job had run, whether TEST mode was on, how much mail quota was left, whether a link was revoked, or whether the last self test passed.
  - **The feed's position is stated by its reason rather than by a number.** Adding the Dashboard made `02 | Canva Feed` the third tab instead of the second. The constraint it was protecting is unchanged and still met: a truncated Drive connector read must lose the Archive and the Log before it loses a contract string, so the feed sits ahead of every tab the read is allowed to lose. Two tabs precede it and neither is large, 24 rows and 67, and the feed itself shrank from 579 rows to 536 on the same day, so the read has more room ahead of the contract strings than before. The self test asserts the ordering by that rule, not by the literal 2, which is what let the old assertion fail on a correct workbook the moment the Dashboard existed.
  - `03 | Statistics` is a **dashboard**: eight big number tiles, a table of sentences naming who to chase, the seven readiness gates, three tables and three real embedded charts. Nothing on it is a setting and nothing on it is typed.
  - `04 | Officer Tables` is one numbered card per officer, all fourteen of them, with every item that officer currently holds.
  - Both of them are laid out as a **three across grid of cards**, which is section 3's own rule below.
  - `_Engine` holds every setting that exists for the code rather than for a president: the Canva hex pairs, the status list, the job schedule, the carousel capacity numbers, the mail plumbing, the eight statistics thresholds, the diagnostics, the directory's token and ordinal columns, and the weekly sign-off store.
  - `_Views` holds the helper band the two computed views used to hide inside themselves, plus `OPERATIONAL HEALTH` and `SCHEDULED JOBS`, which are the machine reporting on itself.
  Every value on both hidden tabs keeps the named range it always had, so no formula, no email and no reader changed when it moved. The feed stays tab 2 and is **never hidden**, because a truncated Drive read must lose the Archive and the Log before it loses a contract string, and because whether the connector reads a hidden tab at all is unmeasured.
- **A container-bound Apps Script project**: the JSON endpoint, the emails, the hourly job, and the setup that builds and repairs the workbook.
- **A React app** in `app/`, built to static files, hosted free on GitHub Pages under `github.com/is9-dlsu`. The repo is public, because a free organization cannot publish Pages from a private repo.
- **One hourly trigger** that runs every scheduled job.
- **Four emails**, all sent by the script from Ethan's DLSU account.

## 3. The rules that matter

**Status is a checklist.** `Open` or `Accomplished`, defined in Configuration, never hardcoded. Ticking is reversible for 60 seconds, then only Ethan can reopen an item. Nothing in the code keys on the label: everything reads a derived `Active` flag, so renaming a status, or going back to four of them, costs one Configuration edit.

**No cap on items, fifteen slots per slide, one slide per officer.** Ethan ruled on 2026-09-28. The carousel is 1 title slide plus 14 officer slides, always, at every possible input: fifteen is not a typical length, it is the only length. There are no continuation slides, so no week can make the carousel longer or shorter than the master design. An officer holding more than fifteen active items shows fifteen; the rest live in the app, the emails and the Sunday brief, and the feed reports the count under `Not published`. The tagline prints the count that FIT rather than the count held, so a reader who counts the lines on a slide gets the number in the headline.

This replaces the earlier design of ten slots across up to two pages per committee. Two things drove the change. The per officer ceiling is now fifteen rather than the ten that dropping continuation slides alone would have left, which keeps truncation rare and keeps `Tasks with no slide`, the `Attention` column, column L and the Officer Tables card heading working as the exception reports they were designed to be. And a fixed length is a fixed master: fifteen pages drawn once, never a page created or deleted by a weekly run.

**The week rolls over on Sunday.** Week start is the Monday of the week containing tomorrow. So Sunday's run always describes the week that starts the next morning, and Monday to Saturday describe the week in progress.

**Overdue has two meanings, deliberately.** Everywhere a human reads it, overdue means the deadline has passed and the item is still active. In the Canva feed, the `OVERDUE` window means the deadline falls before the week start, exactly as v1 defined it. They agree on Sunday, which is the only day the feed is read.

**Fourteen people, fourteen publish, in hierarchy order.** Ethan ruled on 2026-09-28. Every officer has a slide: he leads on slide 2, the four EVPs take 3 to 6, and the nine committees take 7 to 15. Carousel order and hierarchy order therefore hold the same fourteen values, and they remain two columns on purpose, because one is physical page arithmetic and the other is the order every list a person reads is sorted by, and a later administration may want them to differ.

The earlier design published only the nine committees, and its stated reason was Instagram's cap of 20 slides in one carousel. **That cap is withdrawn as a constraint, not merely satisfied:** Ethan ruled the same day that the carousel is not posted to Instagram. It is recorded here because a reason left lying in a spec outlives the decision it justified, and the next person to read it would rebuild the wrong thing. Nothing in the code has ever compared a slide count to 20, which was itself a gap: the only 20 in the workbook was a caption.

Changing the publish set or a slide number is not a settings edit, it is a claim on a page somebody drew by hand. So `Checks > Switch the carousel to all fourteen` moves the two settings and the two columns together in one locked run, logs every before and after value, and the self test compares the live set to the shipping set row by row rather than only counting it, because a hand ticked office and a hand unticked committee give the same total and a different fourteen people.

**Carousel pages are computed, not fixed.** A page is identified by its owner and part number, not by a page number that never moves. The master design holds 15 pages built once by hand, the title page then one page per officer in hierarchy order, and the weekly run edits text and exports the pages that week needs, which at one page per officer is all of them. Canva's connector can add a page but cannot duplicate one, and where an added page lands is undocumented, so nothing in the weekly run creates or deletes pages.

**The sign-off is weekly, carried forward.** Prepared by and Checked by are set from a picker over the 14 on the admin page, and the Sheet keeps one row per week. Ethan ruled on 2026-09-29 that setting it every week is a chore for a pair that rarely changes, so the hourly pass and Sync write the latest earlier pair for a week that has none, and the picker is for the week it should differ. `Ready for Canva` therefore reads NO only on a workbook where nobody has ever set it; the earlier rule, that a missing week's row holds the gate so last week's names are never printed silently, is withdrawn by that ruling, and the brief still names the pair every Sunday.

**Tokens live in Script Properties, never in a cell.** The Canva reader account has view access to the whole workbook, so a token in Configuration would be a token published to it.

**The three computed views are a grid of cards, three across.** `00 | Dashboard` is a six column cell three times over and reaches column T at 1,398 px, which is the only one of the three that fits a 1,440 px laptop with no horizontal scroll.

**A table on a card reads as a table because its rules are drawn.** Gridlines are on workbook wide, and that is not enough on the card tabs: Sheets draws a gridline only on an **unfilled** cell, and every cell of every card is filled `#F8FBFD`, so the setting does nothing on precisely the tabs a reader spends time in. Every card therefore draws dotted `#58756a` rules in both directions across its labelled columns, with one solid rule under the header, and the rules stop at the labelled columns so a card wider than its table does not carry a grid over nothing. A card opens as band, then header, then body: the band is `#5d4170` and the header `#58756a`, because both were `#5d4170` and a card began with one unbroken 68 px block of purple with nothing telling its heading from its column labels.

**A conditional format rule wraps every named range in `INDIRECT`.** Sheets refuses a rule that references another sheet, and it refuses it when the rule list is applied rather than when it evaluates, so one bare name throws the whole build. Most names a rule needs live on another tab, so this is the normal case and not the exception. The project has hit this three times; the Node fake now refuses a bare cross-sheet name in a rule, so it cannot reach a live workbook a fourth time.

**The two other computed views are a grid of cards, three across.** Ethan's instruction of 2026-09-27: use the width of the sheet, run past column AA, put three tables beside each other with one column between them, give each one a border and a background, and stack the rows of three with one row between them. So a grid cell is a fixed number of columns, the same for all three, and a card fills its cell: `03 | Statistics` is a twelve column cell three times over and reaches column AL, `04 | Officer Tables` is a nine column cell three times over and reaches column AC. Each card carries a heading band in `#5d4170` with `#F8FBFD` text, a body on `#F8FBFD` and one border around the whole of it in `#58756a`. The separator column and the separator row carry no fill and no border at all, because that is the only thing that makes three cards read as three cards. `03 | Statistics` is nine cards in three rows of three: the tiles, the chase list and the gates; then by officer, ranked and the trend; then the three charts. `04 | Officer Tables` is fourteen cards in five rows of three with the last holding two, in rank order across then down, so the President is the first card, the four EVPs follow, then the nine committees.

**A tab is trimmed to its last built row, and nothing is painted past it.** Both computed views are trimmed as the last act of their own build rather than the first, and everything past the end is cleared before the trim. The order is what matters: a trim before the paint leaves a window in which any later step that grows the grid inherits the format of the last built row, because Sheets copies the row above into every row it inserts, and that is how the end band painted `03 | Statistics` dark green a thousand rows below its content.

**Nothing personal reaches the repo.** No name, no address, no token, no URL that matters. The roster lives in the Sheet; the endpoint and app URLs live in Configuration and are read by every email.

A pre-commit scan enforces the part of it that has a shape. `tools/hooks/pre-commit`, wired up with `git config core.hooksPath tools/hooks`, refuses a commit carrying an email address, an Apps Script deployment id or `/macros/s/` URL, a Google file id or a token, and refuses an em dash in anything a person reads. It scans only what git tracks, so a gitignored `.clasp.json` does not cry wolf. **It cannot recognise a person's name**, which is stated here rather than left to be discovered: the roster stays out of the repo because that is the rule, not because a regular expression is watching. Until 2026-09-28 the scan this paragraph promised did not exist at all: `.git/hooks/` held only Git's own samples, and a name had been sitting in `tools/preview-week.js` since commit 5dff177.

**The endpoint is public, so it is hostile until proven otherwise.** Every request is a POST with `Content-Type: text/plain` carrying JSON, because that is what works cross-origin (measured 2026-09-27: a JSON content type and any custom header both fail). No request does anything before its token is validated.

**A president's tab holds only what a president sets, and every cell he fills is cream.** Ethan's instruction of 2026-09-27. `00 | Configuration` keeps the week, the trimester dates, the A.Y. label, the fourteen people, seven on and off switches, three addresses and this week's sign-off, and it ends on row 67 rather than row 168. Every cell he is expected to type into carries the fill `#e9ebd4`, a plain English sentence beside it in `#58756a` and the same sentence as the cell's own note; every calculated cell carries neither and says so. Row banding is withdrawn from any block that holds an input column, because a banded row would put cream under half the calculated cells and destroy the one rule a first time reader can learn in a second. The same cream rule covers the five columns of `02 | Deliverables` he types into, where the per-column sentence rides in a hint row directly above the data rather than in 34,000 notes.

**A view never gates the run.** `03 | Statistics` and `04 | Officer Tables` are computed views, and `Ready for Canva` stays exactly seven gates, all of them read from the feed. A broken formula on either view fails the self test and appears in the Sunday brief, and it does nothing else. The reverse would make the carousel hostage to a statistics formula. The statistics tab does carry a second reading of those seven gates, because the feed publishes the verdict and not the reason, and one cell compares the two readings and fails the self test when they disagree: that is the only thing that can tell a stale copy of the gate list from a correct one. Neither view is read by the weekly Canva run, so losing either one on a Sunday costs nothing.

## 4. The Canva feed contract

Unchanged by the two views, and worth saying so: neither one writes a Canva string, neither one is read by the weekly run, and the feed stays tab 2. The strings are v1's, word for word, and they do not change without Ethan's approval:

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
| Within the hour, any day | each officer | a row of theirs has been added that nobody has told them about |
| Daily 18:00 | each officer | something of theirs is due tomorrow or overdue |
| Sunday | Ethan | always: ready or not, what is overdue, what was accomplished, what needs attention |
| On failure | Ethan | at most once per job per day, and the error is re-thrown so Google's own notice fires |

**The system is not bound to the week.** Ethan ruled on 2026-09-29 that a deliverable can be assigned on any day. A row typed on a Wednesday is on its officer's phone at the next open, and the hourly pass sends that officer one `New on your list` email within the hour, listing only the rows nobody has told them about, then stamps those rows in `Notified at`, column R of `03 | Deliverables`. The Monday email stamps everything it lists, so a row is announced once and summarised weekly; clearing a stamp has the row announced again. The carousel stays weekly, because it is a publication and not a notification.

The digest goes out in the EVENING, not the morning, and the workbook has always shipped 18:00 while this line said 07:00. Ethan ruled on 2026-09-28 that the evening is right and the line was wrong: a warning about tomorrow arrives while there is still an evening to act in, and an overdue item is not flagged on a morning when somebody is heading to class. One email per person per type, never one per item. A TEST mode sends everything to Ethan instead. The quota guard stops sending before the daily limit rather than half-sending a batch.

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
5. The Canva master design built out to 15 pages: the title page, then one page per officer in hierarchy order, President on page 2 through Finance on page 15, each page carrying fifteen item frames. One session in Canva, once. Do not draw it before `Checks > Switch the carousel to all fourteen` has run and the self test is clean, because the slide numbers the export list uses come from the workbook and a page drawn against a different numbering is a page the run will skip.

## 10. Conventions

- Settings live in `00 | Configuration` and are read through named ranges, never hardcoded, never by cell address.
- Setup is idempotent: re-running creates what is missing and repairs formatting and validation, and never touches an item, a token, an archive row or a log row.
- No em dashes in anything a person reads.
- The workbook is Poppins throughout, with gridlines on and **nothing frozen on any tab, rows or columns**, the hidden machine tabs included. Ethan ruled on columns on 2026-09-27 and extended it to rows on 2026-09-28. The cost is named rather than skipped: on `03 | Deliverables`, `06 | Archive` and `07 | Log` both the column headers and the hint row scroll away, so a reader far down the table sees unlabelled columns, and on the three card tabs the tab's own banner leaves the screen. What carries the weight instead is that every block states itself where it sits: a card carries its own band and its own header beside its own data, the leftmost columns hold the identifier and the verdict with detail running right, and the five columns Ethan types into on the data tab are the five cream ones, which is a signal that does not scroll.
- Colors come from the IS9 palette only: `#085040`, `#58756a`, `#5d4170`, `#8a64a9`, `#8b74a1`, `#724485`, `#e9ebd4`, `#F8FBFD`. Dark text is `#085040`. `#1C2120` never appears in the workbook, and survives only as the number text hex the Canva feed prints. **The seven visible numbered tabs take the seven palette colors that are not the page background, and no two of them share one.** `07 | Log`, `_Engine` and `_Views` all take the page background, on the rule that a tab outside the reading order does not claim a colour from it: the Log is hidden, so it is outside that order. That is what makes eight numbered tabs fit seven colours without an arbitrary reuse. **Cream is the chip on `01 | Configuration`**, the tab that is almost entirely input cells, because `#e9ebd4` means one thing in this workbook and the tab bar has to say what the cells say. It sat on `05 | Officer Tables` until 2026-09-28, a tab whose own help line says there is nothing to fill in there.
- `#e9ebd4` means one thing, everywhere in the workbook: **this cell is yours to type into**. That is why banding is gone from those blocks, and why a flag anywhere in the workbook is bold `#724485` text on the paper white `#F8FBFD` with **no cream and no fill of its own**, optionally with a `#724485` border. The earlier treatment, bold `#724485` on `#e9ebd4`, is withdrawn: it painted cream behind a calculated Check cell, which is the one cell a reader must never type into, and it destroyed the only visual rule a first time reader can learn in one second. The self test asserts that no cell on a tab nobody types into carries the cream fill, and that no conditional format rule reaches for it either.
- On `03 | Statistics` the three charts are built with the Apps Script chart builder, anchored over the reserved blank rows of their own card in the bottom row of the grid, and **every chart is removed before any is inserted**, because `insertChart` appends and a build run twice would otherwise leave six. The three sit side by side now, so a chart is identified by its anchor row **and** its anchor column: keying on the row alone would read three charts in three cards as three charts stacked on one anchor. A chart with no data yet is still inserted and still renders; the caption row above it says in plain words what will fill it.
- Nothing in the workbook is merged. The Drive connector renders a merged cell as a repeated `[merged]` value, and every tab is inside the same read, so a bar of text across a filled span is column width, type scale and overflow wrap and never a merge.
- There is no green and no red in the palette, so a good state is not a color. Good is **no treatment at all**; a number worth the eye that is not a fault is `#8a64a9`; a blocking or overdue state is bold `#724485` on `#F8FBFD` and never on cream; something superseded or not applicable is `#8b74a1`; a broken lookup is the literal `!ERR`, flagged and counted. The restraint is the design: a tab is calm by default and only an exception is decorated.
- Asia/Manila everywhere, in the spreadsheet and in `appsscript.json`.
- Every named range is **dropped before it is created** on every build. `Spreadsheet.setNamedRange` does not move a name that already exists: it adds a second definition, a formula resolves the older one, and a reader that builds a map keyed on the name sees the newer one. So on a workbook built by more than one layout, a name whose block has moved keeps pointing where the earlier layout put it, and every check that asks where it points reads clean. That is exactly what made the directory's Check column report a missing slide number on all nine publishing rows while `_Engine` held 1 to 9 correctly. The self test asserts that no name carries two definitions.
- `IS9WD` prefixes functions and named ranges, matching Ethan's other sistemas.
