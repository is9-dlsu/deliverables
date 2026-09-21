# IS9 Weekly Deliverables Tracker: Build Spec

## 1. Purpose

This spreadsheet is the single source of truth for each IS9 committee's weekly deliverables.

Every Sunday, Claude (in a claude.ai chat, using the Canva connector) reads this spreadsheet through Google Drive and updates a 10-page Canva carousel: page 1 is a title page, pages 2 to 10 are one page per committee. Canva design ID: DAHVvLLgskQ. Canva editing is NOT part of this build.

The spreadsheet must do two jobs:

1. Make data entry by each committee's Vice President (VP) simple, validated, and protected.
2. Compute every string, count, and color the Canva pages need in one flat tab (`01 | Canva Feed`), so the weekly Canva update is a mechanical copy with no interpretation.

Out of scope: editing Canva, touching the EBEXECOM MasterSheet, and any task status (deliverables have no status field by design).

## 2. Stack and conventions

- Google Sheets with a container-bound Apps Script project, developed locally with clasp, then pushed.
- Local folder: `D:\apps-script\dlsu\is9-deliverables-tracker`
- DLSU-owned project: every clasp command must include `--user dlsu`.
- Create the spreadsheet and bound script with clasp (title: `[IS9] Weekly Deliverables Tracker`). Check `clasp --help` on the installed clasp 3.4.1 for the exact create command and flags before running anything.
- Settings live in the `00 | Configuration` tab. Code reads them at runtime; nothing organization-specific is hardcoded except tab names and the default values written during setup.
- Setup is idempotent: re-running it creates missing pieces and resets formatting and validation, but never deletes tabs, duplicates tabs, or wipes VP-entered data.
- No em dashes anywhere in user-facing text (tab labels, menu items, notes, emails). Use commas, colons, or pipes.
- Spreadsheet time zone: Asia/Manila. Spreadsheet locale must be English (en_PH or en_US) so `TEXT(date, "ddd, mmm d")` returns English day and month names.
- Set recalculation to "On change and every hour" (`setRecalculationInterval(SpreadsheetApp.RecalculationInterval.HOUR)`), because Claude reads cached values through Drive and date-based formulas must stay current.
- Prefix constants and functions with `IS9WD` where it helps, matching Ethan's other sistemas (IS9PA, IS9POST).

## 3. Workbook structure (exact tab names, in order)

1. `00 | Configuration`
2. `01 | Canva Feed` (formulas only; admins can edit, nobody else)
3. `02 | Partnerships`
4. `03 | Publication`
5. `04 | Marketing and Advocacy`
6. `05 | Memberships`
7. `06 | Team Management`
8. `07 | Investments Strategy & Literacy`
9. `08 | Investment Research`
10. `09 | Documentation`
11. `10 | Finance`
12. `11 | Archive`

Tab numbers 02 to 10 equal the committee's page number in the Canva carousel.

## 4. `00 | Configuration`

**A. Week settings**

| Setting | Type | Default |
|---|---|---|
| Term start (Monday of Week 1) | date input | blank, Ethan fills |
| Today override | date input, optional | blank. When filled, every formula uses it instead of TODAY(). Used for testing and for re-running a past week |
| Effective today | formula | `IF(override<>"", override, TODAY())` |
| Week start (Monday) | formula | next Monday on or after effective today: `today + MOD(8 - WEEKDAY(today, 2), 7)`. On a Sunday this returns the next day |
| Week end (Sunday) | formula | week start + 6 |
| Week number | formula | `INT((week start - term start) / 7) + 1`, shown as two digits (04) |
| A.Y. label | text input | `A.Y. 2026 - 2027` |
| Entry cutoff | display text | `Saturday 8 PM before the week starts` |

**Urgency windows** (computed from week start):

| Window | Dates | Station color | Number text color |
|---|---|---|---|
| OVERDUE | deadline before week start | `#e9ebd4` | `#1C2120` |
| W1 | Monday to Tuesday of the week | `#e9ebd4` | `#1C2120` |
| W2 | Wednesday to Sunday of the week | `#8a64a9` | `#F8FBFD` |
| W3 | after week end | `#085040` | `#F8FBFD` |

Store the colors in Configuration cells so they can be changed without code.

**B. Sign-off**: Prepared by (full name, position) and Checked by (full name, position). All four are text inputs, blank by default.

**C. Committee directory** (9 rows, pre-filled with page number, committee name, and tab name):

| Page | Committee | Tab name | VP full name | VP position label | VP email | Extra editor emails |
|---|---|---|---|---|---|---|

- VP position label defaults to `VICE PRESIDENT`.
- Extra editor emails are comma-separated.

**D. Admin editors**: one email per row. Default: `ethan_gabriel@dlsu.edu.ph`. Admins can edit every range in the workbook.

## 5. Committee tabs (`02` to `10`), identical layout

- Rows 1 to 4, header block: committee name, VP name (from Configuration), and this instruction text:
  > One row per deliverable, 10 maximum. Fill in by Saturday 8 PM. Clear a row once it is delivered. Anything left with a past deadline shows as overdue.
- Row 6, table header: `No.` | `Title of Task` | `Deadline` | `Remarks` | `Check`
- Rows 7 to 16: exactly 10 rows, with `No.` pre-filled `01` to `10`.

**Field rules**

- **Title of Task:** required when the row is used. Maximum 40 characters, enforced with data validation (custom formula `LEN(B7)<=40`, reject input). Help text: `Max 40 characters. Start with a verb.`
- **Deadline:** date only, enforced with data validation (valid date, reject input), with the date picker. Format `ddd, mmm d`. Times do not go here; a time goes in Remarks. This keeps the Canva date line one fixed width.
- **Remarks:** optional, maximum 30 characters, enforced with data validation. Help text: `Instructions only (where it goes, who signs off). Never progress or status.`
- **Check:** a formula, not editable. It shows `Missing title`, `Missing deadline`, `Overdue`, or blank.

**Protection**

- Only `B7:D16` is editable, by the committee's VP email, the extra editors, and the admins.
- Everything else on the tab is admin-only.

**Formatting**

- Use the IS9 palette:
  - Tab header fill `#5d4170` with `#F8FBFD` text.
  - Table header fill `#085040` with `#F8FBFD` text.
  - Input rows alternate `#F8FBFD` and `#e9ebd4`.
- Use one clean Google Font (for example Montserrat).
- Freeze the rows through row 6.

## 6. `01 | Canva Feed`: the contract with the weekly Canva run

Every value here is a live formula; nothing needs a manual refresh. Strings must match these formats exactly, including double spaces around pipes, the middle dot, and uppercase.

**A. Readiness summary (top of tab)**

- Total deliverables.
- Number of rows with a Check flag.
- `Ready for Canva: YES` or `NO`. It reads NO if any row has `Missing title` or `Missing deadline`.

**B. Title page block (page 1)**

| Field | Example |
|---|---|
| Week line | `WEEK 04  \|  SEP 21 TO 27  \|  A.Y. 2026 - 2027` |
| Legend 1 | `DUE SEP 21 TO 22` |
| Legend 2 | `DUE SEP 23 TO 27` |
| Legend 3 | `DUE AFTER SEP 27` |
| Prepared by name, position | `JUAN DELA CRUZ`, `Vice President` (name uppercase, position as typed) |
| Checked by name, position | same format |

Date ranges that cross a month read `SEP 30 TO OCT 4`. Same month reads `SEP 21 TO 27`.

Then add one row per committee, in page order, with these columns: `Page` | `Committee` | `Count` | `Next due text` | `Station hex` | `Number text hex`.

- **Committee:** uppercase, for example `MARKETING AND ADVOCACY`.
- **Count:** the number of rows with a title.
- **Next due text:**
  - `Overdue: Fri, Sep 18` if any row is overdue (use the earliest overdue date).
  - Otherwise `Next due Mon, Sep 21` (the earliest deadline).
  - If Count is 0: `No deliverables this week`.
- **Station hex:** the color of the committee's most urgent window. With no deliverables, use the W3 color.

**C. Committee page block (pages 2 to 10)**

Each committee has a header row:

| Field | Example |
|---|---|
| Page | `02` |
| Headline | `PARTNERSHIPS` |
| VP line | `JUAN DELA CRUZ  \|  VICE PRESIDENT` |
| Tagline | `WEEKLY DELIVERABLES  \|  WEEK 04  \|  SEP 21 TO 27  \|  10 TASKS` (`1 TASK` when singular) |

Below the header come exactly 10 slot rows per committee (90 in total), sorted overdue first (oldest first), then by deadline ascending, then by original row number. Only rows with a title count; unused slots are blank with `Visible = FALSE`.

| Column | Example / rule |
|---|---|
| Page | `02` |
| Slot | `01` to `10` |
| Visible | TRUE or FALSE |
| Title | as typed |
| Deadline text | `Due Mon, Sep 21`, or `Overdue: Fri, Sep 18` |
| Remark visible | TRUE if Remarks is non-empty |
| Remark text | `·  Send final name to Publication` (middle dot, two spaces), or blank |
| Window | `OVERDUE`, `W1`, `W2`, or `W3` |
| Station hex | from Configuration |
| Number text hex | from Configuration |
| Flag | copied from Check |

**D. Flags list**: every flagged row, with its committee, slot, and flag. Claude reports these to Ethan before touching Canva.

## 7. Menu: `IS9 Deliverables`

1. `Build or repair workbook`: the idempotent setup from sections 3 to 6.
2. `Apply protections`: reads Configuration and applies section 5 protections plus the admin-only tabs. It logs what it applied to the execution log.
3. `Seed sample data` and `Clear sample data`: see section 9. Clearing must remove only sample rows.
4. `Archive this week`: appends the current week's visible feed rows to `11 | Archive`, with week number, committee, title, deadline, remarks, and timestamp. It clears nothing.
5. `Send reminder emails` (build only after Ethan approves this feature): a manual trigger. It emails each VP whose tab is empty or has flags, from the Configuration directory, and logs a send status per committee in Configuration.

## 8. Archive tab

Columns: `Week` | `Week start` | `Committee` | `Title of Task` | `Deadline` | `Remarks` | `Archived at`. It is append-only.

## 9. Sample data and tests

With `Today override = 2026-09-20` (a Sunday), the week is Sep 21 to 27 and Term start should give Week 04 (set Term start to 2026-08-31 for the test).

Seed these into `02 | Partnerships`:

| Title of Task | Deadline | Remarks |
|---|---|---|
| Confirm speaker for Debt Traps Exposed | 2026-09-21 | Send final name to Publication |
| Send Homecoming sponsorship deck | 2026-09-21 | |
| Follow up on 4 pending sponsor replies | 2026-09-22 | |
| Finalize partner LOI template | 2026-09-23 | For EVP-EXT sign-off |
| Draft MOA for Homecoming venue partner | 2026-09-24 | Attach venue quotation |
| Submit xDeals shortlist to Finance | 2026-09-25 | |
| Prep speaker kit for Debt Traps Exposed | 2026-09-26 | |
| Pitch Summit Diamond tier to 3 banks | 2026-09-30 | Use the updated tier deck |
| Renew MOAs with IS8 partners | 2026-10-01 | |
| Update partner contact directory | 2026-10-02 | |

Add one overdue test row to another committee (deadline 2026-09-18) and leave one committee empty.

**Acceptance checks**

- A fresh build creates all 12 tabs. A second run changes no data and creates no duplicates.
- Validation rejects a 41-character title, a 31-character remark, and a non-date deadline.
- The Partnerships feed shows 10 visible slots in date order:
  - Slots 01 to 03 are W1 with `#e9ebd4`.
  - Slots 04 to 07 are W2 with `#8a64a9`.
  - Slots 08 to 10 are W3 with `#085040`.
  - Tagline ends `10 TASKS`.
- The overdue row appears in slot 01 of its committee with `Overdue: Fri, Sep 18`, and that committee's title page text reads `Overdue: Fri, Sep 18`.
- The empty committee shows Count 0 and `No deliverables this week`.
- Protections: each VP email can edit only `B7:D16` on their own tab. List all protections to confirm.
- A search of every string the script writes finds no em dash character.
