# IS9 Weekly Deliverables Tracker: Build Spec v2

Supersedes SPEC v1 (commit 43b1631). v1 assumed nine committee tabs filled in by nine VPs with per-VP range protections. That assumption was wrong: Ethan enters everything. Everything downstream of it is rebuilt here. The `01 | Canva Feed` string contract in section 6 is carried over word for word.

Revised 2026-09-27 with Ethan's decisions: the status model is a two state **checklist** (1.3), the cross-origin behaviour of an Apps Script `/exec` endpoint is **measured fact** and Shape A is the decided shape (7.1, 7.2), the directory covers **14 people** rather than nine (4.8), the repo is **public**, in the IS9 GitHub organisation `is9-dlsu` (2.6), the sign-off is **per week** rather than four static settings (4.5), **Term 1 starts Monday 2026-09-07** (4.3), and the two DLSU policy questions are **answered** (2.2). What is still open is in Appendix B. The only blanks left that block Gate A are Term 1's end date and the Term 2 and Term 3 dates.

Revised again on 2026-09-27, later the same day, with Ethan's pagination decisions. Five things changed and they reach into almost every section:

1. **The publish set stays at the nine committees** (4.8, 6.1 item 8). The President and the four EVPs keep items, private links, emails and their own block in the Sunday brief, and have no Canva page. The reason is arithmetic rather than taste and it is written into 6.1 item 8 so nobody reverses it casually.
2. **There is no cap on items per person** (5.4). The entry-time refusal of the eleventh item, the `Over cap` flag and its hold on readiness are gone. What a committee publishes is bounded instead: ten slots per Canva page, at most two pages, so at most twenty published items, and anything past that is tracked, emailed, shown in the app and counted in the feed rather than dropped in silence.
3. **The carousel is computed, not fixed** (6.3, 6.4). The master design is a permanent 19 pages, one title page plus an adjacent pair per committee, and the week's carousel is a subset of them exported in ascending page order. Nothing is added, deleted or reordered in a weekly run.
4. **Hierarchy order governs every list a person reads** (4.8, 8.5c, 7.8): the President, then the four EVPs, then the nine committees in their existing order. The carousel keeps the nine committees in their existing order, because only they publish.
5. **Ethan ruled on Appendix A2.** Items 1, 2, 3, 4, 6, 7, 8 and 9 are accepted and are therefore applied in this revision; item 5 was withdrawn earlier the same day; item 10, a `Status` column on the slot rows, is skipped. A2 now carries only the new proposals the page plan raised, each with an interim behaviour (Appendix A2).

---

## 0. Architecture at a glance

```
                 ETHAN (phone or laptop)        13 LINK HOLDERS (phones)
                        |                                 |
                 #/a/<admin token>                  #/m/<own token>
                        |                                 |
                        v                                 v
        +---------------------------------------------------------------+
        |   React + Vite app, one bundle, hash routing, no sign-in      |
        |   Shape A, decided: GitHub Pages, POST with text/plain        |
        |   Public repo in the IS9 org. Shape B is a fallback, unbuilt  |
        +---------------------------------------------------------------+
                                    |
                        one JSON envelope, one router
                                    v
        +---------------------------------------------------------------+
        |  Container-bound Apps Script project, Ethan's DLSU account    |
        |  IS9WD_Api (router)   IS9WD_Core (pure, Node tested)          |
        |  IS9WD_Items  IS9WD_Emails  IS9WD_Automation  IS9WD_Setup     |
        |  access ANYONE_ANONYMOUS, executeAs USER_DEPLOYING            |
        +---------------------------------------------------------------+
                                    |
                                    v
        +---------------------------------------------------------------+
        |  Google Sheet: [IS9] Weekly Deliverables Tracker              |
        |  00 Configuration | 01 Canva Feed | 02 Deliverables           |
        |  03 Statistics (KPI tiles + 3 charts) | 04 Officer Tables     |
        |  05 Archive | 06 Log (hidden)                                 |
        |  _Engine (hidden: the settings the code needs)                |
        |  _Views  (hidden: the helper band both views read)            |
        +---------------------------------------------------------------+
              |                                    ^
              | Drive connector (2.2)              | one hourly trigger
              v                                    | (5 jobs, done keys)
        claude.ai chat  ->  Canva DAHVvLLgskQ      MailApp, 4 email types
```

**Five moving parts, five owners of truth.**

| Part | Owner of truth | Never |
|---|---|---|
| Items | `02 \| Deliverables` | never in the app's local state |
| Settings a president sets: the week, the trimester dates, the people, the switches, the addresses, the sign-off | `00 \| Configuration`, read through named ranges | never a constant in code |
| Settings the code needs: colors, statuses, schedule, capacity, thresholds, diagnostics, the sign-off store | `_Engine`, hidden, read through the same named ranges | never a constant in code, and never on a tab Ethan reads |
| Canva strings | `01 \| Canva Feed`, formulas mirroring `IS9WD_Core.js` | never built in the browser |
| Tokens | Script Properties | never a Sheet cell |
| URLs | `00 \| Configuration` | never a constant, never only in an old email |

**What is decided** (sections 1 to 13) and **what is not**: the one technical unknown that used to gate the app, whether a browser on another origin can call an Apps Script `/exec` endpoint, was measured on 2026-09-27 and is settled. Section 7.1 states the measurement, section 7.2 states the decided shape, and section 7.7 keeps the other shape as a short paragraph, a disaster fallback that is not built. Everything still open is in Appendix B.

---

## 1. Purpose and roles

This workbook is the single source of truth for each IS9 committee's weekly deliverables.

Every Sunday, Claude (in a claude.ai chat, using the Canva connector) reads the workbook through the Google Drive connector and updates the Canva carousel `DAHVvLLgskQ`. The master design is a permanent **19 pages**: page 1 is the title page, and each of the nine committees owns an adjacent pair of pages, its items page and its continuation page. The **carousel is a subset of those pages**, between 10 and 19 slides, exported in ascending page order (6.3). Canva editing is NOT part of this build. The weekly run procedure lives in `canva/CANVA_RUN.md` in the repo, never in the workbook.

### 1.1 Roles

| Role | Who | What they touch |
|---|---|---|
| Owner and sole editor | Ethan, on his `dlsu.edu.ph` account | The Sheet, the bound script, the deployment, the GitHub repo. Adds, edits and deletes every item, ticks or unticks any item at any time, and is the only one who can reopen an item after the undo window. |
| Directory entry, 14 of them | The nine committee VPs, Ethan, and the four EVPs | One private link, their own committee or office only. One action: tick their own items off, and untick inside the undo window. They never open the Sheet and never sign in. Thirteen of the fourteen hold a member link; the President's row is Ethan's own and carries no member token, because he already holds the admin token (7.3). |
| Reader | Claude, through the Drive connector | Reads `01 \| Canva Feed`. |

### 1.2 The three jobs

1. Let Ethan enter and maintain every committee's and every office's deliverables from a phone or a laptop, without opening the Sheet.
2. Let each of the 13 member link holders tick their own items off, with no Google sign-in and no Drive access. Ethan does the same for his own items from the admin link.
3. Compute every string, count and color the Canva pages need in one flat tab (`01 | Canva Feed`), so the weekly Canva update is a mechanical copy with no interpretation.

### 1.3 Status model

A **checklist**, decided by Ethan on 2026-09-27. Two statuses, defined in Configuration and nowhere else:

| Status | Terminal | Meaning |
|---|---|---|
| `Open` | no | on the list, still to be done |
| `Accomplished` | **yes** | done, leaves the Canva feed, archivable |

- **Active** means "status is a known status and is not terminal". Active is the only concept the rest of this spec uses. Counts, what publishes (5.4), the feed, `Overdue`, and all four emails read Active, never a label. Keeping Active is what makes the label set cheap: renaming either label, or adding a third, is one Configuration edit plus one `Build or repair workbook`, with no code change.
- **In the app a person taps a checkbox on their own item.** Tapping again inside `IS9WD_UNDO_SECONDS`, default 60, unticks it. After that window only Ethan can reopen the item, from the admin link. Ethan can tick or untick anything at any time.
- **The undo window is enforced on the server**, against the item's stored `Status at` and the server clock (7.5), never in the browser. A reload, a second device or a wrong client clock cannot widen it.
- **Overdue**, everywhere a human reads it, means deadline before effective today and Active. The Canva `OVERDUE` window means deadline before week start, unchanged from v1. See 5.3.
- Status does **not** appear on the carousel, so the section 6 contract is unchanged.

Out of scope: editing Canva, building the master design's 19 pages (a one time hand build under Ethan's approval, 6.3), the EBEXECOM MasterSheet, per-VP Sheet access, a third status, percentages, file uploads as proof.

---

## 2. Stack, hosting, accounts and conventions

### 2.1 Two halves

| Half | What | Where it runs |
|---|---|---|
| Back end and data | Google Sheet plus a container-bound Apps Script project | Ethan's DLSU Workspace account |
| Front end | React plus Vite app, written and maintained by Claude Code in this repo | Static files, free hosting, or inlined into an Apps Script page (see 7.7) |

Local folder: `D:\apps-script\dlsu\is9-deliverables-tracker`.

### 2.2 Host account

The Sheet and its bound script live on **Ethan's `dlsu.edu.ph` account**, a DLSU Google Workspace for Education account. The address itself is not written into this file or anywhere else in the repo, because the repo is public (2.6); it lives in `IS9WD_ADMIN_EMAIL`. Verified on that account on 2026-09-27: the Deploy dialog's "Who has access" list offers plain **Anyone** (manifest value `ANYONE_ANONYMOUS`), and the Apps Script API toggle at `script.google.com/home/usersettings` is on, so clasp can push.

| Fact | Consequence |
|---|---|
| Email recipients per day: **1,500** on Workspace, 100 on consumer (GOOGLENATIVE20, HANDOVER17) | Comfortable. Worst realistic day here is 33, for 14 recipients (8.6). Still exactly one email per person per type. Never one per deliverable. |
| Triggers total runtime per day: **6 hours** on Workspace, 90 minutes on consumer | One hourly trigger, 24 runs, a few minutes total. |
| Script runtime 6 minutes per execution, 30 simultaneous executions per user, 20 triggers per user per script | No limit bites at this size. |
| `MailApp` option `noReply` is Workspace only (EMAIL7) | Available here. Default off so replies reach Ethan. |
| Ownership can move between two accounts in the same domain | Handover to the next DLSU president works. Section 12. |
| "Web apps deployed in one domain cease to function if their ownership changes to a shared drive or account in a different domain" (HANDOVER12, ADMINCONTROLS22) | Never move this file to a shared drive or out of the domain without redeploying. |
| A DLSU admin can turn Apps Script off for an OU, blocking the web app, the menu and every trigger at once (ADMINCONTROLS1, ADMINCONTROLS2) | **Ethan confirmed on 2026-09-27 that Apps Script is enabled** for the OU his account sits in. An administrator can still change that later, so the Sheet must stay usable by hand with the app dead. See 5.3 and 5.6. |

**The Canva reader may need no share at all.** Ethan's claude.ai Drive connector is connected to **both** his DLSU account and a personal address, so the weekly run may be able to read a DLSU-owned Sheet directly, with nothing shared to anyone. That is the state to aim for, because every share is a standing grant nobody reviews. So the setup order is: **test the real read first**, from the claude.ai chat that will do the weekly run, against the live Sheet; and **only if the DLSU account cannot read it**, share Viewer access to the personal address that the connector also holds. Configuration records both as settings, `IS9WD_ADMIN_EMAIL` and `IS9WD_READER_EMAIL`, and neither address is written into this document or anywhere else in the repo, because the repo is public (2.6). If the share is needed it is a **manual two-click step** in the Phase 9 and handover checklists. The script never calls `DriveApp`: any `DriveApp` call would infer the full `drive` scope, read and write over all of Ethan's Drive, attached to a world-reachable web app, to automate something done once in the tool's life. **Confirmed by Ethan on 2026-09-27:** DLSU does permit sharing a Drive file to a personal gmail address (ADMINCONTROLS11), so the fallback is available. Gate A item 4 records both answers, and both stay on the risk list at 11 risks 10 and 11, because an administrator can change either setting later with no notice.

### 2.3 clasp

Verified against the installed clasp **3.4.1** on 2026-09-27. Re-check `clasp <command> --help` before running any command that writes.

- `--user dlsu` on every command. **Verified 2026-09-27:** `~/.clasprc.json` now holds a `dlsu` entry and `clasp --user dlsu show-authorized-user` reports the DLSU account. (It was absent on 2026-09-21. If it ever goes missing, `clasp login --user dlsu` is an interactive browser flow and is **Ethan-only**, it cannot run from an agent shell.) The clasp account must be the Sheet owner, or a bound push lands in the wrong project.
- `create-script --type` accepts only lowercase `docs, forms, sheets, slides, standalone, webapp, api`. The help text says "Spreadsheet", which fails.
- With a container type, clasp calls `drive.files.create` with no parents, so `--parentId` is ignored and the file lands in My Drive root. A failure after "Creating script..." can leave an orphan Sheet. Do not blindly retry.
- To bind into a chosen folder: create the Sheet in that folder by hand, then `clasp --user dlsu create-script --title "[IS9] Weekly Deliverables Tracker" --parentId <spreadsheetId>` with no `--type`.
- `clasp push` in a non-TTY shell silently skips the whole push ("Skipping push.", exit 0) when `appsscript.json` changed. Always `clasp --user dlsu push -f` and check the output says "Pushed N files".
- **Before the first push**, run `clasp --user dlsu show-file-status` (alias `status`), which lists exactly what would be pushed without pushing. It must list only `appsscript.json` and the `IS9WD_*.js` files. Nothing from `app/`, `test/`, `tools/`, `docs/`, `canva/`, and no `App.html`, which exists only in the unbuilt fallback of 7.7. This is the check that `.claspignore` is doing its job.
- Release, verified command names and flags:

  | Step | Command |
  |---|---|
  | push | `clasp --user dlsu push -f` |
  | cut a version | `clasp --user dlsu create-version "<description>"` |
  | repoint the existing deployment, same `/exec` URL | `clasp --user dlsu update-deployment <deploymentId> --versionNumber <n>` |
  | list | `clasp --user dlsu list-deployments` |

  `clasp push` alone changes nothing a link holder sees: a deployment is pinned to a version. Never create a second deployment for a routine release, or the URL changes.
- The head deployment URL ends `/dev` and only accounts with edit access to the script can open it. Never send a member a `/dev` URL (WEBAPP23).
- **No result is reported only to the execution log.** `clasp run-function` and tail-logs are not practical against a bound project here, so every menu action ends in a dialog or a toast plus a row in `06 | Log`, and every scheduled job ends in `Last status` plus a row in `06 | Log`. The execution log is a debugging aid, never the record.
- Keep every file pasteable by hand. If DLSU API controls ever block the clasp OAuth client (ADMINCONTROLS16, ADMINCONTROLS17), the project must still be installable through the editor.

### 2.4 Manifest

```json
{
  "timeZone": "Asia/Manila",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/script.container.ui",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/userinfo.email"
  ],
  "webapp": {
    "access": "ANYONE_ANONYMOUS",
    "executeAs": "USER_DEPLOYING"
  }
}
```

- **`timeZone` is `Asia/Manila` and is checked at every push.** The manifest clasp writes for a new project defaults to `America/New_York`, and a mismatch between the manifest time zone and the spreadsheet's would put every `Utilities.formatDate`, every trigger hour and every `Status at` stamp twelve hours away from the spreadsheet's own dates, silently. `IS9WD_selfTest()` compares `Session.getScriptTimeZone()` against the spreadsheet's and fails on a difference.
- The manifest **records the intended access value and makes it reviewable in git**. It does not override a value chosen in the Deploy dialog, and it governs only deployments created after it. So the live value is **confirmed after every deployment** in Manage deployments and by a signed-out `ping` (13.3).
- `USER_ACCESSING` is forbidden. It would force all 14 people to hold Sheet access, which is the model this spec exists to remove.
- `Session.getActiveUser().getEmail()` therefore returns a blank string. **The token is the entire identity.** Code must never treat that email as present. `Session.getEffectiveUser()` (the owner) is still available and is what the automation-owner guard uses.
- Scopes are declared, not inferred, because scopes change when a service is added and an anonymous caller can never be shown a consent screen: a version whose inferred scopes exceed what the owner has granted fails for everyone with no browser-recoverable path. **Mandatory release step, from Phase 7 onward:** after adding any service, run one function from the editor, accept the prompt, and only then cut a version and repoint the deployment. `spreadsheets.currentonly` is used rather than full `spreadsheets` because the script touches only its own container; if a call proves to need the wider scope, widen it deliberately and re-authorize.
- No `UrlFetchApp`, so the DLSU outbound URL allowlist (ADMINCONTROLS15) can never bite. No `DriveApp`, so the `drive` scope never enters the project (2.2). No advanced services in Phases 1 to 9; the optional Tasks mirror (section 15) adds `Tasks v1` and one scope.

### 2.5 Conventions

- Settings live in `00 | Configuration`. Code reads them through **named ranges**, never by cell address. The only hardcoded strings are tab names, named range names, job keys, error codes, action names, and the defaults written during setup.
- Setup is idempotent: re-running creates missing pieces and resets formatting, validation, formulas and named ranges, but never deletes a tab, never duplicates a tab, and never wipes an Ethan-entered item, a token, an archive row or a log row. Idempotent means **nothing accumulates**, which takes explicit work in four places: a named range is re-pointed with `setNamedRange` on the same name rather than created again; banding is removed by range before it is applied; conditional format rules are rebuilt by replacing the sheet's whole rule list rather than appending to it; data validations are set with `setDataValidations` over the full range; and triggers are handled by 8.1. Anything appended instead of replaced silently doubles on every run, and none of the four shows up on screen until the file is slow.
- No em dashes anywhere in user-facing text: tab labels, menu items, notes, help text, app copy, emails, error pages, commit messages. Use commas, colons or pipes. Checked automatically, 13.4.
- **Function visibility.** This rule existed to make Shape B safe. Shape B is not built (7.7), and the rule stays anyway, because it costs nothing and because it is the only thing standing between a future `google.script.run` and the whole project. `google.script.run` exposes server globals, not only the function you meant to expose. So: **every function in the project ends in `_`**, except `doGet`, `doPost`, `onOpen`, `IS9WD_rpc`, the menu handlers, and the tested API of `IS9WD_Core.js` listed in the 13.1 table. Core is exempt because its names are pinned by 233 tests written against this document, and because every one of those functions is pure: no function in Core reads or writes the workbook, sends mail, or touches Script Properties, so reaching one through a future `google.script.run` returns a computation over arguments the caller already had. See Appendix C R13. A trailing underscore is the documented Apps Script private convention and is the first layer. The load-bearing layer is the second: **every menu handler's first statement is `IS9WD_assertUiContext_()`**, which calls `SpreadsheetApp.getUi()` in a try/catch and throws unless a document UI is attached. A `google.script.run` web app context has no UI, so the guard refuses. This is verified ground: `SpreadsheetApp.getUi()` throwing with no UI attached is already documented and relied on in Ethan's EBEXECOM `IS9_Menus.js` (`is9Tell`). The guard precedes every write, send, rotation and seed.
- **A conditional format rule may not reference another sheet.** Sheets refuses it at the moment the rule is applied, which takes a whole build down several tabs later than the mistake, and that is exactly what left `04 | Officer Tables` empty before the 2026-09-27 revision. Most of the thresholds a rule on a view needs are on `_Engine` or `_Views` now, so `IS9WD_Stats.js` puts **every** named range in **every** rule it writes through one wrapper that emits `INDIRECT("NAME")`, including the ones that happen to be local: a wrapper applied selectively is a wrapper somebody forgets. The harness in 13.4 refuses a cross-sheet rule outright.
- **A chart is removed before it is inserted.** `insertChart` appends and has no replace form, so the three charts on `03 | Statistics` are rebuilt by removing every chart on the tab first. Without it a build run twice leaves six charts stacked on three anchors and nothing on screen says so. This is the fifth member of the idempotency list above.
- Spreadsheet time zone `Asia/Manila`. Locale English (`en_PH` or `en_US`) so `TEXT(date, "ddd, mmm d")` returns English day and month names.
- `setRecalculationInterval(SpreadsheetApp.RecalculationInterval.HOUR)`, because Claude reads cached values through Drive and date formulas must stay current.
- Prefix every constant, function and named range with `IS9WD`, matching IS9PA and IS9POST.
- One `onOpen`, one menu, in `IS9WD_Menus.js`, as a simple trigger. A second `createMenu` with the same name produces a second menu rather than merging. A simple trigger may be refused `PropertiesService`, so any label reflecting a toggle goes through `IS9WD_toggleLabel_()`, which falls back to a static label rather than losing the menu bar. This is the EBEXECOM `IS9_Menus.js` pattern.
- **Font Poppins throughout**, set on every tab's full data range by setup, matching the ARW sistema.
- **Gridlines stay visible on every tab.** They are the cheapest alignment cue in a wide sheet, and the design below does not fight them: fills are used for headers and bands only, never to fake a grid.
- **Every tab has a frozen header row**, so a header is always on screen no matter how far down the sheet runs. `02 | Deliverables` freezes four rather than three, because row 4 is the plain English hint row and a hint that scrolls away on row 40 helps nobody.
- **Every cell a person is expected to type into carries the fill `#e9ebd4`, the plain English sentence beside it and the same sentence as its own note; every calculated cell carries none of the three and carries the sentence that says it is calculated.** Ethan's instruction of 2026-09-27, and it is an acceptance check (13.3) and a self test assertion (13.4) rather than a style note. It holds on `00 | Configuration`, on `_Engine` and, per column, on `02 | Deliverables`. The consequence is that **row banding is withdrawn from every block that holds an input column**, and existing bandings are removed rather than left: a banded row would put cream under half the calculated cells.
- **A section band carries only its title, and the plain English line rides in a hint row under it.** The earlier device of appending the help to the band cell in a lighter colour is withdrawn: it read as decoration on the band rather than as an instruction. A band is 38 px, a hint row 26, a header 30, a data row 26 and a spacer 18. The heights grew on 2026-09-27 for the reason Ethan gave: more air.
- **No tab freezes a column.** Ethan's instruction of 2026-09-27, applied workbook-wide as given. It **supersedes** the earlier convention of freezing the key column on a wide tab, and `IS9WD_FREEZE` now reads `cols: 0` on all nine tabs, the two hidden ones included. The cost is named rather than skipped: `02 | Deliverables` shows 2,040 px of columns, `05 | Archive` 2,660 and `06 | Log` 1,930, so on all three, scrolling right loses the row's identity. Neither new view pays anything, because both are sized to fit the grid a 1366 px laptop shows without horizontal scroll: `03 | Statistics` totals 1,180 px of visible columns and `04 | Officer Tables` 1,095. See Appendix C for the ruling. **With no frozen column, column order is the load bearing design decision**, so on every block of both views the leftmost columns carry the identifier and the verdict and the detail runs right. That rule is why the officer block reads `Committee or office | Attention | Due | Done | ...` and not `... | Attention` last.
- **Nothing in the workbook is merged.** `01 | Canva Feed` forbade it because the Drive connector renders a merged cell as a repeated `[merged]` value; every other tab is inside the same read, so the rule extends to all of them. A band of text running across a filled span is achieved with column width, type scale and overflow wrap, and **so is a KPI tile on `03 | Statistics`**: a big number in a wide column with overflow wrap, never a merge. The self test asserts it on both views (13.4).
- **Palette, and nothing outside it.** Section title fill `#085040` with `#F8FBFD` text. Column header fill `#5d4170` with `#F8FBFD` text. Body text `#085040` on `#F8FBFD`. Secondary and hint text `#58756a`. Row banding alternates `#F8FBFD` and `#e9ebd4`. Accent, used for a value that needs the eye, `#8a64a9`. Strong accent, used for a blocking flag as bold text on `#e9ebd4`, `#724485`. Muted accent, for a disabled or superseded row, `#8b74a1`.
- **`#1C2120` is never used in the workbook.** It survives only as a Canva feed value, where it is the number text hex the carousel prints, which is data rather than styling. Dark text in the workbook is `#085040`.
- **Tab colors**, so the seven numbered tabs are distinguishable at a glance: Configuration `#5d4170`, Canva Feed `#085040`, Deliverables `#8a64a9`, Statistics `#724485`, Officer Tables `#e9ebd4`, Archive `#58756a`, Log `#8b74a1`. That is the palette exactly, minus the page background, with no reuse. **The two hidden machine tabs forced the reuse decision this note predicted, and it is taken rather than worked around: `_Engine` and `_Views` both take the page background `#F8FBFD`**, because a tab outside the reading order should not claim a colour from it.
- **There is no green and no red in this palette, so a good state cannot be a colour pair.** The mapping, which is `01 | Canva Feed`'s already and is reused verbatim by both views so the workbook reads as one system: good and nothing to do takes **no treatment at all**, body `#085040` on `#F8FBFD` at plain weight; a number worth the eye that is not a fault takes `#8a64a9`; something that needs attention or is blocking takes bold `#724485` on `#e9ebd4`; something superseded, not applicable or not recorded takes `#8b74a1`; a broken lookup renders the literal `!ERR`, which is flagged and counted. The premium look is the restraint: a tab is calm by default and only an exception is decorated, and everything else is typography and space.
- Every contract string in section 6 is computed once, server side, in `IS9WD_Core.js`. The React app renders strings and never derives them. This is the single rule that stops the front end drifting from the Canva contract.

### 2.6 Repo layout

```
SPEC.md                     this document
CLAUDE.md                   working rules
appsscript.json
.clasp.json                 committed, holds scriptId and rootDir, no secret
.claspignore
.gitignore

IS9WD_Core.js               pure functions, no Apps Script globals, Node testable
IS9WD_Config.js             named ranges, Configuration read and write
IS9WD_Setup.js              build or repair
IS9WD_Feed.js               writes every Canva Feed formula
IS9WD_Stats.js              writes _Views, 03 | Statistics and 04 | Officer Tables
IS9WD_Items.js              item create, edit, delete, status change
IS9WD_Api.js                doGet, doPost, IS9WD_rpc, the router, token resolution
IS9WD_Serve.js              fallback only (7.7), NOT built: would serve App.html
IS9WD_Emails.js             the four emails
IS9WD_Automation.js         hourly dispatcher, schedule, done keys, heartbeat
IS9WD_Archive.js            archive, retire, log
IS9WD_Menus.js              the one onOpen and the one menu
IS9WD_Tests.js              in-sheet self test
App.html                    fallback only (7.7), NOT built

test/core.test.js  feed.test.js  schedule.test.js  token.test.js
test/api.test.js   emdash.test.js

app/                        React + Vite (section 7)
tools/build-gsrun.mjs       fallback only (7.7), NOT built
.github/workflows/pages.yml
canva/CANVA_RUN.md
docs/HANDOVER.md
docs/CORS-MEASUREMENT.md
```

**The repo is public, and that is a design input rather than an accident.** The organisation exists: **`is9-dlsu`**, at `https://github.com/is9-dlsu`, confirmed by Ethan on 2026-09-27. The repo lives there. GitHub's own terms settle the visibility: "If the account that owns the repository uses GitHub Free or GitHub Free for organizations, the repository must be public." GitHub Pages under a free organisation therefore means a public repo. Four consequences, all load bearing:

- **The `/exec` endpoint URL is public**, and so is the bundle that calls it. The endpoint treats every request as hostile until a valid token is proven, which is exactly what the ordering in 7.5 does and why steps 1 to 3 there touch no spreadsheet.
- **Nothing personal is committed. Ever.** No name, no email address, no token, no directory row, no `/exec` URL that matters. Ethan's own address is not in this document's example Configuration values either (4.6). The 14 person directory lives only in `00 | Configuration` (4.8) and he pastes it in at setup. If a written copy is needed during the build it goes under `local/`, which is gitignored.
- **A GitHub Pages URL does not redirect after a repo transfer** (SHEETBACKEDREACT16). So the app URL is a Configuration setting that every email reads through one helper, never a constant and never only in an old email. See 12.2 and 12.3. **The URL follows from the repo name, so the rule is written here rather than a name invented:** a project repo publishes at `https://is9-dlsu.github.io/<repo name>/`, and the one special case, a repo named exactly `is9-dlsu.github.io`, publishes at `https://is9-dlsu.github.io/`. Whatever it turns out to be, it is read from `IS9WD_APP_BASE_URL` and never hardcoded, and `VITE_IS9WD_BASE` must match the path segment or every asset 404s (7.7).
- **The endpoint reaches the bundle through a build variable, not a committed file** (7.2), and `docs/HANDOVER.md` points at the Configuration tab instead of restating the URLs.

`.clasp.json` is **committed**, matching `arw-2026-registration-tracker` and `is9-ebexecom-mastersheet`. A scriptId is not a credential and the project itself is access controlled, so it is the one identifier that stays in git. It holds the scriptId and no credential. The credential file is `~/.clasprc.json`, which is outside the repo. The next president cannot push a cloned repo without the scriptId, so it belongs in git, and `docs/HANDOVER.md` carries the scriptId and the Canva design id and nothing else: for the deployment id, the `/exec` URL and the Pages URL it points at `00 | Configuration`, because those three are settings and the repo is public.

`.gitignore`:

```
.clasprc.json
app/node_modules/
app/dist/
local/
```

`local/` is where anything personal goes while the build is running: the roster paste, a link list, a test inbox note. Nothing in it is ever committed.

`.claspignore`:

```
app/**
tools/**
test/**
canva/**
docs/**
.github/**
**/*.test.js
*.md
.git/**
node_modules/**
.claspignore
.gitignore
```

`rootDir` stays `""` (the repo root), matching both precedent projects. `.claspignore` plus the mandatory `clasp show-file-status` check in 2.3 is what keeps `app/` out of a push. (The alternative, binding with `--rootDir src` and moving the pushed files into `src/`, is more robust but diverges from both precedents. Take it only if `show-file-status` ever shows something it should not.)

Apps Script HTML files stay flat at the repo root; subdirectory HTML names pushed by clasp are untested here. The Apps Script half has **zero npm dependencies**, matching the ARW precedent. `app/` has an ordinary `package.json`, never pushed.

---

## 3. Workbook structure (exact tab names, in order)

1. `00 | Configuration` (only what a president sets)
2. `01 | Canva Feed` (live formulas only, never typed into, **never hidden**)
3. `02 | Deliverables` (the one data tab)
4. `03 | Statistics` (a dashboard, 6A)
5. `04 | Officer Tables` (a computed document, 6B)
6. `05 | Archive` (append only)
7. `06 | Log` (hidden, append only)
8. `_Engine` (hidden: every setting that exists for the code, 4B)
9. `_Views` (hidden: the helper band both computed views read, 6C)

```js
const IS9WD_TAB = {
  CONFIG: '00 | Configuration',
  FEED:   '01 | Canva Feed',
  ITEMS:  '02 | Deliverables',
  STATS:  '03 | Statistics',
  TABLES: '04 | Officer Tables',
  ARCHIVE:'05 | Archive',
  LOG:    '06 | Log',
  ENGINE: '_Engine',
  VIEWS:  '_Views'
};
```

**The two hidden machine tabs, decided by Ethan on 2026-09-27.** His instruction was "you may add tabs for your use but hide it", and the reason he gave was the one that matters: the workbook "looks overwhelming and coded for you and not for me". So everything that exists for the code rather than for a president moved off the tabs he reads:

- **`_Engine`** takes the four urgency window hex pairs, the status list and the undo window, the job schedule, the three carousel capacity numbers, the mail and app plumbing, the eight statistics thresholds, the eleven diagnostics rows, the directory's five machinery columns and the 52 row weekly sign-off store. `00 | Configuration` keeps the week, the trimester dates, the A.Y. label, the fourteen people, seven switches, three addresses and this week's sign-off, and it ends on **row 67** rather than row 168.
- **`_Views`** takes the hidden helper band that `03 | Statistics` used to carry in columns M to Y, the ranked block's sort, the trend block's two helpers, the three build markers, and the `OPERATIONAL HEALTH` and `SCHEDULED JOBS` blocks. The dashboard is therefore **twelve visible columns and no hidden column at all**.

**Nothing was deleted and nothing was hardcoded, and that is the whole reason the move was cheap.** Every value that moved keeps its named range, its owner and its validation, so every formula, every email, every endpoint action and `IS9WD_readConfig_` are unchanged: all of them read by name. This is the second time the naming rule of 2.5 was collected on, and it is the strongest argument in the document for keeping it.

**Both hidden tabs are written by the same code that wrote them before.** `IS9WD_Setup.js` owns `_Engine`, through the same two block writers and the same two painters that write `00 | Configuration`: a block descriptor carries a `tab`, and the writer follows it. `IS9WD_Stats.js` owns `_Views`, and `IS9WD_viewsResize_` is the first of its three entry points.

**Hiding is not a security boundary and never was.** The Canva reader account reads every cell of every tab, hidden or not, which is exactly why no token is ever in one (7.3). `_Engine` is hidden because it is not Ethan's to read, not because it is secret.

**`01 | Canva Feed` is the one tab that may never be hidden.** Whether the Drive connector includes a hidden tab in its read is **unmeasured**, and the entire Sunday run depends on reading that tab, so hiding it would risk the one thing this build exists for. The self test asserts it is visible, by name, in its own sentence.

**Why the two views were inserted at 03 and 04 rather than appended after the Log.** The one hard constraint is that `01 | Canva Feed` stays at position 2, so a truncated connector read loses the Archive and the Log before it loses a contract string (10.1), and inserting leaves it there. The two hidden tabs sit at positions 8 and 9, after the Log, so the seven numbered tabs keep 1 to 7. The reading order for a person is settings, the machine contract, entry, the two views, history, and then nothing else he needs.

**What renumbering the Archive and the Log cost, and why it was safe.** Setup resolves every tab by developer metadata key first, so it finds the existing Archive under `IS9WD_TAB_ARCHIVE` whatever the tab bar says, and no empty twin is created and no row is stranded. Two things make it complete. First, setup **renames** a metadata-resolved sheet to the canonical name when the name it currently carries is one this project wrote, which it recognises from an explicit list of former names; any other name is one Ethan chose by hand and is left alone, and the rename is skipped outright if another sheet already holds the target name. Second, **no formula anywhere references a tab by name**: the diagnostics cells are written as `=IS9WD_FEED_TOTAL` and friends rather than as `='01 | Canva Feed'!C3`, so the renumbering touched no formula.

**Tabs are found by developer metadata first, then by exact name.** Setup stamps each sheet with developer metadata key `IS9WD_TAB_<KEY>` (`CONFIG`, `FEED`, `ITEMS`, `STATS`, `TABLES`, `ARCHIVE`, `LOG`, `ENGINE`, `VIEWS`) the first time it sees it, and afterwards resolves every tab by that key. Only if no sheet carries the key does it fall back to the exact name, and then it stamps it. Without this, renaming `02 | Deliverables` in the tab bar makes the next `Build or repair workbook` create an empty twin under the old name, leaving 2,000 real rows on a sheet nothing reads, with no error. On a freshly created spreadsheet the default `Sheet1` is **renamed** into `00 | Configuration` rather than left beside it, or the workbook ships with ten tabs and the acceptance check in 13.3 counts wrong.

The nine committee tabs from v1 are gone. Canva page numbers come from the directory's `Carousel order` column through the master page mapping in 6.3, not from tab numbers.

`04 | Officer Tables` rather than anything with "committee" in it, because five of the fourteen are offices and the workbook's own vocabulary for the mixed set is `Committee or office`. `03 | Statistics` takes Ethan's own word. The two hidden tabs carry a leading underscore so they read as outside the numbered order at a glance.

---

## 4. `00 | Configuration`: what a president sets

Ethan's instruction of 2026-09-27, verbatim: *"for the things i need to encode, put a cream background on it, for the configuration and canva feed, explain what it does so in layman terms, as if i don't know anything about how to code. This is per cell i need to fill up in for"*, and *"Make the entire sheet more premium looking and aesthetic, it looks overwhelming and coded for you and not for me"*.

**Where the old numbering went.** Six of section 4's blocks moved to `_Engine`, and this document still points at them by their old numbers in places written before the move. The map, once, so every old pointer leads somewhere:

| Was | Is now | Block |
|---|---|---|
| 4.1 | 4.1 and 4.2 | the week, split into what is calculated and what he sets |
| 4.2 | **4B.2** | urgency windows |
| 4.3 | 4.3 | trimester dates |
| 4.4 | **4B.3** | the status list and the undo window |
| 4.5 A | **4B.10** | the weekly sign-off store |
| 4.5 B | 4.7 | this week's sign-off, the five derived cells |
| 4.6, the switches | 4.5 and 4.6 | the seven switches, and the three addresses |
| 4.6, the capacity numbers | **4B.5** | carousel capacity |
| 4.6, the plumbing | **4B.6** | mail and app plumbing |
| 4.6, the eight thresholds | **4B.7** | statistics thresholds |
| 4.7 | **4B.4** | the schedule |
| 4.8, the seven columns | 4.4 | the people |
| 4.8, the five machinery columns | **4B.9** | directory machinery |
| 4.9 | **4B.8** | diagnostics |


Both sentences are implemented as rules rather than as intentions, and both are acceptance checks (13.3) and self test assertions (13.4).

### 4.0 The cream rule, and the four columns

**`#e9ebd4` means exactly one thing on a settings or entry tab: this cell is yours to type into.** Nothing else on those tabs carries that fill, ever.

| Column | Holds | Width |
|---|---|---|
| A | the block title on a title row, the label on a value row, the `Key` in the directory | 320 |
| B | the value, and the directory's `Committee or office` | 300 |
| C | **the plain English hint**, and the directory's `Full name` | 420 |
| D | the check or the guard note, and the directory's `Position label` | 300 |
| E | the directory's `Email` | 260 |
| F | the directory's `On the carousel` | 120 |
| G | the directory's `Check` | 320 |

Seven columns, not twelve. Column C is the widest on the tab because it carries the sentence beside every cell he types into, and a hint that clips is a hint nobody reads.

**Four things happen to every cell Ethan is expected to fill.** They happen together, from one descriptor, so none of them can be forgotten for one cell:

1. the fill `#e9ebd4`;
2. the plain English sentence visible beside it in column C, `#58756a` at 9 point, wrapped;
3. the same sentence as the cell's own **note**, which is what he gets by clicking or hovering;
4. its data validation, which is what stops the wrong kind of value.

**And two things happen to every cell he must never fill:** it takes the page background rather than cream, and it carries the note `Worked out by the sheet. Do not type here.` The note matters more than it looks: without it, the only thing telling a reader not to type there is the absence of a fill.

**Banding is withdrawn from every block that holds an input column, and existing bandings are removed rather than left.** This is the cost of the cream rule and it is worth paying: row banding alternates `#F8FBFD` and `#e9ebd4`, so a banded block would put cream under half of its calculated cells and destroy the one rule a first time reader can learn in one second.

**The hint sits under the heading, not beside it.** Every block is a spacer, then a 38 px band carrying only the title, then a 26 px hint row carrying the block's own plain English sentence, then the rows. On a table block the hint row carries **one sentence per column**, aligned over the column it describes. The earlier device of riding the help at the end of the band cell in a lighter colour is withdrawn: it read as decoration on the band rather than as an instruction.

**How the writing is judged.** No jargon. The words *named range*, *array*, *boolean*, *string* and *formula* do not appear in a single hint. Each one says what to type and what happens if it is wrong, in that order, and it says the consequence in Ethan's terms: not "the feed renders `WEEK --`" but "the carousel says WEEK -- and no email is sent".

### 4.1 THE WEEK THIS WORKBOOK IS ON (title A4, hint A5, rows 6 to 11)

Six calculated cells, no inputs. Every one of them takes the accent, carries the calculated note and is guarded (5.6).

| Cell | Label | Named range | Formula |
|---|---|---|---|
| B6 | Today | `IS9WD_EFFECTIVE_TODAY` | `=IF(IS9WD_TODAY_OVERRIDE<>"",INT(IS9WD_TODAY_OVERRIDE),TODAY())` |
| B7 | The week starts (a Monday) | `IS9WD_WEEK_START` | `=IS9WD_EFFECTIVE_TODAY+1-(WEEKDAY(IS9WD_EFFECTIVE_TODAY+1,2)-1)` |
| B8 | The week ends (a Sunday) | `IS9WD_WEEK_END` | `=IS9WD_WEEK_START+6` |
| B9 | Week number | `IS9WD_WEEK_NUMBER` | `=IF(IS9WD_WEEK_NUMBER_OVERRIDE<>"",IS9WD_WEEK_NUMBER_OVERRIDE,IF(NOT(IS9WD_IN_TERM),"",IFERROR(INT((IS9WD_WEEK_START-IS9WD_TERM_START)/7)+1,"")))` |
| B10 | Trimester this week falls in | `IS9WD_TERM_ACTIVE` | the `INDEX`/`MATCH` over `IS9WD_TERM_CAL` |
| B11 | Inside a trimester right now | `IS9WD_IN_TERM` | `=IS9WD_TERM_ACTIVE<>""`, and `D11` says in plain words what a FALSE costs |

`IS9WD_TERM_START` is **not** on this tab any more: nothing prints it, only the week number formula divides by it, so it is one row of `WEEK PLUMBING` on `_Engine` (4B.1).

**Week rule.** Week start is the Monday of the week containing **effective today plus one day**. It rolls over on Sunday.

| Effective today | Week start | Week end |
|---|---|---|
| Sun 2026-09-20 | Mon 2026-09-21 | Sun 2026-09-27 |
| Mon 2026-09-21 | Mon 2026-09-21 | Sun 2026-09-27 |
| Sat 2026-09-26 | Mon 2026-09-21 | Sun 2026-09-27 |
| Sun 2026-09-27 | Mon 2026-09-28 | Sun 2026-10-04 |

v1's rule rolled over on Saturday. This one does not, deliberately: a Saturday 8 PM cutoff has to sit inside the week it closes. Week number is blank outside the term calendar; the feed renders that as `WEEK --` (6.4) and the dispatcher pauses (8.2).

### 4.2 WHAT YOU SET ABOUT THE WEEK (title A13, hint A14, rows 15 to 18)

Four inputs, all cream, all with a note and a hint.

| Cell | Label | Named range | Default and validation |
|---|---|---|---|
| B15 | Academic year, printed on the carousel | `IS9WD_AY_LABEL` | `A.Y. 2026 - 2027` |
| B16 | Deadline for entering next week, printed in emails | `IS9WD_CUTOFF_TEXT` | `Saturday 8 PM before the week starts` |
| B17 | Pretend today is a different date | `IS9WD_TODAY_OVERRIDE` | blank, date validation, reject input |
| B18 | Force a week number | `IS9WD_WEEK_NUMBER_OVERRIDE` | blank, whole number 1 to 30, reject input |

**The two overrides are the single most likely way this workbook publishes a confidently wrong carousel, so neither is ever invisible.** Each one's hint opens with "Leave this empty almost always" and closes with what to do when it is not. `D17` says either `That is not a date. Clear the cell or pick a date.` or, when it is set, `This is switched on, so the whole sheet is pretending.` `D18` says `This is switched on, so the week number above is ignored.` Both are also named in the Sunday brief (8.5c), both appear on `_Views`' operational health row, and the Today override additionally tags the feed's `Feed as of` cell (6.5) and pauses the dispatcher.

**The week number is one cell with two guards.** `B9` is what every printed week number reads, so an override covers the week line, every tagline, every email subject and the app with nothing else to change. The `IS9WD_IN_TERM` guard is what keeps a blank term calendar honest: without it, `IS9WD_TERM_START` resolves to `""`, the subtraction reads it as zero, and `Week number` prints a five digit number derived from the 1899 date epoch instead of going blank.

### 4.3 TRIMESTER DATES (title A20, hint A21, header row 22, values 23 to 25)

Header: `Trimester` | `First day (a Monday)` | `Last day` | `Check`. Named ranges `IS9WD_TERM_CAL` = `A23:C25`, `IS9WD_TERM_STARTS` = `B23:B25`, `IS9WD_TERM_ENDS` = `C23:C25`.

The three input columns are cream with a note each. `D23`, filled down with `PASTE_FORMULA`, is a template rather than a typed address:

```
=IF($B{row}="","",IF(WEEKDAY($B{row},2)<>1,
  "The start is not a Monday. Pick the Monday that trimester begins.",
  IF($C{row}<$B{row},"The end is before the start. Check both dates.","OK")))
```

**Term 1 starts Monday 2026-09-07.** Ethan confirmed on 2026-09-27 that the week beginning Monday 2026-09-28 is Week 04, and three weeks back from that Monday is 2026-09-07. `INT((2026-09-28 minus 2026-09-07) / 7) + 1` is `INT(21 / 7) + 1`, which is `4`.

**A blank `Last day` on the trimester in progress is not a harmless blank,** and the column's hint says so in the strongest terms it can: an empty cell there makes `In term` FALSE in the middle of Term 1, blanks the week number, renders every week line as `WEEK --`, stops every email and refuses every app write with `OUT_OF_TERM`. If the official date is not published, enter a generous later one and correct it. The `Check` column cannot catch this, because a blank row is a legitimate state for the other two.

### 4.4 THE PEOPLE (title A27, hint A28, header row 29, values 30 to 43)

**Fourteen rows, seven columns.** Header: `Key` | `Committee or office` | `Full name` | `Position label` | `Email` | `On the carousel` | `Check`.

Named ranges: `IS9WD_DIRECTORY` = `A30:G43`, `IS9WD_DIR_KEY` = `A30:A43`, `IS9WD_DIR_NAME` = `B30:B43`, `IS9WD_DIR_VP` = `C30:C43`, `IS9WD_DIR_POSITION` = `D30:D43`, `IS9WD_DIR_EMAIL` = `E30:E43`, `IS9WD_DIR_PUBLISHES` = `F30:F43`. Every name is v1's and keeps its meaning.

**Five columns moved to `_Engine` and the reason is Ethan's, not mine.** `Carousel order`, `Hierarchy order`, `Token prefix`, `Token issued` and `Revoked` are all machinery: two are write-once ordinals the master page arithmetic depends on, two are a token's identification, and one is set from a menu action. He asked for exactly that to be out of his way. They live in `DIRECTORY MACHINERY` on `_Engine` (4B.8), **in the same row order with the same Key**, and the two halves are joined by row position.

**The join is by row, and a mismatch is reported rather than resolved.** `IS9WD_readDirectory_` zips the two blocks by index and collects a `keyMismatch` list; the self test fails on it by name. A join by lookup on the Key was rejected: a mistyped Key on one tab would then read as a different officer on the other, which is a silent wrong answer, where a mismatch is a loud one. The rule that follows is written into both tabs' hint rows: **never insert, delete or reorder a row on either half.**

| Row | Key | Committee or office | Position label | On the carousel |
|---|---|---|---|---|
| 30 | `K01` | Partnerships | VICE PRESIDENT | TRUE |
| 31 | `K02` | Publications | VICE PRESIDENT | TRUE |
| 32 | `K03` | Marketing and Advocacy | VICE PRESIDENT | TRUE |
| 33 | `K04` | Membership | VICE PRESIDENT | TRUE |
| 34 | `K05` | Team Management | VICE PRESIDENT | TRUE |
| 35 | `K06` | Investment Strategy & Education | VICE PRESIDENT | TRUE |
| 36 | `K07` | Investment Research | VICE PRESIDENT | TRUE |
| 37 | `K08` | Documentation | VICE PRESIDENT | TRUE |
| 38 | `K09` | Finance | VICE PRESIDENT | TRUE |
| 39 | `K10` | President | PRESIDENT | FALSE |
| 40 | `K11` | Executive Vice President for Externals | EXECUTIVE VICE PRESIDENT FOR EXTERNALS | FALSE |
| 41 | `K12` | Executive Vice President for Internals | EXECUTIVE VICE PRESIDENT FOR INTERNALS | FALSE |
| 42 | `K13` | Executive Vice President for Investments | EXECUTIVE VICE PRESIDENT FOR INVESTMENTS | FALSE |
| 43 | `K14` | Executive Vice President for Operations | EXECUTIVE VICE PRESIDENT FOR OPERATIONS | FALSE |

- **`Key` is never edited**, and its hint says why in one sentence: it is the name of that person's private link. It is the Script Properties key (7.3) and the argument to `IS9WD_linkFor_()`. It is guarded on both tabs.
- **`On the carousel`** is the renamed `Publishes`, because "publishes" is jargon for a checkbox and "on the carousel" is what it does. It is the one input cell in the workbook that is deliberately **unguarded**, because it is the cell Ethan is meant to edit to change the publish set and a warning prompt there would be a prompt on the intended action.
- **`Full name` and `Email` are deliberately blank in this document.** The directory is fourteen students' names and DLSU addresses and this file is committed to a public repo (2.6). Ethan pastes all fourteen names into `C30:C43` and all fourteen addresses into `E30:E43` at Gate A.
- **`Check` is written in plain words**, because he reads it rather than debugging it: `No name yet`, `No email yet`, `On the carousel with no slide number: ask before changing this`, `Two rows share one slide number`, `Slide number is out of range`, `No private link yet: run Build or repair workbook`, `Your own admin link` on `K10`, `Link is <n> days old`, `Link revoked`, or `OK`. The five machinery columns it tests are reached by name through `INDEX(IS9WD_DIR_CAROUSEL, ROW()-29)` rather than by letter, which is what lets the column live on a different tab from the values it checks.
- **`K10`, the President's row, is Ethan's own and carries no member token.** He holds the admin token and nothing else (7.3), so setup writes no token for that row, `Token prefix` stays blank on `_Engine`, `Check` reads `Your own admin link`, and `IS9WD_linkFor_('K10')` returns the admin link.
- There is **no Link column**. One server-side helper, `IS9WD_linkFor_(key)`, is the only thing that builds a link.

### 4.5 SWITCHES (title A45, hint A46, rows 47 to 53)

Seven tick boxes and nothing else. Each one is cream, each one carries a note, and each hint says what a tick means and what clearing it costs.

| Cell | Label | Named range | Default |
|---|---|---|---|
| B47 | Run the automatic jobs | `IS9WD_AUTOMATION_ON` | TRUE |
| B48 | Test mode: send every email to me instead | `IS9WD_TEST_MODE` | TRUE |
| B49 | Monday email: this week's list | `IS9WD_MAIL_MONDAY` | TRUE |
| B50 | Daily email: due tomorrow or late | `IS9WD_MAIL_DAILY` | TRUE |
| B51 | Sunday email: your own summary | `IS9WD_MAIL_SUNDAY` | TRUE |
| B52 | Email me when something breaks | `IS9WD_MAIL_ALERT` | TRUE |
| B53 | Officers' phone links work | `IS9WD_APP_ON` | TRUE |

Every label is rewritten from the v1 wording for the same reason the `Check` strings are: `Monday assignment email on` describes the code and `Monday email: this week's list` describes what arrives. Test mode defaults ON, matching the EBEXECOM email engine, and turning it off is a menu action with a confirm dialog naming how many people will receive mail on the next run.

`IS9WD_MAIL_NOREPLY` is not here: it works only on a Workspace account and it is plumbing, so it is on `_Engine` (4B.6).

### 4.6 ADDRESSES AND LINKS (title A55, hint A56, rows 57 to 59)

| Cell | Label | Named range | Default |
|---|---|---|---|
| B57 | Your own email address | `IS9WD_ADMIN_EMAIL` | blank, and `D57` says so until it is filled |
| B58 | Web address of the officers' page | `IS9WD_APP_BASE_URL` | blank, pasted after the first Pages build |
| B59 | Web address the page talks to | `IS9WD_ENDPOINT_URL` | blank, pasted after the first deployment |

All three are blank on purpose: an address or an endpoint typed into this spec would be an address or an endpoint committed to a public repo (2.6). The hints say what each one is in a president's terms: the endpoint is "the door between the officers' page and this sheet: if it is empty or wrong, ticking a box on a phone does nothing".

### 4.7 THIS WEEK'S SIGN-OFF (title A61, hint A62, rows 63 to 67)

**Decided by Ethan on 2026-09-27: the sign-off is per week, not a static setting.** The Prepared by and Checked by names change every week. Four fixed Configuration cells would therefore print last week's names on this week's carousel, with nothing anywhere to say so, and the error is invisible at exactly the moment it is published.

All five cells are calculated lookups of this week's row of the store, which is on `_Engine` (4B.9), so none of them is cream and all five carry the calculated note.

| Cell | Label | Named range | Formula |
|---|---|---|---|
| B63 | Prepared by, name | `IS9WD_PREPARED_NAME` | `=IFERROR(INDEX(IS9WD_SIGNOFF_PREPARED_NAME,MATCH(IS9WD_WEEK_START,IS9WD_SIGNOFF_WEEKS,0)),"")` |
| B64 | Prepared by, position | `IS9WD_PREPARED_POSITION` | the same shape over `IS9WD_SIGNOFF_PREPARED_POSITION` |
| B65 | Checked by, name | `IS9WD_CHECKED_NAME` | the same shape over `IS9WD_SIGNOFF_CHECKED_NAME` |
| B66 | Checked by, position | `IS9WD_CHECKED_POSITION` | the same shape over `IS9WD_SIGNOFF_CHECKED_POSITION` |
| B67 | Signed off for this week | `IS9WD_SIGNOFF_SET` | `=AND(...all four are non-blank...)` |

`D63` reads, in plain words, `Nobody has signed off on this week yet, so the carousel is held back. Set Prepared by and Checked by in the officers' page.` **`Ready for Canva` reads NO until this week's sign-off is set** (6.4 Block A): decided, not proposed, because the alternative is silently printing last week's names on a published carousel. Appendix A2 item 5 is withdrawn.

**How Ethan sets it.** One card in the admin view, for the current week start. For each of Prepared by and Checked by: a **picker listing all 14 directory entries** in hierarchy order by name, with that entry's `Position label` prefilled and editable, plus free text for a name outside the 14, which is the case for a faculty adviser or an outgoing officer. Saving calls `setSignoff` (7.4), which writes or replaces the row for that week and stamps `Set at`. The picker opens prefilled with the previous week's values and **stores nothing until Ethan saves**, so the readiness gate still bites every week. The store is plain cells, so with the app down he types the row by hand on `_Engine`.

---

## 4B. `_Engine`: every setting that exists for the code

Hidden, nine columns, ends on the sign-off store's live last row. It carries the same two block shapes as `00 | Configuration` and is written by the same writer and the same painter: a block descriptor names its own `tab`.

**The cream rule applies here too, and that is deliberate rather than incidental.** A hidden tab is still a tab somebody will one day have to edit, probably in a hurry, probably a successor. So every input cell on it is cream with a note and a hint, and every calculated cell says it is calculated. The self test asserts it on both tabs with the same code.

| Block | Title | Rows | Named ranges |
|---|---|---|---|
| 4B.1 | WEEK PLUMBING | 6 | `IS9WD_TERM_START` |
| 4B.2 | URGENCY WINDOWS | 11 to 14 | `IS9WD_WINDOW_NAMES`, `IS9WD_HEX` |
| 4B.3 | STATUS LIST | 19 to 20, undo on 22 | `IS9WD_STATUS_LIST`, `IS9WD_STATUS_TERMINAL`, `IS9WD_STATUS_HEX`, `IS9WD_UNDO_SECONDS` |
| 4B.4 | SCHEDULE | 27 to 31 | `IS9WD_SCHEDULE` |
| 4B.5 | CAROUSEL CAPACITY | 35 to 38 | `IS9WD_SLOTS_PER_PAGE`, `IS9WD_MAX_PARTS`, `IS9WD_PUBLISH_MAX`, `IS9WD_PUBLISH_EMPTY_PAGES` |
| 4B.6 | MAIL AND APP PLUMBING | 42 to 52 | `IS9WD_MAIL_NOREPLY`, `IS9WD_QUOTA_RESERVE`, `IS9WD_RETIRE_DAYS`, `IS9WD_TOKEN_WARN_DAYS`, `IS9WD_AUTOMATION_OWNER`, `IS9WD_REPLY_TO`, `IS9WD_SENDER_NAME`, `IS9WD_TRANSPORT`, `IS9WD_READER_EMAIL`, `IS9WD_HEARTBEAT`, `IS9WD_LAST_OWNER` |
| 4B.7 | STATISTICS THRESHOLDS | 56 to 63 | the eight below |
| 4B.8 | DIAGNOSTICS | 67 to 77 | `IS9WD_DIAG_LAST_RUN`, `_QUOTA`, `_SELFTEST`, `_DEPLOYMENT`, `_OVERRIDES` |
| 4B.9 | DIRECTORY MACHINERY | 82 to 95 | `IS9WD_DIR_ENGINE`, `IS9WD_DIR_CAROUSEL`, `IS9WD_DIR_HIERARCHY`, `IS9WD_DIR_PREFIX`, `IS9WD_DIR_ISSUED`, `IS9WD_DIR_REVOKED` |
| 4B.10 | WEEKLY SIGN-OFF STORE | 100 to 151, grows | `IS9WD_SIGNOFF` and the six column names |

### 4B.2 URGENCY WINDOWS

| Row | Window | Dates | Station hex | Number text hex |
|---|---|---|---|---|
| 11 | OVERDUE | deadline before week start | `#e9ebd4` | `#1C2120` |
| 12 | W1 | Monday to Tuesday of the week | `#e9ebd4` | `#1C2120` |
| 13 | W2 | Wednesday to Sunday of the week | `#8a64a9` | `#F8FBFD` |
| 14 | W3 | after week end | `#085040` | `#F8FBFD` |

**Every hex is validated, because these four rows are the only settings that reach Canva as machine input rather than as text.** The Canva tool rejects a malformed hex outright, and a rejection arrives in the middle of the weekly run, several pages in. `E11`, filled down: `=IF(AND(REGEXMATCH($C{row},"^#[0-9A-Fa-f]{6}$"),REGEXMATCH($D{row},"^#[0-9A-Fa-f]{6}$")),"OK","Hex is not #RRGGBB")`. Three character shorthand, a missing `#` and a stray space are the three real cases, and all three look correct at a glance. A hex cell is never painted with the colour it holds: two of them hold `#1C2120`, which appears nowhere in the workbook.

### 4B.3 STATUS LIST

| Row | Status | Terminal |
|---|---|---|
| 19 | `Open` | FALSE |
| 20 | `Accomplished` | TRUE (checkbox) |

Row 21 stays empty. `A22` is the label `Undo window (seconds)` and `B22` the value, default `60`, integer validation. `0` disables unticking altogether, which is a supported state: only Ethan could then reopen an item.

This block is the only place a status label exists. It feeds the `Status` dropdown on the data tab, the server-side validation, the checkbox colours in the app, and the `Active` formula in 5.1. Rules: exactly one row is terminal, and a status already used by an item must not be renamed. Setup re-points all three ranges, so a third status later is an edit here plus one `Build or repair workbook`.

### 4B.4 SCHEDULE

Header: `Job key` | `Runs` | `Day` | `Hour` | `Catch-up hours` | `On` | `Check` | `Last run` | `Last status`.

| Row | Job key | Runs | Day | Hour (Manila) | Catch-up | On |
|---|---|---|---|---|---|---|
| 27 | `MONDAY_ASSIGNMENTS` | Weekly | Monday | 7 | 6 | TRUE |
| 28 | `DAILY_DIGEST` | Daily | Any | 18 | 4 | TRUE |
| 29 | `SUNDAY_BRIEF` | Weekly | Sunday | 19 | 4 | TRUE |
| 30 | `ARCHIVE_WEEK` | Weekly | Saturday | 22 | 2 | TRUE |
| 31 | `RETIRE_ACCOMPLISHED` | Weekly | Saturday | 23 | 2 | TRUE |

`Runs` is a dropdown (`Daily`, `Weekly`), `Day` a dropdown of the seven English weekday names plus `Any`, both reject input, so a typo cannot silently turn a weekly job into one that never runs. `Check` reads `Row does not parse` when `Runs` is `Weekly` and `Day` is `Any`, or `Hour` is not an integer 0 to 23. There is **no HEARTBEAT row**: the heartbeat is dispatcher behaviour on every run (8.4), and a schedule row would have capped it at once a day through its done key. `ARCHIVE_WEEK` runs on **Saturday**, not Sunday, because the week rule rolls over on Sunday: a Saturday run still sees the week that is ending.

### 4B.5 CAROUSEL CAPACITY

| Cell | Label | Named range | Default |
|---|---|---|---|
| B35 | Slots per Canva page | `IS9WD_SLOTS_PER_PAGE` | 10, whole number 1 to 50 |
| B36 | Maximum Canva pages per committee | `IS9WD_MAX_PARTS` | 2, whole number 1 to 4 |
| B37 | Publishable items per committee (derived) | `IS9WD_PUBLISH_MAX` | `=IS9WD_SLOTS_PER_PAGE*IS9WD_MAX_PARTS`, guarded by `D37` |
| B38 | Publish a page for a committee with no items | `IS9WD_PUBLISH_EMPTY_PAGES` | TRUE |

**Three numbers, because a continuation page requires them to be different numbers** (5.4): the physical page size, the number of pages a committee may own, and the product. `IS9WD_MAX_OPEN` is gone; it did two jobs at once.

**Three numbers can disagree, so `D37` is a guard rather than a comment.** `B37` is a formula, and a formula is exactly what a multi-cell paste replaces with a typed value; after that the workbook would compute slot keys for items no Canva page can hold, and nothing would say so.

```
=IF(NOT(ISNUMBER(IS9WD_PUBLISH_MAX)),"Publishable maximum is not a number",
 IF(IS9WD_PUBLISH_MAX<>IS9WD_SLOTS_PER_PAGE*IS9WD_MAX_PARTS,
   "Capacity numbers disagree: "&IS9WD_SLOTS_PER_PAGE&" times "&IS9WD_MAX_PARTS&" is "&IS9WD_SLOTS_PER_PAGE*IS9WD_MAX_PARTS,
   "OK"))
```

The feed's `Capacity check` cell reads **this cell's own formula string**, taken from the block descriptor rather than retyped, `Ready for Canva` reads NO while it is not `OK`, and `IS9WD_selfTest()` fails on it. This is the finding the pagination review rated highest after the readiness filter, because the failure is silent truncation.

### 4B.7 STATISTICS THRESHOLDS

**Every threshold the dashboard reads is here, and none of them is on the dashboard.** That is Ethan's instruction of 2026-09-27: `03 | Statistics` is "literally for viewing".

| Cell | Label | Named range | Default |
|---|---|---|---|
| B56 | Trend weeks | `IS9WD_STATS_TREND_WEEKS` | 8, whole number 2 to 26, guarded by `D56` |
| B57 | Fewest items past their deadline before a rate is scored | `IS9WD_STATS_MIN_JUDGED` | 3, whole number 1 to 50 |
| B58 | Days without a tick before an officer reads as silent | `IS9WD_STATS_SILENT_DAYS` | 7, whole number 1 to 60 |
| B59 | Days late before the worst-late number flags | `IS9WD_STATS_LATE_DAYS` | 3, whole number 1 to 60 |
| B60 | Slack allowed against the week's pace | `IS9WD_STATS_PACE_SLACK` | 0.15, formatted `0%`, a number 0 to 1 |
| B61 | On-time target | `IS9WD_STATS_ONTIME_TARGET` | 0.8, formatted `0%`, the same validation |
| B62 | Weeks of row room left before it flags | `IS9WD_STATS_ROOM_WEEKS_WARN` | 4, whole number 1 to 52 |
| B63 | Rows reserved per officer on `04 \| Officer Tables` | `IS9WD_STATS_OFFICER_ROWS` | 21, whole number 3 to 40, guarded by `D63` |

The two percentages use the `NUM` validation rather than the number-between criterion, because number-between on a percent formatted cell accepts `15` and stores 1500%, which is exactly the typo it guards.

**Two of the eight decide a layout rather than a threshold**, so each carries a guard comparing the setting against the value setup actually built, and the self test fails on the mismatch:

```
D56  =IF(IS9WD_STATS_TREND_WEEKS<>IS9WD_STATS_TREND_BUILT,
        "Run Build or repair workbook: the trend weeks do not match the tab","OK")
D63  =IF(IS9WD_STATS_OFFICER_ROWS<>IS9WD_OT_ROWS_BUILT,
        "Run Build or repair workbook: the reserved rows do not match the tab","OK")
```

Both markers live on `_Views` now (6C), which changes nothing: they are read by name.

### 4B.8 DIAGNOSTICS

Read only. The first six are plain pointers at cells that already exist, so a fix lands in one place; the last five are code written and carry named ranges of their own. **Nothing in this workbook references a tab by name**, which is why the renumbering of the Archive and the Log touched no formula.

| Cell | Label | Source |
|---|---|---|
| B67 | Total active deliverables | `=IS9WD_FEED_TOTAL` |
| B68 | Rows with a flag | `=IS9WD_FEED_FLAGGED` |
| B69 | Ready for Canva | `=IS9WD_FEED_READY` |
| B70 | Feed errors | `=IS9WD_FEED_ERRORS` |
| B71 | Carousel pages this week | `=IS9WD_FEED_PAGES` |
| B72 | Rows used of 2000 | `=COUNTIF(IS9WD_DEL_ID,"?*")` |
| B73 | Last dispatcher run | code |
| B74 | Last remaining mail quota | code (`MailApp.getRemainingDailyQuota()` is not callable from a formula) |
| B75 | Last self test result | code |
| B76 | Live deployment access last checked | code, the literal strings recorded in 13.3 |
| B77 | Today override and week number override | code writes one line naming each one that is set, or `not set` |

`_Views`' `OPERATIONAL HEALTH` block reads these same five code-written cells by name and adds the reading that says what to do about each one (6C).

### 4B.9 DIRECTORY MACHINERY

Header: `Key` | `Carousel order` | `Hierarchy order` | `Token prefix` | `Token issued` | `Revoked`. Fourteen rows, 82 to 95, in the same order and with the same Key as `THE PEOPLE`.

- **`Carousel order`**, an integer 1 to 9 on the publishing rows and blank on the other five, is the officer ordinal `i` in the master page mapping of 6.3: a committee owns master pages `1 + (i-1) * IS9WD_MAX_PARTS + 1` and `+ 2`. **Setup writes it once and never rewrites it**, because the master design's pages are physical: inserting or removing an officer must not silently renumber every master page after them. A committee that leaves keeps its ordinal and its pair sits unused, which costs two master pages and nothing else.
- **`Hierarchy order`**, an integer 1 to 14, is the order **every list a person reads** is sorted by: the admin view's committee picker, the sign-off picker, the Sunday brief, the link list, the preflight, the dashboard's officer table and the fourteen sections of `04 | Officer Tables`. Decided by Ethan on 2026-09-27: the President, then the four EVPs in the fixed order Externals, Internals, Investments, Operations, then the nine committees in their existing order. The carousel is **not** sorted by it.
- **`Key` is mirrored here for legibility and carries no name of its own**: `IS9WD_DIR_KEY` is the column on `00 | Configuration`. The self test asserts the two columns hold the same fourteen keys in the same order, which is what makes the join by row position safe.
- **`Token prefix`** is the **first 6 characters** of the live token, written by code, for identification only. The token itself is never in a cell, because the Canva reader account reads every tab, hidden or not. `Token issued` is the date it was minted. `Revoked` is a checkbox; a revoked token is refused immediately while the prefix stays readable so the log still makes sense.
- The whole block is guarded (5.6), and `Carousel order` and `Hierarchy order` are guarded for the same reason `Key` is.

v1's `Tab name`, `Extra editor emails`, the separate `Admin editors` block and `IS9WD_DIR_PAGE` are all gone: no committee tabs, no VP Sheet access, one editor.

### 4B.10 WEEKLY SIGN-OFF STORE

Header: `Week start` | `Prepared by name` | `Prepared by position` | `Checked by name` | `Checked by position` | `Set at` | `Check`. Rows 100 to 151, 52 rows, one academic year of weeks.

**It is the last block on `_Engine` for the reason it was the last block on `00 | Configuration`:** setup may widen an append only block and may never migrate its rows, so nothing may ever sit below it. `Build or repair workbook` re-points the ranges and appends 52 more rows whenever fewer than four blank rows remain, so it can never silently run out mid-trimester.

`G100`, filled down, is a template so no row number is typed:

```
=IF($A{row}="","",IF(WEEKDAY($A{row},2)<>1,"Week start is not a Monday",
  IF(COUNTIF($A${first}:$A${last},$A{row})>1,"Duplicate week","OK")))
```

`{last}` is substituted from the **live** last row, not the declared one, which is what keeps the duplicate-week test covering a grown store: without it, a duplicate typed into week 53 would read `OK`.

**The move from `00 | Configuration` to `_Engine` was free, and it had to land before Gate A.** Setup may widen an append only block and may never migrate its rows, so a filled row at the old first row would fall outside the block and outside every named range over it. The store holds **zero** filled rows today. After Gate A the same move would be a migration setup cannot perform.

`Set at` is a code-written timestamp. The row is written by `setSignoff` (7.4) or typed by hand. The store is **append or replace by week, never cleared**, which is what lets the Archive record who signed off on which week (10.1) after the names have moved on.

---

## 5. `02 | Deliverables`

One row per item, for all 14 directory entries. This tab replaces the nine committee tabs.

- Row 1: banner `02 | DELIVERABLES`, fill `#085040`, text `#F8FBFD`. Corrected 2026-09-27 to the uniform rule in 2.5: a section band is always `#085040` and a column header is always `#5d4170`, on every tab. See Appendix C R12.
- Row 2: instruction text:
  > One row per deliverable. Enter as many as the week really holds: nothing is refused. A committee's first 20 active items reach the carousel, ten to a page across two pages; the rest are tracked, emailed and reported, and the Sunday brief names them. Tick an item off rather than deleting it. Anything active with a past deadline shows as overdue.
- Row 3: table header, fill `#5d4170`, text `#F8FBFD`. Corrected with the banner above. Each header cell carries its column's plain English sentence as a **note**.
- Row 4: **the hint row**, added 2026-09-27. One plain English sentence per column, 9 point `#58756a`, wrapped, 26 px, inside the frozen pane. It is the entry tab's half of Ethan's per-cell explanation instruction, and the honest half: 17 columns times 2,000 rows is 34,000 notes, which is a minute of every build and a heavier file for a sentence that is already on screen one row above the column. The settings tabs, where a cell is a setting rather than a column, do carry a note per cell (4.0).
- Rows 5 to 2004: 2,000 pre-formatted rows. **Freeze through row 4**, so the hint row never scrolls away. No frozen column, on this tab as on every other (2.5).

**The cream rule, and what it cost this tab.** The five columns Ethan types into, `Committee`, `Title of Task`, `Deadline`, `Remark` and `Status`, carry the fill `#e9ebd4`; the twelve the machine owns carry the page background. **Row banding is withdrawn from the tab**, because banding alternates `#F8FBFD` and `#e9ebd4` and would have put cream under every second cell of the twelve machine columns, which says the opposite of what cream means. Five columns of colour against twelve of paper is what makes 2,000 rows legible at a glance, and it is a better answer than banding was.

**The blocking flag rule changed with it.** A blocking flag used to fill the whole row `#e9ebd4` with bold `#724485` text. The fill is withdrawn on this tab and the bold strong purple text carries the signal on its own, because a flagged row filled cream would say "all seventeen of these cells are yours to type into". Recorded as a ruling in Appendix C.

### 5.1 Columns

| Col | Header | Written by | Rule |
|---|---|---|---|
| A | `ID` | code | `D0001` upward, zero padded to four digits, never reused. |
| B | `Committee` | Ethan or app | Dropdown from `IS9WD_DIR_NAME`, reject input. All 14 directory entries are offered, so Ethan's own items and each EVP's items live on this tab too. The header keeps v1's name; the value can be a committee or an office. |
| C | `Title of Task` | Ethan or app | Required when the row is used. Max 40 characters, `=LEN($C4)<=40`, reject input. Help text: `Max 40 characters. Start with a verb.` |
| D | `Deadline` | Ethan or app | Date only, "is a valid date", reject input, date picker on. Format `ddd, mmm d`. Times do not go here; a time goes in the remark. This keeps the Canva date line one fixed width. **A date typed without a year is stamped with the current year**, which near a year boundary is silently the wrong year, and the `ddd, mmm d` format then hides it: `Jan 5` typed in December looks right and is eleven months early. The app never has this problem, because its input is `yyyy-MM-dd` and always carries a year (7.4). For a hand-typed row nothing in the workbook flags it, which is recorded as a carried-over gap at the end of Appendix B. |
| E | `Remark` | Ethan or app | Optional. Max 30 characters, `=LEN($E4)<=30`, reject input. Help text: `Instructions only (where it goes, who signs off). Never progress or status.` |
| F | `Status` | Ethan or app | Dropdown from `IS9WD_STATUS_LIST`, reject input. Defaults to `Open` on create. |
| G | `Status at` | code | Timestamp `yyyy-MM-dd HH:mm`, Asia/Manila, of the last status change. Rewritten on every change. |
| H | `Status by` | code | The directory `Full name` for the link that was used, `Admin` when the admin link was used, `Sheet` when a formula cannot tell. |
| I | `Created at` | code | Timestamp. Never rewritten. |
| J | `Check` | formula | 5.3 |
| K | `Active` | formula, hidden | `=IF(COUNTA($B4:$F4)=0,"",IFERROR(NOT(INDEX(IS9WD_STATUS_TERMINAL,MATCH($F4,IS9WD_STATUS_LIST,0))),FALSE))` |
| L | `Publish key` | formula, hidden | `=IF($B4="","",IFERROR(IF(INDEX(IS9WD_DIR_PUBLISHES,MATCH($B4,IS9WD_DIR_NAME,0))=TRUE,TEXT(INDEX(IS9WD_DIR_CAROUSEL,MATCH($B4,IS9WD_DIR_NAME,0)),"00"),""),"!ERR"))`. The committee's carousel order as two digit **text**, blank when that committee does not publish, `!ERR` when the committee is not in the directory. It is **rank independent**, which is the whole point of it: it is the only publish filter, and readiness reads it (6.4). |
| M | `Rank` | formula, hidden | 5.4 |
| N | `Part` | formula, hidden | `=IF($M4="","",ROUNDUP($M4/IS9WD_SLOTS_PER_PAGE,0))`. Which of the committee's Canva pages this item falls on. |
| O | `Slot on page` | formula, hidden | `=IF($M4="","",TEXT(MOD($M4-1,IS9WD_SLOTS_PER_PAGE)+1,"00"))`. `01` to `10`, the frame address on that page. |
| P | `Master page` | formula, hidden | `=IF(OR($L4="",$L4="!ERR",$N4=""),"",IF($N4>IS9WD_MAX_PARTS,"",TEXT(1+(VALUE($L4)-1)*IS9WD_MAX_PARTS+$N4,"00")))`. The physical master page, `02` to `19`, from the mapping in 6.3. **Blank means not published**, and it is blank in exactly four cases: the committee does not publish, the committee is unknown, the item is not active and titled so it has no rank, or the item ranks past `IS9WD_PUBLISH_MAX` and no page can hold it. |
| Q | `Slot key` | formula, hidden | `=IF(OR($P4="",$O4=""),"",$P4&"-"&$O4)`, for example `05-03`. Format unchanged from v1: two digits, a hyphen, two digits. |

Named ranges over rows 4 to 2003: `IS9WD_DEL_ID`, `_COMMITTEE`, `_TITLE`, `_DEADLINE`, `_REMARK`, `_STATUS`, `_STATUS_AT`, `_STATUS_BY`, `_CREATED_AT`, `_CHECK`, `_ACTIVE`, `_PUBKEY`, `_RANK`, `_PART`, `_SLOTONPAGE`, `_PAGE`, `_SLOTKEY`.

**`IS9WD_DEL_PAGE` is no longer the publish filter, and that is the single most dangerous line in this section.** It keeps its name and its meaning, the Canva page this item publishes on, but it is now rank dependent, so it is blank on a `Missing title` row of a publishing committee. Any criterion that used a non-blank `Page` to mean "this row can reach Canva" must read `IS9WD_DEL_PUBKEY` instead, and the one criterion that did is `Ready for Canva` (6.4 Block A). Getting this wrong fails silently in the worst direction: a blocking flag on a publishing committee's undated item would stop blocking, and the carousel would publish with a green light above it.

**Row integrity.** `deleteItem` **clears A to I on the row and never deletes the row**, because deleting a row shrinks every named range that contains it and silently drops the bottom rows out of every `COUNTIFS`, `MINIFS` and `MATCH` the feed depends on. `Build or repair workbook` re-points every named range to rows 4 to 2003 unconditionally, extends the sheet if it has fewer rows, and rewrites J to Q for all 2,000 rows, which also backfills a row someone inserted by hand.

### 5.2 IDs

Sequential from `D0001`. The next number lives in Document Properties under `IS9WD_NEXT_ID` and is a **monotonic high-water mark**: `Build or repair workbook` may only raise it, to `MAX(stored, highest suffix in column A, highest suffix in the Archive) + 1`, never lower it. Without the `MAX(stored, ...)` term, an item created and then deleted before it was ever archived leaves no trace and its ID gets reissued, which would put two different items under one ID in the log and let the Archive's dedupe drop a genuinely new row.

### 5.3 `Check` flags

```
=IF(COUNTA($B4:$F4)=0,"",
 IF($A4="","Missing ID",
 IF(COUNTIF(IS9WD_STATUS_LIST,$F4)=0,"Missing status",
 IF(COUNTIF(IS9WD_DIR_NAME,$B4)=0,"Unknown committee",
 IF($C4="","Missing title",
 IF($D4="","Missing deadline",
 IF(OR(NOT(ISNUMBER($D4)),$D4<>INT($D4)),"Deadline not a date",
 IF(LEN($C4)>40,"Title too long",
 IF(LEN($E4)>30,"Remark too long",
 IF(AND($K4=TRUE,INT($D4)<IS9WD_EFFECTIVE_TODAY),"Overdue",""))))))))))
```

Precedence top to bottom, first match wins. Blocking flags, which force `Ready for Canva: NO`, are **eight**: `Missing ID`, `Missing status`, `Unknown committee`, `Missing title`, `Missing deadline`, `Deadline not a date`, `Title too long`, `Remark too long`. `Overdue` does not block.

**`Over cap` is gone, along with the cap it reported** (5.4). It was the ninth blocking flag and it was the one flag that described a limit rather than a mistake: an eleventh item is not an error in the data, it is a week with eleven things in it. What replaced it is not another flag but a set of counts the feed publishes and the brief reads, so an item that does not fit the carousel is reported rather than blamed. A `Not published` flag was considered and is a new Appendix A2 proposal, not applied, because `Check` values are copied into the feed's slot rows and the flags list and are therefore part of the section 6D contract.

Six of those exist because the tab has to stay hand-usable when the app is down (2.2), and a hand-typed or pasted row is exactly what slips through otherwise. **`Check` re-verifies what data validation already covers, on purpose:** a multi-cell paste can replace or strip a cell's validation rule outright, and a code write never triggers validation at all, so a rule that only lives in the validation is a rule that holds until the first paste.

- **`Check` keys on `COUNTA($B4:$F4)`, not on the ID column.** Keying on ID would mean a hand-typed row got a Page, a Rank and a Canva slot while `Check` stayed blank above it.
- **`Missing ID`** catches a hand-typed row with no ID, which nobody could ever act on through the app. `Build or repair workbook` backfills an ID and `Open` for any row with content and a blank A or F, and logs each backfill.
- **`Deadline not a date`** catches what Sheets validation cannot: "is a valid date" accepts a datetime, and reject-input validation is bypassed by a multi-cell paste. A deadline of Sunday 17:00 is greater than `IS9WD_WEEK_END` at midnight and would classify as `W3` instead of `W2`, publishing the wrong station color. Every deadline comparison in this spec is wrapped in `INT()` for the same reason.
- **`Title too long` and `Remark too long`** repeat the 40 and 30 character limits that `LEN` validation already enforces on a typed cell, for the paste case. These two are the ones that reach Canva as text: a 60 character title does not error anywhere, it overflows a fixed width frame on a published page.
- **`Unknown committee`** catches a committee value that is not in the directory, which the `IS9WD_DIR_NAME` dropdown cannot prevent on a paste or after a directory name is corrected. Column L, `Publish key`, renders `!ERR` for such a row, and `Feed errors` only scans the feed tab, so without this flag the row would sit unpublished and unmentioned. It blocks readiness, because an item filed against a committee that does not exist is an item nobody will see, and the `!ERR` is deliberately matched by the readiness criterion's `"?*"` wildcard so it cannot escape the gate.

`Overdue` here compares against **effective today**, which is what Ethan and each VP mean. The Canva `OVERDUE` window compares against **week start**, unchanged from v1 section 6. They differ for a deadline between week start and effective today, so a feed row can carry `Window = W1` with `Flag = Overdue`. That is deliberate and it interacts with the read-day constraint in 6.5. Appendix B item 2.

### 5.4 No cap on items, and what publishes

**Decided by Ethan on 2026-09-27: nothing is refused at entry.** The eleventh item is entered like the tenth. There is no `IS9WD_MAX_OPEN`, no `CAP_REACHED`, no `Over cap` flag and no readiness block. A cap on entry was a Canva page size wearing a data rule's clothing, and it made the tool lie about the week in order to protect a slide.

**What is bounded is what publishes, and it is bounded in three named numbers** (4.6): `IS9WD_SLOTS_PER_PAGE` (10) is the frames on a master page, `IS9WD_MAX_PARTS` (2) is the pages a committee owns, and `IS9WD_PUBLISH_MAX` (20) is the product and the most items one committee can publish in a week.

`Rank` is unchanged. It is the item's position among the Active titled items of its committee, by deadline ascending then **ID ascending**:

```
=IF(OR($K4<>TRUE,$C4=""),"",
 1+SUMPRODUCT(
   ($B$4:$B$2003=$B4)*($K$4:$K$2003=TRUE)*($C$4:$C$2003<>"")*
   ((INT(N($D$4:$D$2003))<INT(N($D4)))
    +((INT(N($D$4:$D$2003))=INT(N($D4)))*($A$4:$A$2003<$A4)))))
```

The tie-break is the **ID**, not the row position. Row position is not stable: a single sort of this tab by Deadline or Committee, which nothing forbids and which the hand-editable fallback invites, would silently renumber every same-deadline tie and reorder the Canva page with no data change and no flag. IDs are zero padded to a fixed width, so a text comparison equals a numeric one, and they are monotonic in creation order.

`N()` coerces a text deadline to 0, so it sorts first and `Deadline not a date` flags it rather than the row vanishing. The leading `IF` guard means the `SUMPRODUCT` is evaluated only for Active titled rows, which is what keeps a 2,000 row formula column affordable now that nothing caps the row count (5.5).

**Rank becomes a page and a slot, in three derived columns** (5.1): `Part` is `ROUNDUP(Rank / SLOTS_PER_PAGE, 0)`, `Slot on page` is `MOD(Rank - 1, SLOTS_PER_PAGE) + 1`, and `Master page` is `1 + (carousel order - 1) * MAX_PARTS + Part`, blank when `Part` exceeds `MAX_PARTS`. Two arithmetic details are worth writing down because both are classic off-by-ones:

- **A committee with exactly 10 items gets one page, not two.** `ROUNDUP(10/10,0)` is 1. A naive `INT(10/10)+1` is 2, which would publish a blank continuation slide for every committee that is exactly full, every week.
- **A committee with 0 items still gets one page.** The plan forces `Parts` to `MAX(1, ROUNDUP(Count/SLOTS_PER_PAGE, 0))`, so it can never be zero, and whether that page reaches the carousel is `IS9WD_PUBLISH_EMPTY_PAGES` (4.6), which defaults TRUE and reproduces v1's empty page exactly.

**What happens to item 21, and where it is visible.** It has a `Rank`, a `Part` of 3, no `Master page` and no `Slot key`, so it appears in no feed slot and no Canva page. It is **not** hidden:

1. The **app** shows it like any other item, in rank order, and the committee card says how many items are past the publishable maximum (7.4, 7.8).
2. The **Monday assignment email** to that officer lists it, marked `Not on the carousel this week` (8.5a), because telling someone about a deliverable is independent of Canva having a slot for it.
3. The **feed reports the number**, per committee in the officer table's `Not published` column and for the whole workbook in Block A's `Items not published` cell (6.4). The uncapped count survives in the helper band, so nothing has to be reconstructed.
4. The **Sunday brief** names the committee and both numbers, `Publications: 20 published, 23 active` (8.5c).

That is the whole replacement for `Over cap`: four places that say what is not on the carousel, instead of one flag that stopped the carousel.

**The five entries that do not publish** behave identically to the nine in every respect except Canva: items, ranks, parts, slots on a page, emails, the app, the brief. Their `Publish key` is blank, so their `Master page` and `Slot key` are blank and no feed slot can match them, and no flag of theirs can hold readiness (6.1 item 6).

**Data validation is deliberately not used for any of this.** Validation fires only on the edited cell, so a paste, or flipping an Accomplished row back to Open by hand, walks straight past it. Counts and the feed are the record.

### 5.5 Performance note

Three heavy things, and the arithmetic changed with the cap.

- **2,000 `Rank` cells.** Each one that passes the Active-titled guard evaluates a `SUMPRODUCT` over 2,000 rows. Under the old cap the number that passed was bounded at about 140, which is 14 entries times 10. Nothing bounds it now. The planning figure is **280**, which is 14 entries at the publishable maximum of 20, and that is about 560,000 cell operations per recalculation. A workbook that drifts to 600 active titled items costs four times that. The lever is `RETIRE_ACCOMPLISHED` (10.1), never a wider range, and the Sunday brief prints rows used of 2,000 every week so the drift is visible before it is felt.
- **180 feed slot rows** with about 8 `MATCH` lookups each, up from 90. Bounded by the master's 19 pages, so this one cannot grow without a Configuration change and a master rebuild.
- **19 plan rows and 18 page header rows**, three or four lookups each. Negligible.

The row budget is the real constraint, not the formula cost: at 280 items a week the 2,000 rows fill in about seven weeks (10.1, Appendix B item 3).

### 5.6 Protection

There are no per-VP protections and no per-range editor lists. Ethan owns and edits the file alone; the VPs never open it.

`Apply sheet guards` sets **warning-only** protection on the ranges that hold formulas or code-written values, so Ethan gets a prompt before overwriting one by accident:

- `02 | Deliverables` columns J to Q, rows 4 to 2003.
- `01 | Canva Feed`, the whole tab.
- `03 | Statistics` and `04 | Officer Tables`, the whole tab each. Both are script owned end to end and are never typed into, so each takes one whole tab guard for the same reason the feed does.
**The guard list is built from the block descriptors rather than typed**, which is what keeps it correct through a move: every row carrying a formula, every guard note beside one, every `Check` column on either settings tab, the directory's `Key` column on `00 | Configuration`, the whole of `DIRECTORY MACHINERY` on `_Engine`, and the sign-off store's `Set at` column. On the shipping layout that is `00 | Configuration` B6:B11, D11, D17, D18, D23:D25, A30:A43, G30:G43 and B63:B67 with D63; and `_Engine` B6, E11:E14, G27:G31, B37 with D37, B51:B52, D56, D63, B67:B72, A82:F95 and F100:F151.

**Not one cream cell is guarded, and that is the rule rather than an omission.** Cream means "this cell is yours to type into" (4.0), and a warning prompt on one would contradict the fill. `On the carousel` was already the named exception for that reason; the cream rule generalises it to every input cell in the workbook.

`On the carousel` (F30:F43) is deliberately **not** protected: it is the one cell Ethan is meant to edit to change the publish set, and a warning prompt on it would be a prompt on the intended action (4.4). The eight statistics thresholds on `_Engine` are his to edit and are not protected either; their two guard notes at D56 and D63 are script written and are covered by the same rule that covers every other `Check` cell.
- `05 | Archive` and `06 | Log`, the whole tab each.

`06 | Log` is hidden. Warning-only protection is a guard rail for the owner, not a security boundary.

**Every protection carries a description and re-applying removes only its own.** Each one is described `IS9WD guard: <tab> <range>`, and `Apply sheet guards` enumerates the sheet's protections, removes only those whose description starts with `IS9WD guard:`, and then re-creates them. Removing every protection it finds would delete a protection Ethan added by hand; appending without removing would stack duplicates on every run. It also sets `setDomainEdit(false)` on each one, because a protection created on a Workspace file can default to allowing the whole domain, and it never attempts to remove the owner or the running user from an editor list, which throws.

---

## 6. `01 | Canva Feed`: the contract with the weekly Canva run

> **Precedence.** The quoted v1 text in 6A to 6D is **the contract of record** and is reproduced here unchanged. Sections 6.1 to 6.6 are the v2 implementation of it. Where they differ, 6.1 wins for the build and every difference is listed in Appendix A1 (consequences of decided changes, applied) or Appendix A2 (proposals, not applied without Ethan's approval). No string format in 6A to 6D changes without Ethan's written approval, per CLAUDE.md.
>
> **Three sentences of 6A to 6D are now superseded, and they are left standing on purpose** so the contract of record stays quotable. 6C's heading says `pages 2 to 10`; the master design is 19 pages and the carousel is a computed subset of them (6.3, A1 item 14). 6C says `exactly 10 slot rows per committee (90 in total)`; it is ten per **Canva page**, 180 in total, because a committee can own two pages (6.3, A1 item 14). And 6A's readiness sentence names two flags; readiness now has seven gates (6.4, A1 items 2 and 13). Every **printed string** in 6A to 6D is unchanged, which is the part that is contract.

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

### 6.1 What the decided v2 model changes behind these strings

Not proposals. They follow from the decided status field, the decided publish set, the removal of the cap and Ethan's rulings on Appendix A2, all dated 2026-09-27. Repeated in Appendix A1 so Ethan sees them in one place.

1. **"Rows with a title" means "Active rows with a title."** Accomplished items leave the feed and stop counting. Without this the status field does nothing.
2. **Readiness reads NO on any blocking flag** (5.3), not only the v1 pair. There are eight blocking flags, and `Over cap` is not one of them any more because there is no cap (5.4).
3. **`Count` is capped at `IS9WD_PUBLISH_MAX`, and the tagline prints the officer's total on both of their pages.** The cap on `Count` is now 20 rather than 10, because a committee can own two pages of ten. Decided by Ethan on 2026-09-27 for the continuation page: **the tagline repeats the officer's total on both pages and carries no part marker**, so a committee with 14 items prints `14 TASKS` above page 1's ten slots and `14 TASKS` above page 2's four. That is a deliberate trade: the carousel tells the truth about the week's size, and a reader who counts the visible slots on page 2 alone will find fewer. The alternative, a `PAGE 2 OF 2` suffix, is a new string and is therefore a proposal, not an applied change (A2 item 11). The uncapped count still goes to the hidden helper band (6.4), the Sunday brief still names any committee whose real count exceeds what published (8.5c), and the number that did not publish is now printed in the feed itself rather than inferred.
4. **An empty committee's tagline ends `0 TASKS`.** Confirmed by Ethan on 2026-09-27, so it is no longer a proposal (A2 item 1, accepted). `IS9WD_PUBLISH_EMPTY_PAGES` decides whether that page reaches the carousel at all, and it defaults TRUE, which is v1's behaviour exactly.
5. **Block D gains two appended columns, `ID` and `Title`.** v1's four columns keep their relative positions. A `Missing title` row has no rank and therefore no slot, so `Page` plus `Slot` could not identify it at all, and now `Page` is blank on such a row too (5.1).
6. **Readiness reads only the rows that publish, through `Publish key`.** With 14 directory entries and nine publishing committees (4.8), a flag on one of Ethan's own items or an EVP's cannot make the carousel wrong, so it must not force `Ready for Canva: NO`. The filter is the rank-independent `Publish key` column on the data tab (5.1), **not** a non-blank page number: page is now blank on any row without a slot, so the old criterion would have quietly stopped catching `Missing title` and `Missing deadline` on publishing committees. `Total active deliverables` and `Rows with a flag` still count every row, and Block D still lists every flagged row, because those three exist for Ethan rather than for Canva.
7. **The carousel is computed and the master design is fixed.** The master holds 19 physical pages, built once by hand: page 1 is the title page, and committee `i` owns pages `1 + (i-1) * IS9WD_MAX_PARTS + p` for `p` of 1 and 2. Because each committee's pair is adjacent, any subset of pages taken in ascending order is already in reading order, so the weekly run never adds, deletes or reorders a page: it edits text and exports a page list (6.3, 6.5). The nine committees' page numbers therefore change from 02 to 10 to 02, 04, 06, 08, 10, 12, 14, 16 and 18, with each continuation page immediately after its owner.
8. **The publish set stays at the nine committees, and this is the item nobody should reverse casually.** The arithmetic, with both sources read on 2026-09-27 and recorded in `scratchpad/pagination.json`: Instagram's Help Center says a single carousel post carries **up to 20 photos and videos** when it is posted by hand, and Meta's content publishing documentation says a carousel posted **through the API is limited to 10**. At nine publishing committees the carousel is `1 title + 9 items pages = 10` slides at minimum and `1 + 9 + 9 = 19` at the absolute worst case, when every committee overflows in the same week. 19 is inside 20 **at every possible input**, so no slide gate, no relief order and no endpoint slide check is needed, and this document does not pretend to have one. At fourteen publishing officers the base is 15 and the worst case is `1 + 14 + 14 = 29`, which cannot be posted as one carousel by any route; only five officers could overflow in a week, and the twenty-first slide would be created by an ordinary officer ticking an ordinary item, refused nowhere. A readiness flag cannot fix that, it can only convert a data problem into a blocked Sunday. Automated posting through the Graph API is impossible either way at 10 base slides, and stays impossible. If a future president raises the publish set, that arithmetic is what breaks first, and `Master pages required` in Block A is what will say so. That cell is also checked against the plan block: when `IS9WD_FEED_MASTER` exceeds the plan block's row count, `Plan check` reads `Master pages required exceeds the plan block` and `Ready for Canva` holds at NO, so the master design falling behind the plan is caught in the workbook rather than in Canva.
9. **Every list a person reads is in hierarchy order** (4.8): the President, the four EVPs, then the nine committees. The carousel and the feed's own officer table stay in carousel order, which is the nine committees in v1's order.
10. **Ethan ruled on Appendix A2 on 2026-09-27**, and eight accepted items are applied here rather than left as proposals: `0 TASKS` confirmed (item 1); **Block C is split into two tables**, page headers and slot rows, instead of interleaving a short header row among wide slot rows (item 2); `WEEK --` out of term confirmed **and out of term now forces `Ready for Canva: NO`** (item 3); **`Feed errors` now gates readiness** (item 4); `Next due: date missing` is the string for a committee whose active items all have blank deadlines (item 6); Block A's first row is relabelled **`Total active deliverables`** (item 7); **every block row carries a machine key in column A** (item 8); and **sentinel rows mark the start, each block and the end** (item 9). Item 10, a `Status` column on the slot rows, is skipped. What these four layout items buy is not tidiness: the feed roughly doubles in length this revision, and a machine key plus a sentinel is the difference between a truncated connector read that is obvious and one that looks exactly like a smaller carousel.

### 6.2 Sort order, simplified

v1's sort is "overdue first (oldest first), then by deadline ascending, then by original row number". Overdue means deadline before week start, so every overdue item already sorts before every non-overdue item under a plain deadline ascending sort. The three-part rule reduces exactly to **deadline ascending, then ID ascending**, which is what `Rank` computes. Identical output, one formula instead of three passes. ID replaces row position for the reason in 5.4.

### 6.3 Physical layout

`A1` holds the literal text `01 | Canva Feed`, because the Drive connector strips tab names and the tab has to identify itself from cell content. `B1` holds the start sentinel, `C1` the feed as of text and `D1` the feed stamp, all three described in 6.5. **`E1` holds the plain English explanation** added on 2026-09-27. None of the five is one of the strings in 6A to 6D.

**The plain English explanation, and why it is a cell in row 1 rather than a row of its own.** Ethan's instruction was that `01 | Canva Feed` gets a short explanation saying what the tab is for, that it fills itself, and that it is what Claude reads every Sunday. This tab has no cells he fills, so it gets no cream and no per-cell hints; what it gets is one sentence, in `E1`, at hint size in the band's help colour, overflowing right across F to M:

> What this tab is for: it is the words and the colours the Instagram carousel prints. It fills itself from the deliverables you enter and from 00 | Configuration, so there is nothing to type here and nothing to tidy up. Every Sunday Claude reads this one tab and updates the Canva design from it, which is why the wording here is exact and why this tab is never hidden.

The same sentence is the **note on `A1`**, which is what a person gets by clicking the tab's own name.

It rides in `E1` rather than in a row of its own, and that is not a cosmetic choice: section 6.3 fixes every row number on this tab and the nine sentinels are how a truncated connector read is detected, so there is no free row to take and inserting one would move every sentinel, every named range and every key in this section. `E1` is inside the banner's own filled span, it is read by the connector like any other cell, and it moves nothing.

**Column A carries a machine key on every block row, and every value sits in a named column** (A2 item 8, accepted). Block A's keys are `A.TOTAL`, `A.FLAGGED`, `A.READY`, `A.ERRORS`, `A.PAGES`, `A.EXPORT`, `A.MASTER`, `A.NOTPUB`, `A.CAPACITY`, `A.PLAN`, `A.FLAGCAP`. The title block's are `B.WEEKLINE`, `B.LEGEND1`, `B.LEGEND2`, `B.LEGEND3`, `B.PREPNAME`, `B.PREPPOS`, `B.CHKNAME`, `B.CHKPOS`. An officer row is `B.C01` to `B.C09` by carousel order, a plan row is `PLAN.P01` to `PLAN.P19` by master page, a page header row is `C.P02.HEAD` to `C.P19.HEAD`, a slot row is `C.P02.S01` to `C.P19.S10`, and a flag row is `D.` plus the item id, for example `D.D0007`. Header rows key as `HEADER` and sentinel rows as `SENTINEL`, which are the only two keys that repeat, and the sentinel's own text in column B is what distinguishes one from another. There are **nine sentinels**: the start sentinel shares row 1 with `A1` so the tab's name and its version sit in the same line, then one before each of the seven blocks, then the end sentinel on the last row. **The keys are per row rather than per cell**, which is the one place this diverges from A2 item 8's illustration (`B.C02.COUNT`): every block here is a table with a header row, so a row key plus a column name is already a lookup, and a key per cell would triple the tab for nothing.

| Rows | Contents |
|---|---|
| 1 | `A1` = `01 \| Canva Feed`. `B1` = `IS9WD FEED START v2`. `C1` = feed as of text, which names the Today override when one is set. `D1` = the feed stamp (6.5). |
| 2 | Sentinel: `IS9WD BLOCK: READINESS` in B. |
| 3 to 13 | Block A. Key in A, label in B, value in **C**: `Total active deliverables`, `Rows with a flag`, `Ready for Canva`, `Feed errors`, `Carousel pages`, `Export page list`, `Master pages required`, `Items not published`, `Capacity check`, `Plan check`, `Flag list check`. |
| 14 | Sentinel: `IS9WD BLOCK: TITLE`. |
| 15 to 22 | Block B title page fields, in the 6B order: week line, legend 1, legend 2, legend 3, prepared name, prepared position, checked name, checked position. Key in A, label in B, value in C. |
| 23 | Sentinel: `IS9WD BLOCK: COMMITTEES`. |
| 24 | Officer table header: `Key` `Page` `Committee` `Count` `Next due text` `Station hex` `Number text hex` `Pages` `Not published` in A to I. |
| 25 to 33 | Nine officer rows, in carousel order. `Page` is the committee's **first** master page: 02, 04, 06, 08, 10, 12, 14, 16, 18. |
| 34 | Sentinel: `IS9WD BLOCK: PLAN`. |
| 35 | Page plan header: `Key` `Page` `Used` `Position` `Committee` `VP line` `Part` `Parts` `First item no` `Last item no` `Slots used` `Count` in A to L. |
| 36 to 54 | The page plan: **19 rows, one per physical master page**, always present, most of them unused in a normal week. Row 36 is the title page, rows 37 to 54 are master pages 02 to 19. |
| 55 | Sentinel: `IS9WD BLOCK: PAGES`. |
| 56 | Page header table header: `Key` `Page` `Headline` `VP line` `Tagline` in A to E. |
| 57 to 74 | 18 page header rows, master pages 02 to 19, one per page whether it is used or not. |
| 75 | Sentinel: `IS9WD BLOCK: SLOTS`. |
| 76 | Slot table header: `Key` `Page` `Slot` `Visible` `Title` `Deadline text` `Remark visible` `Remark text` `Window` `Station hex` `Number text hex` `Flag` `Item no` in A to M. |
| 77 to 256 | 180 slot rows: 18 pages times 10 slots, in page then slot order. Page 02 holds rows 77 to 86, page 19 holds rows 247 to 256. |
| 257 | Sentinel: `IS9WD BLOCK: FLAGS`. |
| 258 | Block D header: `Key` `Page` `Committee` `Slot` `Flag` `ID` `Title` in A to G. |
| 259 to 578 | Block D, up to 320 flag rows from one array formula, blank below the last flag. |
| 579 | Sentinel: `B579` = `IS9WD FEED END`. The last row of the tab, and the one a truncated read loses first. |
| R to V, hidden | Helper cells, addresses pinned in 6.4. |

**Block C is two tables now, not one interleaved one** (A2 item 2, accepted). v1 put a 4-column header row among 11-column slot rows, which made the connector's markdown ragged, and the new layout would have made it worse: a 5-column header among 13-column slot rows, 18 times. The header rows are rows 57 to 74 and the slot rows are 77 to 256, each table one consistent width, joined on `Page`.

**The master page mapping, which is the whole of the pagination design in one line.**

```
master page = 1 + (i - 1) * IS9WD_MAX_PARTS + p        i = carousel order 1..9,  p = part 1..2
```

Page 1 is the title page. Carousel order 1 owns pages 02 and 03, order 2 owns 04 and 05, and order 9 owns 18 and 19. Four properties follow, and each one removes a whole class of weekly work:

- **Every page's position is permanent.** A committee's items page is the same physical page in week 3 and week 30, whatever anyone else's item count did. So the master design is built once, by hand, 19 pages, and never restructured.
- **A committee's pair is adjacent**, so a subset of master pages taken in **ascending order is already in reading order**. The continuation page reads immediately after its owner with no reordering.
- **Nothing is added, deleted or reordered at run time.** No `add_page`, no `delete_pages`, no `reorder_page`, no `move_pages`, no `merge-designs`. The weekly run edits text and exports a page list (6.5). That matters beyond convenience: page creation and deletion are the operations the Canva connector either cannot do safely or cannot undo, and text edits are the only class that also survives if the design turns out to be responsive (6.5).
- **The carousel is a subset**, so an unused continuation page simply stays out of the export list. Between 10 and 19 slides, and the arithmetic that makes 19 safe is 6.1 item 8.

**`Master pages required` is `1 + (publishing rows) * IS9WD_MAX_PARTS`, which is 19 today.** It is in Block A and in every Sunday brief beside the design id (8.5c), because it is the one number that can silently exceed what the master actually holds: raising `IS9WD_MAX_PARTS`, or giving a tenth committee a carousel order, changes it with no visible effect until a run tries to paste into a page that does not exist. When the master has fewer pages than the plan needs, the run **stops** rather than adding pages (6.5).

**Block D sizing, and the one place the removed cap left a real hole.** Every flagged row in the workbook lands here, and all 14 entries can hold items, so the bound was `14 * IS9WD_MAX_OPEN + 40`. `IS9WD_MAX_OPEN` is gone. The block is sized at `14 * IS9WD_PUBLISH_MAX + 40`, which is **320 rows, 259 to 578**, and `Build or repair workbook` re-sizes it and re-points the `Feed errors` scan together whenever any of the three capacity numbers changes. But 320 is now a **budget rather than a bound**: nothing caps the items Ethan enters, so 400 flagged rows is possible and the array formula would be truncated with nothing to say so. Hence Block A's `Flag list check`, which compares `Rows with a flag` against the block's row count, reads `Flag list truncated by <n> rows` when it is short, holds `Ready for Canva` at NO, and fails the self test. An earlier draft sized this block at 90, one row per Canva slot, which is the count of rows that can be *published*, not the count that can be *flagged*.

**The tab roughly doubles, and that is the largest single risk in this revision.** The last row moves from 307 to **579**: Block C goes from 99 rows to 198: 180 slot rows plus 18 page header rows, the plan adds 19, Block D grows from 180 rows to 320, and `05 | Archive` keeps growing inside the same connector read (10.1). The connector's truncation limit is still **UNTESTED** (6.5), and a short read looks exactly like a smaller carousel. Three things make that survivable and none of them is optional: the machine key column and the sentinel rows, so a short read is self evident rather than merely short (A2 items 8 and 9, both accepted); the three cross checks the run performs before touching Canva (6.5); and **measuring the truncation limit against the real 579-row tab before the wider feed ships**, which is a Phase 3 gate item rather than a note (13.3, 14).

Merge nothing on this tab (6.5).

### 6.4 Formulas

**Helpers, hidden, addresses pinned.** Columns R to V, chosen to sit clear of the widest visible block, which is the 13-column slot table. v1's helpers were in N, O and P, and every one of them would now be inside a block: N is the plan's `First item no`, and P is nothing at all in the old sense. Every helper below is re-pointed, and the three named ranges over them move with them.

| Cell | Named range | Formula |
|---|---|---|
| R1 | `IS9WD_RANGE_WEEK` | `=UPPER(TEXT(IS9WD_WEEK_START,"mmm")&" "&TEXT(IS9WD_WEEK_START,"d")&" TO "&IF(TEXT(IS9WD_WEEK_START,"yyyy-mm")=TEXT(IS9WD_WEEK_END,"yyyy-mm"),TEXT(IS9WD_WEEK_END,"d"),TEXT(IS9WD_WEEK_END,"mmm")&" "&TEXT(IS9WD_WEEK_END,"d")))` |
| R2 | `IS9WD_RANGE_W1` | the same shape over `IS9WD_WEEK_START` and `IS9WD_WEEK_START+1` |
| R3 | `IS9WD_RANGE_W2` | the same shape over `IS9WD_WEEK_START+2` and `IS9WD_WEEK_END` |
| R25:R33 | `IS9WD_OFFICER_NAME` | the committee name as the directory spells it, the join value every count on that row uses |
| S25:S33 | | earliest active deadline per committee |
| T25:T33 | `IS9WD_COUNT_UNCAPPED` | the **uncapped** active titled count per publishing committee. The Sunday brief reads it (8.5c). This is the only place the real number survives after `Count` is capped at `IS9WD_PUBLISH_MAX`. |
| U25:U33 | `IS9WD_OFFICER_ORDINAL` | the carousel order, 1 to 9, written as a literal by setup. Every lookup on an officer row and every plan row joins on it. |
| V25:V33 | | officer row check string, `OK` or the problem |
| R36:R54 | `IS9WD_PLAN_ORDINAL` | the carousel order that owns this master page, blank on the title row |
| S36:S54 | | plan row check string, `OK` or the problem |
| R57:R74 | | that page's officer `Count`, so the tagline reads one cell rather than repeating a lookup |
| R77:R256 | | per-slot deadline lookup, on each slot row |
| S77:S256 | | per-slot remark lookup, on each slot row |

Named ranges over the visible blocks, so nothing in this section or in `IS9WD_Feed.js` reads a feed address twice: `IS9WD_FEED_FLAGGED` = `C4`, `IS9WD_FEED_READY` = `C5`, `IS9WD_FEED_ERRORS` = `C6`, `IS9WD_FEED_PAGES` = `C7`, `IS9WD_FEED_EXPORT` = `C8`, `IS9WD_FEED_MASTER` = `C9`, `IS9WD_FEED_NOTPUB` = `C10`, `IS9WD_FEED_CAPCHECK` = `C11`, `IS9WD_FEED_PLANCHECK` = `C12`, `IS9WD_FEED_FLAGCHECK` = `C13`, `IS9WD_PLAN_PAGE` = `B36:B54`, `IS9WD_PLAN_USED` = `C36:C54`, `IS9WD_PLAN_POSITION` = `D36:D54`, `IS9WD_PLAN_PART` = `G36:G54`, `IS9WD_PLAN_COUNT` = `L36:L54`, `IS9WD_NOTPUB` = `I25:I33`, `IS9WD_FLAGS` = `A259:G578`.

**Block A**

- C3 Total active deliverables: `=COUNTIFS(IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>")`. Every active titled item across all 14 directory entries, including the five that do not publish. The label is A2 item 7, accepted, so it now says what it counts.
- C4 Rows with a flag: `=SUMPRODUCT(--(IS9WD_DEL_CHECK<>""))`. **Not** `COUNTIF(range,"<>")`: `Check` is a formula in all 2,000 rows returning `""`, which is not an empty cell, so `COUNTIF` would read 2000 forever. This counts every flagged row, published or not, which is what keeps it equal to the Block D row count.
- C5 Ready for Canva, **seven gates**:

```
="Ready for Canva: "&IF(OR(
   NOT(IS9WD_IN_TERM),
   NOT(IS9WD_SIGNOFF_SET),
   IS9WD_FEED_CAPCHECK<>"OK",
   IS9WD_FEED_PLANCHECK<>"OK",
   IS9WD_FEED_FLAGCHECK<>"OK",
   IS9WD_FEED_ERRORS>0,
   SUM(COUNTIFS(IS9WD_DEL_CHECK,
     {"Missing ID";"Missing status";"Unknown committee";"Missing title";
      "Missing deadline";"Deadline not a date";"Title too long";"Remark too long"},
     IS9WD_DEL_PUBKEY,"?*"))>0),"NO","YES")
```

  Gate by gate, because the Sunday brief has to name whichever one fired (8.5c): **out of term** is A2 item 3, accepted, and it also closes erratum E2, since a blank week number and a blank term are the same condition; **the weekly sign-off** is 4.5, NO until this week's row exists, because the alternative is publishing last week's signatures; **capacity check** is the three numbers disagreeing (4.6), which would otherwise truncate silently; **plan check** is a carousel order that is missing, duplicated or out of range, a part past the maximum, or an export list that does not match the page count; **flag list check** is Block D truncation (6.3); **feed errors** is A2 item 4, accepted, so a sentinel or a broken named range now holds the run instead of merely being counted; and the **flag criterion** carries all eight blocking flag names from 5.3, filtered to the rows that publish.

  The filter is `IS9WD_DEL_PUBKEY,"?*"` and both halves of that are load bearing. `IS9WD_DEL_PUBKEY` rather than `IS9WD_DEL_PAGE`, because page is blank on any row with no slot, so keying on page would have stopped catching `Missing title` on a publishing committee: the flag that most needs to block would have stopped blocking, quietly, with `YES` printed above it. And `"?*"` rather than `"<>"`, because `Publish key` is also a formula returning `""` in every unused row, so `"<>"` would match all 2,000 and readiness would go back to counting flags that cannot reach Canva. `"?*"` does match the `!ERR` that an `Unknown committee` row puts in `Publish key`, which is intended: that flag must block. `SUM` over `COUNTIFS` with an array criterion adds one count per flag name.

- C6 Feed errors: `=SUMPRODUCT(--ISERROR($A$1:$M$4))+SUMPRODUCT(--($A$1:$M$4="!ERR"))+SUMPRODUCT(--ISERROR($A$7:$M$579))+SUMPRODUCT(--($A$7:$M$579="!ERR"))`. Three things about this cell, all of which have bitten already or would have:
  - **It skips rows 5 and 6, not just its own row.** Skipping row 6 keeps the cell out of its own scan. Skipping row 5 is new and is required by A2 item 4: readiness now reads this cell, so a scan that included readiness would be a circular reference and the whole tab would go to `#REF!`. What is lost is error detection on the readiness cell itself, and the self test covers it instead by asserting that `C5` begins with `Ready for Canva: `.
  - **It scans to column V and to row 579**, the tab's real last column and last row, the helper band included (6.3). The helpers carry the IFERROR fallbacks the scan exists to catch, so a scan that stops at M reads green over them. The v1 range was `A:K` to row 307, which under this revision would have left the entire page plan, the appended slot columns and 271 rows of Block D outside the only check that looks for `!ERR`. That is the exact failure this design most needs to catch, because a bad lookup in a plan row redirects a whole page's paste.
  - **`Build or repair workbook` rewrites both ranges whenever it sizes a block**, the same way it already did for Block D, and `IS9WD_selfTest()` asserts that the scan's last cell is at or past both the plan block's last cell and Block D's last row. A scan that is merely stale is a scan that reads green.
- C7 Carousel pages: `=COUNTIF(IS9WD_PLAN_USED,TRUE)`. Between 10 and 19 while `IS9WD_PUBLISH_EMPTY_PAGES` is TRUE, and as low as 1 with it FALSE and nobody holding an item.
- C8 Export page list: `=TEXTJOIN(",",TRUE,ARRAYFORMULA(IF(IS9WD_PLAN_USED=TRUE,VALUE(IS9WD_PLAN_PAGE),"")))`. Plain ascending integers, `1,2,4,5,6,8,10,12,14,16,18` on the worked week below, which is exactly what the export operation's page list takes. Integers rather than the plan's two digit text, because a leading zero in a page number is a page number the tool may reject.
- C9 Master pages required: `=1+COUNTIF(IS9WD_DIR_PUBLISHES,TRUE)*IS9WD_MAX_PARTS`, which is 19.
- C10 Items not published: `=SUM(IS9WD_NOTPUB)`, the whole workbook's total of active titled items that ranked past `IS9WD_PUBLISH_MAX` in their committee. Normally 0. It is a number rather than a flag, because an item that does not fit a slide is not a mistake (5.4).
- C11 Capacity check: the same condition as `_Engine`'s `D37` (4B.5), taken from that cell's own formula string in the block descriptor rather than retyped, and read from the feed so the run and the brief have it in the same read.
- C12 Plan check: `=IFERROR(INDEX(FILTER({$V$25:$V$33;$S$36:$S$54},{$V$25:$V$33;$S$36:$S$54}<>"OK"),1,1),"OK")`, the first problem any officer row or plan row reports, or `OK`.
- C13 Flag list check: `=IF(IS9WD_FEED_FLAGGED>ROWS(IS9WD_FLAGS),"Flag list truncated by "&(IS9WD_FEED_FLAGGED-ROWS(IS9WD_FLAGS))&" rows","OK")`.

**Error handling, the rule for the whole tab.** Do **not** swallow errors into blanks. Claude reads this tab as markdown, and although every block row now carries a key (A2 item 8), a blank caused by a broken named range or a renamed committee is still indistinguishable from a legitimately empty slot. Every fallback on this tab is the visible sentinel `!ERR`, **except** where blank is the contract: an unused slot's Title, Deadline text and Remark text, an unused plan row's computed columns, and a committee whose active items all have blank deadlines, which now prints `Next due: date missing` rather than nothing (A2 item 6, accepted). `Feed errors` counts sentinels and errors, `Ready for Canva` reads NO on any of them, and `IS9WD_selfTest()` fails on any hit.

**Block B**

- Week line: `="WEEK "&IF(IS9WD_WEEK_NUMBER="","--",TEXT(IS9WD_WEEK_NUMBER,"00"))&"  |  "&IS9WD_RANGE_WEEK&"  |  "&IS9WD_AY_LABEL`. The `--` placeholder holds the width when the week number is blank outside the term calendar, instead of `TEXT("","00")` collapsing it to `WEEK   |  ...`. A2 item 3, accepted: `--` ships, and out of term also forces readiness to NO, so `WEEK --` can no longer be published.
- Legend 1: `="DUE "&IS9WD_RANGE_W1`. Legend 2: `="DUE "&IS9WD_RANGE_W2`. Legend 3: `="DUE AFTER "&UPPER(TEXT(IS9WD_WEEK_END,"mmm")&" "&TEXT(IS9WD_WEEK_END,"d"))`
- Prepared by name: `=UPPER(IS9WD_PREPARED_NAME)`. Position: `=IS9WD_PREPARED_POSITION`, as typed. Checked by: the same pair. All four named ranges resolve the **current week's** sign-off row (4.5), so these four formulas are unchanged from v1 while the values behind them change every week. When this week's row is missing all four print blank and `Ready for Canva` already reads NO, so a blank signature block can never be published without the run being stopped first.
- The title page also carries **nine station indicators**, one per committee, read from the officer table in carousel order. Nine, not fourteen: this is the piece of the master design that the publish set decision touches physically, and keeping nine is why no hand rebuild of page 1 is needed (6.1 item 8).

**Officer row**, carousel order in `U25`, for row 25:

- A Key: `="B.C"&TEXT($U25,"00")`
- B Page: `=TEXT(1+($U25-1)*IS9WD_MAX_PARTS+1,"00")`, the committee's **first** master page.
- R25 join name: `=IFERROR(INDEX(IS9WD_DIR_NAME,MATCH($U25,IS9WD_DIR_CAROUSEL,0)),"!ERR")`
- C Committee: `=IF($R25="!ERR","!ERR",UPPER($R25))`
- T25 uncapped count: `=COUNTIFS(IS9WD_DEL_COMMITTEE,$R25,IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>")`
- D Count: `=MIN(IS9WD_PUBLISH_MAX,$T25)`
- S25 earliest deadline: `=IFERROR(MINIFS(IS9WD_DEL_DEADLINE,IS9WD_DEL_COMMITTEE,$R25,IS9WD_DEL_ACTIVE,TRUE,IS9WD_DEL_TITLE,"<>",IS9WD_DEL_DEADLINE,">0"),0)`
- E Next due text: `=IF($D25=0,"No deliverables this week",IF($S25=0,"Next due: date missing",IF(INT($S25)<IS9WD_WEEK_START,"Overdue: "&TEXT($S25,"ddd, mmm d"),"Next due "&TEXT($S25,"ddd, mmm d"))))`
- F Station hex: `=IFERROR(INDEX(IS9WD_HEX,MATCH(IF($D25=0,"W3",IF($S25=0,"W1",IF(INT($S25)<IS9WD_WEEK_START,"OVERDUE",IF(INT($S25)<=IS9WD_WEEK_START+1,"W1",IF(INT($S25)<=IS9WD_WEEK_END,"W2","W3"))))),IS9WD_WINDOW_NAMES,0),1),"!ERR")`. G Number text hex: the same with column 2.
- H Pages: `=MAX(1,ROUNDUP($D25/IS9WD_SLOTS_PER_PAGE,0))`, the committee's part count this week, 1 or 2. `MAX(1,...)` is what gives an empty committee one page rather than none, and `ROUNDUP` is what gives a committee with exactly ten items one page rather than two (5.4).
- I Not published: `=MAX(0,$T25-$D25)`
- V25 check: `=IF($R25="!ERR","No committee for carousel order "&$U25,IF($H25>IS9WD_MAX_PARTS,"Pages needed exceeds the maximum parts","OK"))`

The counts key on the **committee name**, not on a page number, because a committee now owns two pages and a count per page would be a count of half a committee. `IS9WD_COUNT_UNCAPPED` and the earliest-deadline band are nine cells aligned to these nine rows, which is unchanged from v1 and is only true because the publish set stayed at nine; at fourteen both bands would have had to grow and the Sunday brief's over-cap report would have read the wrong officers until they did.

**Page plan row**, for row 36 (the title page) and rows 37 to 54 (master pages 02 to 19). `B` holds the master page as two digit text, written as a literal by setup:

- A Key: `="PLAN.P"&$B36`
- R36 ordinal: `=IF(VALUE($B36)=1,"",ROUNDUP((VALUE($B36)-1)/IS9WD_MAX_PARTS,0))`
- G Part: `=IF($R36="","",VALUE($B36)-1-($R36-1)*IS9WD_MAX_PARTS)`
- E Committee: `=IF($R36="","",IFERROR(INDEX($C$25:$C$33,MATCH($R36,IS9WD_OFFICER_ORDINAL,0)),"!ERR"))`
- F VP line: `=IF($R36="","",IFERROR(UPPER(INDEX(IS9WD_DIR_VP,MATCH($R36,IS9WD_DIR_CAROUSEL,0)))&"  |  "&UPPER(INDEX(IS9WD_DIR_POSITION,MATCH($R36,IS9WD_DIR_CAROUSEL,0))),"!ERR"))`
- H Parts: `=IF($R36="","",IFERROR(INDEX($H$25:$H$33,MATCH($R36,IS9WD_OFFICER_ORDINAL,0)),"!ERR"))`
- L Count: `=IF($R36="","",IFERROR(INDEX($D$25:$D$33,MATCH($R36,IS9WD_OFFICER_ORDINAL,0)),"!ERR"))`
- C Used: `=IF($R36="",TRUE,AND($G36<=$H36,OR($L36>0,IS9WD_PUBLISH_EMPTY_PAGES)))`
- D Position: `=IF(NOT($C36),"",TEXT(COUNTIF($C$36:$C36,TRUE),"00"))`, a running count over the Used flags at and above this row, which is the slide number the viewer will see.
- I First item no: `=IF(OR(NOT($C36),$R36=""),"",TEXT(($G36-1)*IS9WD_SLOTS_PER_PAGE+1,"00"))`
- J Last item no: `=IF(OR(NOT($C36),$R36=""),"",TEXT(MIN($L36,$G36*IS9WD_SLOTS_PER_PAGE),"00"))`
- K Slots used: `=IF(OR(NOT($C36),$R36=""),"",MAX(0,VALUE($J36)-VALUE($I36)+1))`. Slots blank on that page is `IS9WD_SLOTS_PER_PAGE` minus this.
- S36 check: `=IF($R36="","OK",IF($E36="!ERR","No committee for this page",IF($G36>IS9WD_MAX_PARTS,"Part is past the maximum parts","OK")))`

Three things deliberately do **not** live on a plan row. Station hex and number text hex stay on the officer row, because the title page carries one station indicator per committee, not per page. Per slot hex stays on slot rows. And the **tagline stays on the page header row**, because two cells holding one contract string is two formulas that can disagree, and the run must never have to choose (finding 9 of the pagination review).

**Page header row** for master page `02` in `B57`:

- A Key: `="C.P"&$B57&".HEAD"`
- R57 count: `=IFERROR(INDEX(IS9WD_PLAN_COUNT,MATCH($B57,IS9WD_PLAN_PAGE,0)),"!ERR")`
- C Headline: `=IFERROR(INDEX($E$36:$E$54,MATCH($B57,IS9WD_PLAN_PAGE,0)),"!ERR")`
- D VP line: `=IFERROR(INDEX($F$36:$F$54,MATCH($B57,IS9WD_PLAN_PAGE,0)),"!ERR")`
- E Tagline: `="WEEKLY DELIVERABLES  |  WEEK "&IF(IS9WD_WEEK_NUMBER="","--",TEXT(IS9WD_WEEK_NUMBER,"00"))&"  |  "&IS9WD_RANGE_WEEK&"  |  "&$R57&" TASK"&IF($R57=1,"","S")`

**The tagline count is the officer's `Count`, and v1's formula referenced the wrong cell.** v1 read `$D17` and called it "that committee's capped Count", but the Block B header put `Count` in C and `Next due text` in D, so the shipped string would have read `...  |  Next due Mon, Sep 28 TASKS`. It is corrected here by looking the count up from the plan by page rather than by an offset, it is the same value on both of a committee's pages (6.1 item 3), and 13.3 carries a golden-string test for it, because the tagline is one of the frozen strings in SPEC section 4.

The headline and the VP line are **identical on both of a committee's pages**, by Ethan's decision of 2026-09-27: the continuation page is the same committee, so it says so, and it carries no part marker anywhere (A2 item 11 proposes one).

Note the asymmetry, which is v1's and is kept on purpose: the VP line uppercases both name and position, while the title page prepared-by position prints as typed.

**Slot row.** Every row uses the identical formula, keyed on its own `Page` and `Slot` cells, which is why 5.1 column Q exists. For row 77 (page `02`, slot `01`):

| Col | Formula |
|---|---|
| A Key | `="C.P"&$B77&".S"&$C77` |
| D Visible | `=NOT(ISNA(MATCH($B77&"-"&$C77,IS9WD_DEL_SLOTKEY,0)))` |
| E Title | `=IFERROR(INDEX(IS9WD_DEL_TITLE,MATCH($B77&"-"&$C77,IS9WD_DEL_SLOTKEY,0)),"")` |
| R helper | `=IFERROR(INDEX(IS9WD_DEL_DEADLINE,MATCH($B77&"-"&$C77,IS9WD_DEL_SLOTKEY,0)),"")` |
| S helper | `=IFERROR(INDEX(IS9WD_DEL_REMARK,MATCH($B77&"-"&$C77,IS9WD_DEL_SLOTKEY,0)),"")` |
| F Deadline text | `=IF($R77="","",IF(INT($R77)<IS9WD_WEEK_START,"Overdue: "&TEXT($R77,"ddd, mmm d"),"Due "&TEXT($R77,"ddd, mmm d")))` |
| G Remark visible | `=AND($D77,$S77<>"")` |
| H Remark text | `=IF($S77="","","·  "&$S77)` with U+00B7 then two spaces |
| I Window | `=IF(NOT($D77),"",IF($R77="","W1",IF(INT($R77)<IS9WD_WEEK_START,"OVERDUE",IF(INT($R77)<=IS9WD_WEEK_START+1,"W1",IF(INT($R77)<=IS9WD_WEEK_END,"W2","W3")))))` |
| J, K hex | `=IF($I77="","",IFERROR(INDEX(IS9WD_HEX,MATCH($I77,IS9WD_WINDOW_NAMES,0),1),"!ERR"))`, and column 2 |
| L Flag | `=IFERROR(INDEX(IS9WD_DEL_CHECK,MATCH($B77&"-"&$C77,IS9WD_DEL_SLOTKEY,0)),"")` |
| M Item no | `=IF(NOT($D77),"",IFERROR(TEXT(INDEX(IS9WD_DEL_RANK,MATCH($B77&"-"&$C77,IS9WD_DEL_SLOTKEY,0)),"00"),"!ERR"))` |

**v1's eleven slot columns keep their relative order and their formulas**, shifted one column right by the key. Only the join changes, from `$A28&"-"&$B28` to `$B77&"-"&$C77`, and the value on either side of the hyphen is still two digits, so the slot key format is byte identical to v1's.

**`Item no` is the officer-relative number, and the run does not use it yet.** On a continuation page the master's frames are numbered 01 to 10, so the committee's eleventh item publishes under a frame reading 01. Overwriting that number is a change to a printed page, so it is a proposal with an interim, not an applied change (A2 item 12): the column exists, the feed reports the true number, and the run leaves the frames alone until Ethan rules. It is also the cross check that a continuation page received the right items: page 2's first slot should read `11`.

**Block D**, one array formula in `A259`:

```
=IFNA(SORT(FILTER({ARRAYFORMULA(IF(IS9WD_DEL_ID="","","D."&IS9WD_DEL_ID)),
  IS9WD_DEL_PAGE,IS9WD_DEL_COMMITTEE,IS9WD_DEL_SLOTONPAGE,
  IS9WD_DEL_CHECK,IS9WD_DEL_ID,IS9WD_DEL_TITLE},
  IS9WD_DEL_CHECK<>""),2,TRUE,4,TRUE),"")
```

Three details are load bearing. The computed key column is wrapped in **`ARRAYFORMULA`**: `IF` and `&` do not broadcast over a range inside an array literal, so without it that column evaluates to a single scalar, the `{}` literal fails on a size mismatch, and Block D goes permanently and silently blank, which is the worst possible failure for the one block whose job is to tell Ethan there are flags. The wrapper is **`IFNA`, not `IFERROR`**: `IFNA` absorbs only the `#N/A` that an empty `FILTER` returns, which is the legitimate "no flags" state, and lets a real `#REF!` or `#VALUE!` show so `Feed errors` can count it. And the `Slot` column is now `IS9WD_DEL_SLOTONPAGE`, which is already two digit text on the data tab, so v1's `ARRAYFORMULA(TEXT(rank,"00"))` wrapper is gone with the column it computed. `Page` is `IS9WD_DEL_PAGE`, the master page, which is **blank on any flagged row with no slot**: a `Missing title` row has no rank, so it has no part, no slot and no page, and the appended `ID` and `Title` columns are what identify it (6.1 item 5). `IS9WD_selfTest()` asserts that the number of non-empty Block D rows equals `C4`.

**A titled active row with no usable deadline renders `Deadline text` blank and `Window = W1`,** with W1's two hex values, and it sorts into slot 01 rather than last because `INT(N(""))` and `INT(N("Sept 21"))` are both 0 (5.4). Two deliberate choices, stated here because both diverge from the obvious: the row sorts **first** so that an item nobody can date is the first thing seen rather than buried in slot 10, and `Window` falls back to `W1` rather than blank so the slot still has a station color to paint, since the contract defines no blank window. Neither can reach a published page: `Missing deadline` and `Deadline not a date` are both blocking flags, so `Ready for Canva` reads NO for as long as such a row exists. The carried-over v1 finding asked for last-and-blank instead; the divergence is recorded at the end of Appendix B.

**A worked week, to make the plan concrete.** Week 04, week start Monday 2026-09-28, read on Sunday 2026-09-27. `Publications` has 14 active titled items, everyone else has 3 to 8, `IS9WD_PUBLISH_EMPTY_PAGES` is TRUE.

| Position | Page | Used | Committee | Part of Parts | First to Last | Slots used | Count |
|---|---|---|---|---|---|---|---|
| 01 | 01 | TRUE | (title page) | | | | |
| 02 | 02 | TRUE | PARTNERSHIPS | 1 of 1 | 01 to 08 | 8 | 8 |
| | 03 | FALSE | | | | | |
| 03 | 04 | TRUE | PUBLICATIONS | 1 of 2 | 01 to 10 | 10 | 14 |
| 04 | 05 | TRUE | PUBLICATIONS | 2 of 2 | 11 to 14 | 4 | 14 |
| 05 | 06 | TRUE | MARKETING AND ADVOCACY | 1 of 1 | 01 to 07 | 7 | 7 |
| | 07 | FALSE | | | | | |
| 06 | 08 | TRUE | MEMBERSHIP | 1 of 1 | 01 to 06 | 6 | 6 |
| | 09 | FALSE | | | | | |
| 07 | 10 | TRUE | TEAM MANAGEMENT | 1 of 1 | 01 to 05 | 5 | 5 |
| | 11 | FALSE | | | | | |
| 08 | 12 | TRUE | INVESTMENT STRATEGY & EDUCATION | 1 of 1 | 01 to 04 | 4 | 4 |
| | 13 | FALSE | | | | | |
| 09 | 14 | TRUE | INVESTMENT RESEARCH | 1 of 1 | 01 to 08 | 8 | 8 |
| | 15 | FALSE | | | | | |
| 10 | 16 | TRUE | DOCUMENTATION | 1 of 1 | 01 to 03 | 3 | 3 |
| | 17 | FALSE | | | | | |
| 11 | 18 | TRUE | FINANCE | 1 of 1 | 01 to 06 | 6 | 6 |
| | 19 | FALSE | | | | | |

Block A for that week: `Carousel pages` 11, `Export page list` `1,2,4,5,6,8,10,12,14,16,18`, `Master pages required` 19, `Items not published` 0, and the three check cells `OK`. Eleven export numbers, eleven Used rows, strictly ascending and not contiguous, which is exactly what the run's three cross checks compare (6.5).

The other eight committees print v1's tagline byte for byte, for example `WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 28 TO OCT 4  |  8 TASKS`. Publications prints `WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 28 TO OCT 4  |  14 TASKS` on **both** of its pages, and page 05 carries `PUBLICATIONS` and the same VP line as page 04. Its slot rows on page 05 are slots 01 to 04 with `Item no` 11 to 14, and slots 05 to 10 are `Visible = FALSE`.

Two sanity checks this example is chosen to exercise: Publications at exactly 10 would give `ROUNDUP(10/10,0)` = 1 part and no continuation page, where a naive `INT(n/10)+1` gives 2 and publishes a blank slide; and the export list is non-contiguous but strictly ascending, so the carousel reads in committee order with no reordering call.

### 6.5 Reading the feed: the Sunday constraint, the run, and the connector

**The feed is valid for a run executed on a Sunday**, or on any day with `IS9WD_TODAY_OVERRIDE` set to the Sunday being published from. `Deadline text` and `Window` compare against week start, so on a Wednesday read an item that was due Monday of the current week prints `Due Mon, Sep 21` with `Window = W1` while `Check` says `Overdue`: publish from that and the page tells a committee an item is upcoming when it is two days late. `C1` therefore prints `Feed as of <ddd, mmm d>` from `IS9WD_EFFECTIVE_TODAY`, and appends `  |  TODAY OVERRIDE SET` whenever `IS9WD_TODAY_OVERRIDE` is non-blank, so the one condition that can freeze this whole tab on a past week is legible in the same read that carries the strings. Neither `C1` nor `D1` is one of the contract strings in 6A to 6D, so adding to them costs nothing. The Sunday brief repeats both (8.5c), and `canva/CANVA_RUN.md` opens with this paragraph.

**`D1` is the feed stamp, and it exists because the sheet is live while the run is reading it.** It carries the week start, effective today and a checksum over the officer table's `Count` column, all in one string. The endpoint keeps accepting ticks during a run, and a tick can change a `Count`, which changes `Parts`, which flips a `Used` flag, which renumbers `Position` and changes the export list. Master page numbers never move, so a paste still lands on the right page, but an export list taken before the change and slot rows read after it describe two different weeks: the export could omit a page that is now used, or include one whose slots were never written. The three cross checks below are all computed inside one read and are blind to drift between two reads. So the rule is: **take Block A, the plan, the page headers and every slot row from one connector read of the whole tab, and abort if a later read's stamp differs.** That is cheaper than a run-in-progress lock and it also catches a truncated second read.

**Before anything else, once, a read-only check that has never been run.** Call the Canva read-design operation with no transaction open and confirm two things: the master design holds at least `Master pages required` pages, and its pages are **not** reported as responsive. This is a gate rather than a nicety. On a responsive design the Canva editing tool accepts only `update_title`, `replace_text`, `update_fill`, `delete_element` and `find_and_replace_text`, and if an unsupported operation is included in a batch, **nothing in the batch is applied**. `update_opacity` is not in that list, which means the standing hide rule below is unimplementable on a responsive design and the only other route, deleting the element, is permanent and destroys the master for every later week. This applies to the v1 ten page master as much as to the nineteen page one, so it is not a new risk, only a newly named one. It is one read-only call and it gates the master build, the hide rule and the whole weekly run. **UNTESTED as of 2026-09-27: no Canva tool has been called in this build.** It moves into Phase 3 as a prerequisite rather than waiting for the Canva phase (13.3, 14).

**The weekly run, in six steps, and `canva/CANVA_RUN.md` states them in this order:**

1. **The read-only design check above.** If the pages are responsive, stop and say so. If the design holds fewer pages than `Master pages required`, stop: do not add pages mid run. Report the master's page count, `Master pages required`, and which plan rows have no master page. Three reasons that is a hard stop rather than a recovery: the add-page operation has no position field, so where a new page lands is undocumented; rebuilding a page element by element re-implements the master's styling in code and will drift from it; and on a responsive design the add is silently unavailable. The fix is a one time supervised master rebuild under Ethan's approval, which is a Configuration edit paired with hand work in Canva, and doing it on a copy of the design first is free.
2. **Read Block A first, not the title page.** `Ready for Canva` must read YES. Record `Carousel pages`, `Export page list`, `Master pages required`, `Items not published`, the three check cells, `Feed as of` with its weekday and the feed stamp. Stop on NO, on any check cell that is not `OK`, and on any `Feed as of` that is not the Sunday being published from.
3. **Read the page plan and keep only the `Used` rows, in `Position` order.** Assert three things before touching Canva: the number of `Used` rows equals `Carousel pages`; the count of numbers in `Export page list` equals `Carousel pages`; and the export list is strictly ascending. Any mismatch means the connector truncated the read, which is the failure this layout most needs to catch, because a short read looks exactly like a smaller carousel. Confirm the `IS9WD FEED END` sentinel is present in the same read, for the same reason.
4. **Walk the plan, not the page numbers.** For each `Used` plan row, paste into its `Page`: the headline and VP line from the page header row with the matching `Page`, the tagline from the same row, then the slot rows whose `Page` matches, by `Slot`. Every string is copied, never assembled, with `\|` unescaped back to `|` and the double spaces preserved. `Visible = FALSE` still means hide, never delete.
5. **Leave every unused master page alone, and blank its tagline.** An unused continuation page still holds the text of the last week it was used. The export list is the primary guard and a stale string cannot defeat it, so correctness does not depend on this, but anyone opening the master without `canva/CANVA_RUN.md` would otherwise read a stale page as current. One text replacement per unused page, and it is a judgement call rather than load bearing.
6. **Export by list.** Call the export operation with its page list set to `Export page list`, then confirm the returned page count equals `Carousel pages` before anything is posted. **No page is ever added, deleted or reordered in a weekly run.** Every weekly operation is a text replacement plus the hide operation, which is the only class that also survives a responsive design.

**Three rules the run must follow, and `canva/CANVA_RUN.md` states all three first:**

- **`Visible = FALSE` means set that element's opacity to 0. Never delete it.** The master design `DAHVvLLgskQ` is reused every week, so a deleted slot is gone for every later week and has to be rebuilt by hand from a neighbouring page. This is also what an empty committee's page looks like: ten slots all `Visible = FALSE`, `Count` 0, `No deliverables this week`, tagline ending `0 TASKS`, and a page body of invisible slots rather than a rebuilt page. **The fallback, if the design turns out to be responsive:** blank the slot's Title, Deadline text and Remark text with page-scoped text replacements and accept a visible empty station frame, or rebuild the master as fixed-page, which is Ethan's call. Never reach for the delete.
- **Every paste that belongs to one page is page scoped.** Use the page-indexed text replacement for the headline, the VP line, the tagline, every slot string and any number text. The design-wide find-and-replace is reserved for the week line and the three legends, which are genuinely design wide. Across 19 near-identical pages two committees with the same count share a byte-identical tagline and every unused slot shares identical blank text, so one design-wide replacement can hit a page it was not aimed at, and the whole safety argument of this design rests on pasting into a specific master page.
- **Unescape `\|` back to `|` before copying** any string that carries the contract's `  |  ` separators, and copy the double spaces exactly.

Connector behaviour, verified 2026-09-21 by probing `read_file_content` on a live multi-tab IS9 Sheet. `canva/CANVA_RUN.md` must restate all of it:

- Output is markdown; each tab becomes a separate table separated by a blank line.
- Tab names are NOT included, so the tab identifies itself from cell content. Hence `A1`, and now also the `IS9WD FEED START v2` sentinel beside it.
- The first row of each table is an empty header placeholder.
- Merged cells render as `[merged] <text>` repeated in every cell of the merge. **Merge nothing on the feed.**
- A literal `|` inside cell text comes back escaped as `\|`. The contract's `  |  ` separators arrive as `  \|  `. Unescape before copying into Canva.
- Double spaces are preserved.
- Dates come back as displayed, for example `Sep 23, 2026`. Every value Canva needs is already a string, so this affects only the hidden helper columns.
- The connector is connected to both Ethan's DLSU account and a personal address, so the DLSU-owned Sheet may be readable with nothing shared. Test the real read first and share to the personal address only if that read fails. See 2.2.
- **UNTESTED:** hidden-tab handling, whether `TODAY()` is recalculated at read time, and **the truncation size limit, which this revision makes the largest open risk in the build.** The feed's last row moved from 307 to 579, `05 | Archive` grows inside the same read (10.1), and the two views added 324 rows to it (6A, 6B). Measuring the limit against the real tab is a Phase 3 gate item (13.3), not a note, and the machine keys, the sentinels and the three cross checks in run step 3 are what make a short read detectable rather than merely short. The hourly recalculation interval and the heartbeat in 8.4 are the mitigations for the `TODAY()` question, both untested.

---

## 6A. `03 | Statistics`: the dashboard

Ethan's instruction of 2026-09-27, verbatim: *"for the statistics, i don't it to be a configuration, i want to see KPIs and Charts, literally for viewing"*.

So the tab is four things and nothing else: **eight big number tiles**, **one table of sentences**, **the seven readiness gates**, and **three tables each followed by a real embedded chart**. Not one threshold is on it; they are all on `_Engine` (4B.7). Not one hidden column is on it; they are all on `_Views` (6C). Nothing on it is typed and nothing on it is a form.

Every cell is a formula over `02 | Deliverables`, `05 | Archive`, `00 | Configuration`, `_Engine` and `_Views`: no new source of truth, and no Apps Script writing a value a formula could produce. `IS9WD_Stats.js` owns the tab, and `Build or repair workbook` calls it through `IS9WD_setupCall_` so a missing push cannot take the build down.

**Neither view may ever gate the Canva run.** Readiness stays at seven gates and reads the feed alone. `IS9WD_STATS_ERRORS` and `IS9WD_STATS_GATE_AGREE` fail the **self test** and appear in the Sunday brief, and they do nothing else. A view that breaks must not stop publication, and the reverse would make the carousel hostage to a statistics formula.

Three rules from elsewhere apply here unchanged, and each one is load bearing. **A1 carries the tab's own name**, because the Drive connector strips tab names (6.5). **The last row carries the literal end marker `IS9WD STATS END`**, so a truncated read is self evident rather than merely short. And **nothing is merged** (2.5): a tile is a wide column, a big type size and overflow wrap, never a merge.

### 6A.1 The screen budget

Twelve visible columns, A to L, and no hidden ones.

| Col | Width | Serves |
|---|---|---|
| A | 250 | officer names, measure labels, and the first tile of each tile row |
| B | 230 | `Attention` strings, the numbers in the sentence table, and the rest of the first tile |
| C to L | 80 each, except G 90 and L 110 | the ten numeric officer columns, and tiles two, three and four |

Total **1,180 px**. A 1366 px laptop shows roughly 1,284 px of grid after the row number gutter, so the widest block fits with room and nothing needs horizontal scroll. **That is the whole answer to reading this tab with no frozen column** (2.5).

The first two columns are wide because they carry an officer name and an `Attention` sentence. The consequence for the tiles is deliberate rather than tolerated: **tile 1 of each row is wide (480 px) and tiles 2, 3 and 4 are even with each other (240 to 270 px)**, so the two longest strings on the tab, the week line and the readiness verdict, get the room they need and the six numeric tiles look like a set.

### 6A.2 Row map, all of it computed

| Rows | Contents | Height |
|---|---|---|
| 1 | Banner `03 \| STATISTICS` | 46 |
| 2 | Help line | 34 |
| 4 | Band `THIS WEEK AT A GLANCE` | 38 |
| 5 | Hint row | 26 |
| 6, 7, 8 | Tile row 1: value, label, note | 46, 22, 22 |
| 10, 11, 12 | Tile row 2: value, label, note | 46, 22, 22 |
| 14 to 22 | `WHAT NEEDS ATTENTION`: band, hint, header, 6 rows | 38, 26, 30, 26 |
| 24 to 33 | `READINESS GATES`: band, hint, header, 7 gate rows | 38, 26, 30, 26 |
| 35 to 51 | `BY OFFICER`: band, hint, header, 14 officer rows | 38, 26, 30, 26 |
| 53 to 69 | Chart 1: band, hint, caption, 14 reserved rows | 38, 26, 26, 26 |
| 71 to 87 | `TRACK RECORD, RANKED`: band, hint, header, 14 rows | 38, 26, 30, 26 |
| 89 to 105 | Chart 2: band, hint, caption, 14 reserved rows | |
| 107 to 117 | `TREND, LAST <n> WEEKS`: band, hint, header, 8 rows | |
| 119 to 135 | Chart 3: band, hint, caption, 14 reserved rows | |
| 136 | `IS9WD STATS END`, the tab's own error count in C, the gate agreement in E | 26 |

**136 rows at the shipping settings, and not one of the counts is typed.** `IS9WD_statsLayout_` computes every row number from `IS9WD_DIR_ROWS`, `IS9WD_STATS_TREND_WEEKS`, the declared tile rows and the declared chart list. Every spacer is 18 px, up from 12: more air was Ethan's instruction.

### 6A.3 Two windows, named once so nothing is ambiguous

Every number on this tab uses one of two windows, and the label says which.

- **This week**: deadline between `IS9WD_WEEK_START` and `IS9WD_WEEK_END`. Used by `Due`, `Done` and `Rate`, and by the first four tiles.
- **Everything current**: every titled row on the data tab, whatever its deadline. Used by `Overdue`, `Worst late`, `Silent`, `On time`, `Judged`, `Avg days` and `No slide`.

The difference is deliberate and it is the first thing a reader would otherwise get wrong. An item overdue from two weeks ago still needs chasing, so `Overdue` is not week-windowed. The week tile states the week, so no number below it is orphaned.

**Everything current is bounded by retirement.** `RETIRE_ACCOMPLISHED` clears rows A to I after `IS9WD_RETIRE_DAYS` (10.1), so every lifetime measure here covers the un-retired window only. History lives in the Archive, which is what the trend block reads. The tab's help line says so.

### 6A.4 The eight tiles

Three cells per tile in three rows: the number at 22 point bold in `#085040`, the label at 9 point in `#58756a`, and one short line under it in the same. No fill, no border, no merge. Keyed on a machine key in `IS9WD_STATS_TILES`, so a list that grew a tile throws on the unknown key rather than painting eight tiles one position out of place.

| Tile | Label | Named range | Flagged when | Why it earns its place |
|---|---|---|---|---|
| 1 | THIS WEEK | `IS9WD_STATS_WEEK` | out of term | Every number beside it is scoped to this week, and a reader who has to guess which week is reading a different report from the one on screen. |
| 2 | STILL TO DO | `IS9WD_STATS_ACTIVE_WEEK` | never | The denominator a reader holds in their head. |
| 3 | DONE | `IS9WD_STATS_DONE_WEEK` | never | Reads the derived `Active` flag, never a status label. An item ticked this week whose deadline was last week counts against last week's load. |
| 4 | AGAINST PACE | `IS9WD_STATS_PACE` | behind the elapsed fraction of the week by more than `IS9WD_STATS_PACE_SLACK` | A naked completion percentage is 0% on Monday morning by construction, which is a vanity number. Against elapsed time it becomes ahead or behind, which is actionable. This is the one measure that was rescued rather than killed. |
| 5 | CANVA | `IS9WD_STATS_READY` | reads anything but `READY` | `READY` or `NOT READY` rather than the feed's own sentence, because a tile is read from across a desk. The note names the gate that holds it. |
| 6 | LATE NOW | `IS9WD_STATS_OVERDUE_NOW` | above 0 | The chase list's size. It reads the `Check` column rather than restating the rule, because a second definition of overdue can drift from the flag Ethan sees on the data tab. |
| 7 | DUE IN 2 DAYS | `IS9WD_STATS_DUE_SOON` | never | Exactly what the daily digest emails out, so it says what landed in thirteen inboxes this morning. A busy Wednesday is not a fault. |
| 8 | OFFICERS WITH NOTHING | `IS9WD_STATS_NO_ITEMS` | above 0 | **The most actionable number on the tab**, because it is Ethan's own omission and nobody else's: he enters every item, so an officer with nothing has nothing to tick and gets no Monday email. |

**A flagged tile takes bold `#724485` text and no fill**, which is this tab's one departure from the workbook's usual flag treatment. A cream filled tile reads as a box rather than as a number, and the whole point of a tile is the number. Each tile's rule is scoped to that tile's own three cells across its own span, so a flag on one tile cannot decorate the tile beside it. It is recorded as a ruling in Appendix C.

**A tile note is short, and short is a constraint rather than a preference:** a tile is 240 px wide and the line clips. Anything that needs a sentence belongs in the block below, which is exactly what that block is for.

### 6A.5 `WHAT NEEDS ATTENTION`, rows 17 to 22

Three columns: `What`, `Number`, and one sentence saying what to do. The sentence sits in an 80 px column and overflows right across D to L, which is why no row of the block puts anything in D to L. It is the device the feed's own band rows use.

| Row | What | Named range | The sentence |
|---|---|---|---|
| 17 | Late right now | reads the tile | names who to chase first and how many days late they are |
| 18 | Officers with nothing entered for this week | reads the tile | **names them**, because a count of four is not an action and four names are |
| 19 | Officers silent for `<n>` days or more | `IS9WD_STATS_SILENT` | names them, and says a link can be reissued from the menu |
| 20 | Flags blocking the carousel | `IS9WD_STATS_BLOCKING` | names the first offender from the feed's own flag list |
| 21 | Tasks with no slide | `IS9WD_STATS_PAST_CAROUSEL` | names who, and says this is not a fault: cut, reprioritise, or accept |
| 22 | Ready for Canva | reads the tile | names the gate that holds it |

Row 19's label is itself a formula, `="Officers silent for "&IS9WD_STATS_SILENT_DAYS&" days or more"`, so a label that names a setting cannot go stale.

**Three of the six carry a measure of their own and three point at a tile**, so every one of the eleven measures is named exactly once on the tab. Row 21 takes the accent rather than the flag treatment, because an item that does not fit a slide is not a mistake (5.4) and the feed already treats the same number that way.

**Row 19's honest caveat is in the tab's help line:** a status change by Ethan from the Sheet resets the silence clock too, so silence is evidence and not proof. The action is concrete either way.

**`IS9WD_STATS_BLOCKING`** uses the eight names and the `"?*"` filter from 6.4's readiness criterion, including both load bearing halves: `IS9WD_DEL_PUBKEY` and not `IS9WD_DEL_PAGE`, and `"?*"` and not `"<>"`. The eight names come from Core's own list, so a ninth flag counts itself.

**There is no hidden flag column on this tab any more**, so the eight tiles and the six sentence rows each carry their own conditional format rule, fourteen in all. That is the honest replacement for one rule reading one hidden boolean column: the column is gone because Ethan asked for the hidden columns to be out of his way, and fourteen scoped rules cost nothing at recalculation time.

### 6A.6 `READINESS GATES`, rows 27 to 33

Three columns: `Gate`, `State`, and one sentence saying what the gate reads and what to do about it. Six of the seven states are a plain read of a cell that already exists, which is what keeps this from being a second copy of 6.4.

| Row | Gate | State |
|---|---|---|
| 27 | In term | `=IF(IS9WD_IN_TERM,"PASS","HOLD")` |
| 28 | Sign-off set for this week | `=IF(IS9WD_SIGNOFF_SET,"PASS","HOLD")` |
| 29 | Capacity check | reads `IS9WD_FEED_CAPCHECK` |
| 30 | Plan check | reads `IS9WD_FEED_PLANCHECK` |
| 31 | Flag list check | reads `IS9WD_FEED_FLAGCHECK` |
| 32 | Feed errors | reads `IS9WD_FEED_ERRORS` |
| 33 | Blocking flags on publishing rows | reads `IS9WD_STATS_BLOCKING`, so the eight flag names exist once on this tab |

**The duplication is closed by a check, not by trust.** `E136`, named `IS9WD_STATS_GATE_AGREE`:

```
=IF((COUNTIF(IS9WD_STATS_GATE_STATE,"HOLD")>0)=(RIGHT(IFERROR(IS9WD_FEED_READY,""),2)="NO"),
   "OK","Gates disagree with Ready for Canva")
```

**It reads the FEED's verdict, not the tile beside it,** and that is a correction rather than a detail: the tile renders `READY` or `NOT READY` from the feed's sentence, so comparing the gates against the tile would compare a copy with a copy. The self test fails on anything but `OK`. **That is the only thing that can tell a stale copy of the gate list from a correct one**, and it is why the block is allowed to exist at all.

### 6A.7 `BY OFFICER`, rows 38 to 51

Fourteen rows in **hierarchy order** (4B.9), because hierarchy order is the order every list a person reads is sorted by. The five offices are ordinary rows here, exactly as 5.4 says they are everywhere except Canva.

| Col | Header | Named range | What it is |
|---|---|---|---|
| A | Committee or office | `IS9WD_STATS_OFF_NAME` | a pointer at the identity sort on `_Views` |
| B | Attention | `IS9WD_STATS_OFF_ATTENTION` | one broadcast precedence string, first match wins, `OK` at the bottom |
| C | Due | `IS9WD_STATS_OFF_DUE` | active, titled, deadline inside this week |
| D | Done | `IS9WD_STATS_OFF_DONE` | the same with `IS9WD_DEL_ACTIVE,FALSE` |
| E | Rate | `IS9WD_STATS_OFF_RATE` | `Done` over `Due` plus `Done`, blank at zero load |
| F | Overdue | `IS9WD_STATS_OFF_OVERDUE` | a count of the `Overdue` flag, never a second definition of it |
| G | Worst late | `IS9WD_STATS_OFF_LATE` | days between today and the earliest active deadline, 0 rather than negative |
| H | Silent | `IS9WD_STATS_OFF_SILENT` | days since the last status change, or `never` |
| I | On time | `IS9WD_STATS_OFF_ONTIME` | 6A.8 |
| J | Judged | `IS9WD_STATS_OFF_JUDGED` | titled items with a real deadline already in the past |
| K | Avg days | `IS9WD_STATS_OFF_AVGDAYS` | below |
| L | No slide | `IS9WD_STATS_OFF_NOTPUB` | read from the feed by carousel ordinal, blank on an officer who does not publish |

`Not on carousel` is renamed `No slide`, for the reason `Publishes` became `On the carousel`: the shorter phrase says the same thing in words a reader does not have to decode.

**`Attention` is the column Ethan scans, which is why it is second from the left** (2.5: with no frozen column, the left edge is the only part of a wide table that is always visible). It is the officer row equivalent of the workbook's own `Check` idiom: `Nothing entered for this week`, then `Overdue: n`, then `Blocked: n flagged`, then `Silent n days` or `Never ticked`, then `No slide for n`, then `Behind pace`, then `OK`. `AND` does not broadcast, so the last condition multiplies instead.

**Identity comes from one spilling sort on `_Views`, and column A is a plain pointer at it**, so display formatting never fights the sort. Then one broadcast formula per column: `COUNTIFS`, `SUMIFS`, `MINIFS`, `MAXIFS` and `SUMIF` all take an array criterion under `ARRAYFORMULA`, which is what makes a fourteen row block cost one formula per column instead of fourteen lookups per column.

**`Avg days` measures creation to the last status change**, using the identity that a sum of differences equals a difference of sums when the filter is identical, which is what lets `SUMIFS` stand in for an `AVERAGEIFS` over a computed range. It is a **behaviour signal rather than a performance measure**: an average near 0 means the officer ticks the moment Ethan enters the item, which is a data quality smell worth seeing. **It is the first column to cut if recalculation bites.**

Conditional formatting: `Attention` other than `OK`, `Overdue` above 0, `Worst late` at or above `IS9WD_STATS_LATE_DAYS`, `Silent` at or above `IS9WD_STATS_SILENT_DAYS` or reading `never`, `Rate` behind pace, and `On time` below `IS9WD_STATS_ONTIME_TARGET` all take the flag treatment. A `Rate` of exactly 1 and a non-zero `No slide` take the accent, because neither is a fault.

**Every threshold in every one of those rules is wrapped in `INDIRECT`.** A conditional format rule may not reference another sheet, and all four of those thresholds are on `_Engine` now. `IS9WD_statsRuleName_` applies the wrapper to **every** named range in **every** rule this module writes, including the ones that happen to be local, because a wrapper applied selectively is a wrapper somebody forgets. This is the bug that stopped `04 | Officer Tables` being built at all in the previous revision.

### 6A.8 The fair ranking, and the honesty column

A count ranks the busiest committee last every week. A completion rate is noise at two items. The comparator that is independent of workload is **the share of an officer's items whose deadline has already passed that were accomplished on or before that deadline.** The denominator is `Judged`; the numerator is those that are terminal and whose `Status at` fell before the end of the deadline day.

`COUNTIFS` cannot express a row-wise comparison between two ranges, so this is the one metric on the tab that is not a plain broadcast. `MMULT` does it in one formula instead of fourteen `SUMPRODUCT`s, and the `INT(...)` wrappers are the rule 5.3 states for every deadline comparison in this workbook, because validation accepts a datetime and a paste bypasses validation. **Fallback if `MMULT` misbehaves on the first build:** fourteen single-cell `SUMPRODUCT`s with the same predicate, at about seven times the cost. Noted as untested, with an acceptance check in 13.3.

**`Judged` is displayed, and a rate is suppressed entirely below `IS9WD_STATS_MIN_JUDGED` rather than printed as 0% or 100% off one item.** An officer three weeks into a term has nothing to rank, and the tab says so instead of inventing a verdict. That is what makes the ranking fair.

**`TRACK RECORD, RANKED`, rows 74 to 87.** Five visible pointers at the sort on `_Views`: `Rank`, `Officer`, `On time`, `Judged`, `Note`. The `-1` substitution for an unscored officer is what puts them at the bottom of a descending sort, because an empty string sorts as text and text sorts before numbers descending, which would have put every unscored officer first. It is displayed as blank, never as `-1`, and a rule mutes any row whose `Note` is filled, so the unscored tail reads as not applicable rather than as last place. The block is deliberately separate from the officer table, because that table stays in hierarchy order and a rank number buried in hierarchy order is not a ranking anyone can read.

**This is a league table of fourteen people and the Canva reader account can read it** (2.2). Nothing personal leaks, but a ranking is a judgement, so: it is named `TRACK RECORD, RANKED`, an officer with too small a sample is suppressed rather than ranked, and it never reaches the feed, an email or Canva. Ethan's call to keep it, recorded in Appendix C.

### 6A.9 `TREND`, rows 110 to 117, and its honest limits

**What the Archive can and cannot support**, because the block is designed around it. The snapshot path archives the feed's **visible** rows and the feed excludes terminal items, so a snapshot row's status is always active: snapshot rows structurally cannot say what was accomplished (10.1). Only the retire path records an accomplishment, once per ID, with a real `Deadline` and a real `Status at`. Therefore:

- Weekly **load** is reliable from snapshot rows, keyed on `Week start`.
- Weekly **accomplishment** is available only for items that have been **retired**, bucketed by the week their deadline fell in.
- Weekly **overdue at week end** cannot be reconstructed at all. It is not offered.

Rows are oldest first, so the chart under the block reads left to right in time. Columns: `Week`, `Week start`, `Published`, `Accomplished`, `On time`, `Recorded`. Two hidden helpers on `_Views` carry the week's Monday, generated by `SEQUENCE`, and that week's own term start, looked up by `SUMIFS` over the term calendar rather than from `IS9WD_TERM_START`, **so a week inside a previous trimester numbers against its own trimester instead of against the current one**. `Recorded` reads `Not archived`, `Snapshot only` or `Archived`, and the two source strings are interpolated by setup from `IS9WD_ARCHIVE.SOURCE_SNAPSHOT` and `.SOURCE_RETIRED`: one definition, in code.

`On time` is the one per-row block on the tab, eight `SUMPRODUCT`s, because comparing two ranges row by row is what no broadcast criterion can express.

**The single sparkline is withdrawn, and the chart replaces it.** The reason is Ethan's instruction: a real chart beats a sparkline at everything except fitting inside one cell, and the trend block no longer needs to. `SPARKLINE` stays available for a genuine per-row inline trend, and there is not one on this tab: no row of any block carries a series of its own. The note that the sparkline rendered as one blank cell in a connector read goes with it.

### 6A.10 The three charts

Built with the Apps Script chart builder, `sheet.newChart()` into `sheet.insertChart()`, anchored over a reserved band of blank rows. A chart is an **overlay** rather than a range: it does not consume cells, so the rows underneath it are deliberately empty, because anything written there would be hidden by the chart and invisible to a reader while still being counted by the error scan.

| Chart | Type | Data | Reads |
|---|---|---|---|
| 1 | column | `BY OFFICER` A, C and D, header row included | Due against done per committee, this week. A tall Due bar beside a short Done bar is the committee to chase. |
| 2 | bar | `TRACK RECORD` B and C, header row included | The fairness adjusted track record. A bar rather than a column, because fourteen officer names read straight along the vertical axis and do not need slanting. |
| 3 | line | `TREND` B, C and D, header row included | Week by week, oldest on the left, because the point is the shape over time. |

Each range **includes its own header row** and `setNumHeaders(1)` reads the series names out of it, so a legend says `Due` and `Done` rather than `Series 1` and `Series 2`.

**Every option is either a palette colour or Poppins**, because a chart is part of the workbook rather than a guest in it: series `#085040` and `#8a64a9`, the ranked chart `#5d4170` with no legend, gridlines `#e9ebd4`, all text `#58756a`, background `#F8FBFD`, title `#085040` at 13 point bold. 1,120 px wide by 330 px high, which fits inside the twelve columns and inside a 14 row band at 26 px.

**EVERY CHART IS REMOVED BEFORE ANY IS INSERTED.** `insertChart` appends: it has no by-name form and no replace form, so a build run twice would leave six charts stacked on three anchors, a build run three times nine, and **nothing on screen would say so** until the file was slow. `IS9WD_statsRemoveCharts_` removes every chart on the tab first, which is safe because the tab is script owned end to end and nothing else ever puts a chart on it. The self test asserts the count against the declared list, not against a number (13.4).

**A chart with no data yet is still inserted and still renders as an empty chart.** It is never a broken object and it is never skipped, because a missing chart looks like a missing feature. The **caption row above it** is a formula that says, in plain words, either what the chart is showing or what will fill it:

- chart 1, with nothing entered: `Nothing is entered for this week yet, so the chart below is empty. It fills the moment you enter deliverables on 02 | Deliverables.`
- chart 2, with nobody scored: `No officer has enough tasks past a deadline to be scored yet, so the chart below is empty. It fills as tasks pass their deadlines and are ticked off.`
- chart 3, with an empty archive: `No week has been archived yet, so the chart below is empty. Switch ARCHIVE_WEEK on, or run Archive this week from the IS9 Deliverables menu.`

Otherwise each one states what it is showing and, for chart 2 and chart 3, the caveat a reader would otherwise get wrong: a blank bar means too few tasks to judge rather than a score of zero, and `Accomplished` counts only retired tasks so it reads low until retirement runs. The self test fails on a blank caption.

### 6A.11 What was killed, and why

| Killed | Why |
|---|---|
| Total items ever, items created this term, lifetime accomplished | No action follows any of them. |
| Progress percentage per item | Out of scope, SPEC section 1. |
| Average items per committee | Punishes nothing, changes nothing. |
| Emails sent | Not available without giving the Log named ranges and a stable action string, and not actionable anyway. Replaced by `SCHEDULED JOBS` on `_Views`. |
| Busiest weekday, deadline distribution | Interesting, no action. |
| Age of the oldest open item | Subsumed. An old item with a far-future deadline is not yet late, so nothing follows. `Worst late` carries the actionable half. |
| A workload leaderboard by raw item count | Ranks the busiest committee last every week, by construction. Replaced by `On time`, 6A.8. |
| Per-officer sparklines | 112 `COUNTIFS` over a growing Archive, for a picture the connector cannot read. |
| The one trend sparkline | Replaced by chart 3, which does the same job better and larger. |
| `OPERATIONAL HEALTH` and `SCHEDULED JOBS` on this tab | Both are the machine reporting on itself: useful when something is wrong, noise on a dashboard. Moved to `_Views`, every named range intact. |
| The eight thresholds on this tab | Ethan's instruction: this tab is for viewing. Moved to `_Engine` (4B.7). |
| The hidden helper band, columns M to Y | Ethan's instruction: hidden helper columns move to a hidden tab where they are not in his way. Moved to `_Views`. |

### 6A.12 Error handling

The same rule as the feed and for the same reason: both tabs are inside the same connector read, and a blank caused by a broken named range is indistinguishable from a legitimately empty cell. **Every fallback is the visible sentinel `!ERR`**, except in the four places where blank is the contract: an unscored rank, an unused trend row, `No slide` on an officer who does not publish, and an officer with no items. Every cross-tab read of a feed cell is wrapped, so a feed that was never sized surfaces the sentinel rather than a bare `#NAME?`.

`C136`, named `IS9WD_STATS_ERRORS`: `=SUMPRODUCT(--ISERROR($A$1:$L$135))+SUMPRODUCT(--($A$1:$L$135="!ERR"))`. It stops one row short of the end row for the reason the feed's stops two short of its own: the count lives on that row and a scan over itself is circular. The first conditional format rule on the tab, before all others so it wins on any cell it touches, is `=A1="!ERR"` over the whole tab.

### 6A.13 Recalculation cost

| Block | Range reads per recalculation |
|---|---|
| The existing `Rank` column on the data tab, for comparison | about 560,000 |
| The eight tiles and the six sentence rows | about 30,000 |
| `BY OFFICER`, nine broadcast metric columns | about 250,000 |
| `BY OFFICER`, `Avg days` | about 84,000 |
| `BY OFFICER`, `On time` via `MMULT` | about 58,000 |
| `TREND` over the archive span | about 190,000 |
| `_Views` operational health | about 8,000 |
| `04 \| Officer Tables`, fourteen spills | about 224,000 |

**About 845,000 added against 560,000 today, so recalculation roughly doubles**, and every tick from a phone triggers it because the data tab changes. `setRecalculationInterval(HOUR)` bounds only the volatile date functions; these are change driven. **The figure is arithmetic and not a measurement**, which is why 13.3 adds a timing check. The three charts add nothing to it: a chart reads a range that is already computed. The cuts, in order, if it bites: `Avg days` first, then `IS9WD_STATS_TREND_WEEKS` from 8 to 4, and `On time` last, because it is the fair ranking and it is the reason the block exists.

---

## 6B. `04 | Officer Tables`

Fourteen **numbered sections**, one per directory entry, in hierarchy order: the President, the four EVPs, then the nine committees. Each is a heading carrying the section number, the officer, the position, the person and their counts, then a column header row, then their items. **The tab reads as a document**: a numbered heading tells you whose section you are in, how big it is and how far there is to go before you read a single row.

**It was empty before this revision, and that is what requirement 1 of 2026-09-27 was about.** The tab existed and the statistics build threw before reaching it, because a conditional format rule referenced a named range on another sheet, which Sheets refuses at the moment the rule is applied. The fix is 6A.7's: every named range inside every rule this module writes goes through `IS9WD_statsRuleName_` and comes out as `INDIRECT("NAME")`. The harness in 13.4 refuses a cross-sheet rule outright, so the class of bug cannot come back silently.

**This tab computes nothing that `03 | Statistics` already computes.** Every count in a heading is an `INDEX` into a named range on `_Views`, which is the rule 4B.8 already follows for the feed. One source, two views, and they cannot disagree. Those counts are the all-items window, which is why `IS9WD_STATS_OFF_ACTIVE_ALL`, `_DONE_ALL` and `_TOTAL` exist in the helper band, and the help line says so. It is also why this is the **last** of the three entry points: `_Views` first, then the dashboard, then this.

### 6B.1 Which items, and the sort

**Every titled item on the data tab for that officer, active first then accomplished, each group by deadline ascending then ID ascending.**

- **Every item, not a week window.** The data tab is already bounded by retirement, so "everything on it" means "everything current". A week window here would hide the overdue item from two weeks ago, which is the one thing Ethan most needs to see in a read-through.
- **Accomplished items show.** Hiding them makes the section look emptier than the week was, and they are the only visible evidence that a private link is being used at all, which matters when Ethan enters every item himself.
- **Deadline then ID is the `Rank` rule** (5.4), tie-broken on ID rather than on row position for exactly the same reason: a single sort of the data tab would otherwise silently reorder this tab with no data change. So **the order a human reads here equals the order Canva publishes**, which is worth having and is free.

### 6B.2 Columns

Seven visible, one hidden. Total 1,095 px, inside the laptop budget with room, which is what makes the missing frozen column a non-issue here (2.5).

| Col | Header | Width | Format |
|---|---|---|---|
| A | `Title of Task` | 360 | text, clip |
| B | `Deadline` | 110 | `ddd, mmm d`, right |
| C | `Days left` | 85 | `0;-0`, right |
| D | `Status` | 110 | text |
| E | `Flag` | 150 | text |
| F | `Remark` | 200 | text |
| G | `ID` | 80 | text, centre |
| H | the sort key | hidden | text |

Title first because it is the thing you read; the heading above already says whose section it is.

**Column H is the one hidden column left on a tab a person reads, and it is the one that cannot move to `_Views` with the others.** It is not a helper: it is the eighth column of the very `SORT` that produces the seven visible ones, so it has to sit beside them on the same rows of the same sheet. It is what makes the whole section one spilling formula, and it is what the muted rule reads. Recorded as a ruling in Appendix C.

### 6B.3 Row map

```
1                  Banner  04 | OFFICER TABLES                         h 46
2                  Help line                                           h 34
3                  Summary: what is not shown below                     h 26
4                  Spacer                                              h 18
then 14 sections, each of R + 3 rows, R = IS9WD_STATS_OFFICER_ROWS:
    heading row    the officer line, one formula, overflow wrap         h 38
    header row     the seven labels                                    h 30
    R - 1 rows     the items, one spilling formula in the first row     h 26
    1 row          the overflow notice, or blank                       h 26
    1 row          spacer                                              h 18
last row           IS9WD OFFICER TABLES END, and the error count in C   h 26
```

**Frozen rows 3**, so the banner, the help line and the summary stay on screen however far down the tab runs. That is the best available substitute for the banned frozen column and a better use of a frozen pane than column A would have been.

At the shipping `R = 21`: `3 + 1 + 14 * 24 + 1 = 341` rows, showing **20 items per officer**, which is the most any committee can publish, so nothing is ever hidden at the shipping setting. `R = 13` costs 229 rows and shows 12, and it is the value to set the day the connector read gets tight: one edit on `_Engine` plus one `Build or repair workbook`, and setup resizes every section and re-points every range.

**Variable-height sections were rejected.** Sizing each one to its officer's current count would mean setup rewriting the tab's layout whenever a count changed, and every section below moving when one officer gained an item. Fixed sections plus an explicit notice is the design that stays idempotent.

### 6B.4 How overflow is detected rather than hidden

Three mechanisms, because silent truncation is the failure this design most has to avoid. `ARRAY_CONSTRAIN` alone would have dropped the rest without a word.

1. **The notice row.** The spill is constrained to `R - 1` rows and the reserved row below it reads `+ n more not shown here. Raise Rows reserved per officer on _Engine, then run Build or repair workbook.` It takes the flag treatment when it is not blank.
2. **The heading states the true total**, so a heading reading 25 above 20 rows is visibly inconsistent even before the notice is read.
3. **Row 3 states it from the top**, naming every officer and the number hidden, so nobody has to scroll fourteen sections to find out that something was left out. It is inside the frozen pane.

The self test asserts all three together, and it asserts the arithmetic: the notice's number must equal `total - (R - 1)`, and no officer may show fewer rows than their total without a notice. **That is the anti-silent-truncation assertion** (13.4).

### 6B.5 The officer identity, and the heading line

Each heading row carries its officer's **hierarchy ordinal as a literal in hidden column H**, written once by setup, and every formula in the section reads it. This is the feed's `IS9WD_OFFICER_ORDINAL` device (6.4), and it is what lets fourteen structurally identical sections share one formula shape.

The heading is one formula, and it **opens with the section number**: `01 of 14`, then the officer and the position uppercased, then the person's name as typed, then `n to do`, `n done`, `n late`, then `n with no slide` when there is any, then `nothing entered yet` when the total is zero, then `n not shown below` when the total exceeds what fits. Overflow wrap, `#085040` fill across A to G, `#F8FBFD` text.

**The section number is what makes the tab a document rather than fourteen stripes.** It is the change requirement 1 of 2026-09-27 asked for in the words "it must look like a document rather than a dump": a reader always knows where they are and how far there is to go, which is the one thing a run of identical bars cannot tell them.

**One cell of text running across a filled span, no merge**, which is how the bar look is achieved without the connector printing `[merged]` repeats.

### 6B.6 The item spill

One formula per section, in the first item row's column A. Four things in it are load bearing.

- **The sort key is one column, not three sort arguments.** `0` or `1` for active or done, then the deadline serial zero padded to six digits, then the ID. One `SORT` argument, and the whole ordering rule is legible in one expression. A blank deadline gives `000000` and sorts first, which matches the feed's deliberate choice to put an item nobody can date at the top rather than buried (6.4).
- **Both computed columns are wrapped in `ARRAYFORMULA`.** `IF` and `&` do not broadcast over a range inside an array literal; without the wrapper each column collapses to a scalar, the `{}` literal fails on a size mismatch, and the section goes permanently and silently blank. This is the exact failure 6.4 documents for Block D.
- **The key is column 8 and hidden**, so the display columns are in reading order and no `CHOOSECOLS` is needed: classic functions only, matching every other formula in the workbook.
- **The `IF` on the total means one cell returns either a sentence or an array**, so an officer with nothing shows one muted sentence, `Nothing entered for this officer yet.`, rather than twenty blank banded rows, and does not need a second cell.

**Cost.** One `FILTER` plus `SORT` over 2,000 rows and 8 columns per section, about 16,000 range reads each and 224,000 for fourteen. The alternative, twenty rows of eight `INDEX/MATCH` lookups per section, is about 190,000 **per section** and 2.7 million for the tab. That is the whole argument for one spilling formula per section, and it is a factor of twelve.

### 6B.7 How an accomplished item is distinguished, without keying on a status label

The rule reads the **first character of the sort key**, which derives from `IS9WD_DEL_ACTIVE`, the derived flag:

```
=LEFT($H<first item row>,1)="1"   over  A<first>:G<last>   ->  muted #8b74a1
```

Muted foreground across all seven columns, no strikethrough, matching the Archive's treatment of a retired row so the workbook reads as one system. The `Status` column also carries the label as text, so the word is there for anyone who wants it, **as display and never as a key**. Renaming the status on `_Engine` changes nothing, which 13.3 checks.

Other rules per section: a blocking flag on `Flag`, then `Overdue` on `Flag`, both flagged, in that order so a row that is both reads as blocked; a negative `Days left` takes the accent, scoped to that column so it cannot collide with the flag rule; the notice row is flagged when it is not blank. Five rules per section plus the `!ERR` rule, 71 in all, written per section rather than as one multi-range rule per treatment, because a multi-range rule's relative anchor across fourteen ranges is undocumented and getting it wrong would mute the wrong rows on the tab whose muting is an acceptance check.

**Not one of the 71 rules reads a named range**, which is why this tab was the one that exposed the cross-sheet rule bug: everything it needs is a cell on the same sheet, so the bug arrived from `03 | Statistics` rather than from here.

Banding is applied per section over the item rows only, so a section reads as a table and the notice row and the spacer stay plain. That, plus the 38 px heading and the 18 px spacer, is what makes the tab read as a document rather than as a dump.

---

## 6C. `_Views`: the helper band, and the machine reporting on itself

Hidden, thirteen columns, script owned end to end, never typed into. It exists because of Ethan's instruction of 2026-09-27: hidden helper columns move to a hidden tab where they are not in his way. `IS9WD_Stats.js` owns it and `IS9WD_viewsResize_` is the **first** of that module's three entry points, because both visible views read it by name.

### 6C.1 Row map

| Rows | Block | Contents |
|---|---|---|
| 4 to 8 | `BUILD MARKERS` | band, hint, 3 rows |
| 10 to 26 | `OFFICER IDENTITY AND HELPERS` | band, hint, header, 14 rows, 13 columns |
| 28 to 44 | `RANKED SORT` | band, hint, header, 14 rows, 3 columns |
| 46 to 56 | `TREND HELPERS` | band, hint, header, 8 rows, 2 columns |
| 58 to 71 | `OPERATIONAL HEALTH` | band, hint, header, 11 rows, 4 columns |
| 73 to 80 | `SCHEDULED JOBS` | band, hint, header, 5 rows, 4 columns |
| 81 | `IS9WD VIEWS END`, the tab's own error count in C | |

Every block carries a band, a hint row and a header exactly as a visible tab's does, and the reason is not symmetry: a hidden tab is still a tab somebody will one day have to read in a hurry, probably a successor, and an unlabelled grid of thirteen broadcast formulas is unreadable to anyone who did not write it.

### 6C.2 `BUILD MARKERS`, rows 6 to 8

Three cells, and **two of them are the only numbers `IS9WD_Stats.js` ever writes into a cell**. They are addresses and guards rather than data: a layout setting raised without a rebuild would spill a row into a spacer and produce a `#REF!`, and the guard note beside the setting on `_Engine` compares the two and says so.

| Cell | Named range | What it is |
|---|---|---|
| B6 | `IS9WD_STATS_ELAPSED` | `=IF(IS9WD_EFFECTIVE_TODAY<IS9WD_WEEK_START,0,MIN(7,IS9WD_EFFECTIVE_TODAY-IS9WD_WEEK_START+1))`. On Sunday the week starts tomorrow, so elapsed is 0 and nothing can be behind pace, which is correct. |
| B7 | `IS9WD_STATS_TREND_BUILT` | the trend row count setup actually built |
| B8 | `IS9WD_OT_ROWS_BUILT` | the reserved row count `04 \| Officer Tables` was actually built with |

`IS9WD_OT_ROWS_BUILT` used to live in the hidden column of `04 | Officer Tables`. It is here now with the other two markers, which changes nothing: both the guard note and the officer tables' own formulas read it by name.

### 6C.3 `OFFICER IDENTITY AND HELPERS`, rows 13 to 26

One spilling sort into A to E, then eight broadcast formulas in F to M.

```
A13 =IFERROR(ARRAY_CONSTRAIN(SORT(FILTER(
       {IS9WD_DIR_NAME,IS9WD_DIR_VP,IS9WD_DIR_POSITION,IS9WD_DIR_CAROUSEL,IS9WD_DIR_HIERARCHY},
       IS9WD_DIR_KEY<>""),5,TRUE),14,5),"!ERR")
```

**That array literal combines three columns from `00 | Configuration` with two from `_Engine`, and it is legal because all five are the same height.** It is also the reason the directory could be split across two tabs at all: without a cross-sheet array literal, the identity sort would have needed a join.

| Col | Named range | What it is |
|---|---|---|
| A | `IS9WD_STATS_OFF_SORTNAME` | the sort's own first column, which the dashboard's column A points at |
| B to E | `_VP`, `_POSITION`, `_CAROUSEL`, `_HIER` | the rest of the sort |
| F | `_LOAD` | `Due` plus `Done` this week |
| G | `_FIRSTDUE` | `MINIFS` over active titled deadlines |
| H | `_LASTTICK` | `MAXIFS` over `Status at` |
| I | `_SILENT_N` | days since the last tick, or `9999` |
| J | `_BLOCKING` | every non-blank `Check` minus `Overdue` |
| K, L, M | `_ACTIVE_ALL`, `_DONE_ALL`, `_TOTAL` | the all-items window `04 \| Officer Tables` reads |

`_SILENT_N` uses `9999` rather than blank so silence can be compared numerically without a text guard. `_BLOCKING` counts per officer **without restating the eight flag names**: `"?*"` counts every non-blank `Check` and `Overdue` is subtracted, so it stays correct the day a ninth flag is added.

**`MINIFS` and `MAXIFS` are the only two spreadsheet functions this workbook asks to broadcast under `ARRAYFORMULA` whose array-criterion behaviour is not documented.** If either returns a scalar instead, all fourteen rows quietly take the first officer's answer and nothing else notices, so the self test recomputes `_FIRSTDUE` from the items and compares (13.4).

### 6C.4 `RANKED SORT` and `TREND HELPERS`

The ranked sort is one spill of three columns, `IS9WD_STATS_RANK_KEY`, `_SCORE` and `_JUDGED`, with the `-1` substitution 6A.8 explains. The trend helpers are `IS9WD_STATS_TRENDMONDAY`, generated by `SEQUENCE` from `IS9WD_WEEK_START` backwards, and `IS9WD_STATS_TRENDTERM`, that week's own trimester start.

### 6C.5 `OPERATIONAL HEALTH`, rows 61 to 71

Label in A, value in B, reading in C, and a flag boolean in D that **one** conditional format rule reads: one rule instead of eleven scoped rules, and each row still owns its own threshold in its own formula. Rows: `Ready for Canva`, `Carousel pages this week`, `Export page list`, `Master pages required`, `Automation last run`, `Automation and test mode`, `Last self test`, `Mail quota at the last run`, `Overrides, and the links`, `Rows used of 2000`, and `Weeks of row room left`.

Four of them are worth a note.

- **`Automation last run`** flags when the cell holds no timestamp at all or when the timestamp is more than two hours old, because the trigger is hourly (8.1).
- **`Last self test`** tests the summary line for the phrase the self test writes when something failed. That phrase is declared once, in `IS9WD_Config.js`, and both files read it from there: two copies of it are two strings that drift, and the drift would read as a healthy self test on the row whose job is to say otherwise.
- **`Master pages required`** is never flagged, and takes the accent instead. A formula cannot know how many pages the Canva master physically holds, so a test against a number in code would be either always true or always false. What it can do is print the number the master must reach and say that raising a capacity number needs a master rebuild before it can be used (6.3).
- **`Rows used of 2000` and `Weeks of row room left`** are the two that matter most. 10.1's planning figure fills 2,000 rows in about seven weeks at 280 items a week, and these turn that from a paragraph in a document into a number on a screen with weeks on it. The second is `=ROUND(free rows / (items created in the last 28 days / 4),0)` and flags below `IS9WD_STATS_ROOM_WEEKS_WARN`. `IS9WD_STATS_ROOM_WEEKS` is the named range the self test reads.

**Why the whole block is on a hidden tab rather than on the dashboard.** It is the machine reporting on itself: every row of it is useful on the morning something is wrong and none of it is what a president looks at before Sunday. Ethan's instruction was that the dashboard is for viewing KPIs and charts, and eleven rows of plumbing on it is the opposite of that. Nothing was lost: every named range is intact, the self test reads them, and the Sunday brief can print them.

### 6C.6 `SCHEDULED JOBS`, rows 76 to 80

Four spills out of `IS9WD_SCHEDULE` itself, using `INDEX(range,0,col)` to take a whole column of a multi-column named range: `Job key`, `Last run`, `On`, `Last status`. The order puts `Last run` second against the reading order elsewhere, because a timestamp needs 210 px and the value has to sit where it fits. A failed run takes the flag treatment and a job switched off is muted, because off is superseded and not broken.

**This block is what replaces "emails sent".** Whether the Monday job ran and whether it failed is actionable; how many messages it sent is not, and counting them would mean giving `06 | Log` named ranges and depending on a stable action string.

### 6C.7 Error handling

The same rule as the other two views: every fallback is `!ERR`, and `C81`, named `IS9WD_VIEWS_ERRORS`, counts both errors and sentinels over `A1:M80`. The self test fails on a non-zero count and names `Checks > Rebuild the views` as the fix, because that is the one action that rebuilds this tab on its own.

---

## 7. The app

One React plus Vite application, written and maintained by Claude Code in `app/`. Each of the 14 people opens a private unguessable token link. There is no Google sign-in.

### 7.1 Cross-origin calls to `/exec`, measured on 2026-09-27

This was the one genuine unknown in the design. It is now **measured fact**. On **2026-09-27** Claude ran the spike live: a page served from `https://example.com` calling a real `/exec` deployment on Ethan's DLSU account, access `Anyone`, execute as owner. What was measured, and these are results rather than expectations:

**The measurement ran in a desktop Chromium browser.** That is the scope of the fact. **iOS Safari and Android Chrome are unverified**, and they are the clients that actually matter, since every one of the 13 link holders opens this on a phone. Safari's CORS and redirect handling is the one plausible place this differs, and a difference there breaks every write for a phone user while working perfectly on the laptop it was tested on. So the phone check stays in the build, as an `[ethan]` item inside Phase 5 (13.3), and the browser versions go in `docs/CORS-MEASUREMENT.md` next to the desktop result.

| Request | Measured 2026-09-27 |
|---|---|
| `GET` with query parameters | **Works.** `response.type` is `cors`, the 302 to `script.googleusercontent.com` is followed automatically, the JSON body is readable, and the query parameters arrive intact. |
| `POST` with `Content-Type: text/plain` (a `charset` suffix is fine) | **Works.** `e.postData.contents` arrives intact. |
| `POST` with `Content-Type: application/json` | **Fails**, `TypeError: Failed to fetch`. The request is preflighted and Apps Script has no `doOptions` to answer the OPTIONS. |
| Any custom request header, for example `X-Token` | **Fails** the same way, for the same reason. |

Consequences, and none of them is negotiable:

- **Every call is a POST with `Content-Type: text/plain` carrying a JSON string body.** That is the only combination Apps Script can serve without a preflight.
- **No custom request header anywhere, on any call, ever.** One added header breaks every write for all 14 people at once, with a browser-level `TypeError` rather than an envelope the app can read.
- **The token travels in the POST body.** Never in the URL, never in a header.

The measurement confirms SHEETBACKEDREACT5 (MDN's simple-request rule) and SHEETBACKEDREACT6 (no `doOptions`, so a preflighted request has nothing to answer it), and it settles SHEETBACKEDREACT10, which had recorded that no Google documentation states whether this works. The widely copied `setHeaders` plus `doOptions` advice (SHEETBACKEDREACT3) is still wrong, and `TextOutput` still has no `setHeaders` (SHEETBACKEDREACT2). SHEETBACKEDREACT8 still holds and still matters: `*` is illegal on a credentialed request, so no cookie or Google session ever reaches the endpoint and the token is the only identity, which is what 11 accepts.

**Shape A is therefore the decided shape** (7.2), not a gated one. Shape B is kept only as a disaster fallback and is not built (7.7). The exact requests, response headers and browser versions go in `docs/CORS-MEASUREMENT.md`, and 13.3 keeps the re-check that proves the behaviour has not changed under us.

### 7.2 Shape A, decided: static hosting plus a JSON endpoint

- The React bundle is built by Vite and served as static files from **GitHub Pages**, out of the public repo in the IS9 organisation `is9-dlsu` (2.6).
- Every call is a **POST** with `Content-Type: text/plain;charset=utf-8` and a JSON string body. Measured working 2026-09-27 (7.1).
- `credentials: 'omit'`, **no custom headers**, `redirect: 'follow'`. The 302 to `script.googleusercontent.com` is followed as a GET; the script already executed at `/exec` and the redirect only serves the result (SHEETBACKEDREACT7). Measured: the redirect is followed automatically and the body is readable.
- Token goes in the POST body, never in a URL and never in a header.
- `doGet` exists only for `?action=ping`.

**The endpoint URL reaches the bundle through a build variable, never a committed file.** A static bundle cannot read `00 | Configuration` before it has an endpoint to call, so `VITE_IS9WD_ENDPOINT` is a GitHub Actions repository variable, read at build time by `.github/workflows/pages.yml`. It is not committed, because the repo is public (2.6). The same value is pasted into `IS9WD_ENDPOINT_URL` so the emails and `IS9WD_linkFor_()` agree with the bundle, and 13.3 checks that they do. A redeploy that changes the `/exec` URL therefore means three steps in one sitting: paste the new URL into Configuration, update the repository variable, rebuild. There is no GET fallback and no `?p=<json>` variant: POST is measured working, so the token never has to enter a URL.

Why GitHub Pages and not the alternatives, all verified:

| Host | Why not |
|---|---|
| Vercel Hobby | Cannot connect a Hobby project to a repo owned by a GitHub organisation (SHEETBACKEDREACT22), and Hobby is non-commercial personal use only (SHEETBACKEDREACT21). |
| Cloudflare Pages | No documented account-to-account project transfer (SHEETBACKEDREACT20), and Cloudflare says start new projects on Workers (SHEETBACKEDREACT19). |
| Lovable plus Supabase | Rejected. Two more platforms in the handover chain, and the Supabase free project pauses on inactivity, which is exactly what happens around a turnover. |

GitHub Pages terms that bind this build (SHEETBACKEDREACT15): source repo recommended under 1 GB, published site under 1 GB, soft 100 GB per month bandwidth, soft 10 builds per hour, not free hosting for a commercial business, and not for sensitive transactions such as sending passwords. A tracker with 14 people is comfortably inside all of it. The token in the fragment is not a password and never crosses GitHub's servers, but see section 11.

### 7.3 Tokens

- **Length and alphabet:** 26 characters from the 32-character lowercase Crockford Base32 alphabet `0123456789abcdefghjkmnpqrstvwxyz` (no `i`, `l`, `o`, `u`, so nothing is misread aloud or in a screenshot).
- **Generation, explicit:** call `Utilities.getUuid()` twice, strip hyphens, concatenate to 64 hex characters, parse **32 bytes** with `parseInt(hex.substr(i*2,2),16)`, and map the first 26 bytes through `alphabet[byte % 32]`. 256 mod 32 is 0, so the mapping is unbiased for uniform bytes. Honest entropy: 130 bits of output width drawn from about 122 bits of UUIDv4 randomness, since UUIDv4 fixes the version and variant nibbles. Do **not** map hex characters directly: `charCodeAt(i) % 32` over 26 hex characters reaches only 16 of the 32 symbols.
- **Storage: Script Properties, never a Sheet cell.** One key per directory row that holds a token, `IS9WD_TOKEN_<key>` from the directory `Key` column, plus `IS9WD_TOKEN_ADMIN`. So `IS9WD_TOKEN_K01` to `IS9WD_TOKEN_K09` and `IS9WD_TOKEN_K11` to `IS9WD_TOKEN_K14`, thirteen member tokens, plus the admin token: **fourteen tokens for fourteen people**, because `K10` is Ethan's own row and he carries the admin token (4.8). The key is the directory key and not the page number, because five of the 14 rows have no page. The directory holds only the first 6 characters plus the issue date, for identification. This is not cosmetic: the Drive connector returns **every tab as markdown into a claude.ai chat context** every Sunday, whichever account reads it, so a token in any cell, on any tab, hidden or not, would be pulled into a chat as a side effect of reading the feed. If the fallback Viewer share of 2.2 is ever needed, a Viewer can read Configuration too. The admin token in particular reaches `addItem`, `editItem`, `deleteItem`, `setSignoff` and `rotateToken`.
- Setup writes a token for any directory row that has none, **except `K10`**, and **never** overwrites an existing one, so `Build or repair workbook` can never invalidate a link someone already holds.
- `Rotate a link` writes a fresh token for one directory row and stamps `Token issued`. `Rotate every link` does all 13 member tokens plus the admin token. Both log the old token's first 6 characters, never the whole value.
- `Revoke a link` checks `Revoked`, which refuses the token immediately while leaving the prefix readable.
- **Resolution has a format precondition.** Reject before comparing: if the submitted token does not match `/^[0-9a-hjkmnp-tv-z]{26}$/`, return null, and skip any stored value that does not match the same pattern. Without it a whitespace-only token trims to `""` and matches any missing stored value, authenticating as a committee, or as admin, against a world-reachable endpoint. Comparison is exact equality after `trim()` and `toLowerCase()`; over a network the timing signal is noise, so no constant-time compare is needed.
- A copy of the Sheet copies the bound script and its properties, so **after copying the file, run `Rotate every link`.**
- Tokens are not secrets a link holder can be expected to protect. They go out by email and live in inboxes and browser history. Section 11.

### 7.4 Data contract

Version field `v` is `1`. The wire role value for a directory link is **`member`**. It was `vp` in an earlier draft and is renamed here: all 14 entries carry one, four of them are EVPs and one is the President, so `vp` named the wrong thing, and no app code exists yet, which makes the rename free today and expensive in a month. `admin` is the separate admin token, and it is the only token Ethan holds (7.3). The section 6 contract names do **not** change with it: the feed field is still `VP line`, the Core function is still `IS9WD_vpLine`, and the named range is still `IS9WD_DIR_VP`, because those are frozen contract and range names (6, 4.8).

**Request envelope** (the POST body):

```json
{
  "v": 1,
  "action": "setStatus",
  "token": "<26 char member token>",
  "requestId": "f81d4fae7dec11d0a76500a0c91e6bf6",
  "payload": { "id": "D0007", "status": "Accomplished" }
}
```

- `requestId` is client generated as `crypto.randomUUID()` with hyphens stripped, validated server side against `/^[0-9a-f]{32}$/`, else `VALIDATION`.
- **Idempotency is scoped to the caller and is durable.** The cache key is `IS9WD_RQ_` plus the first 16 hex of an MD5 of the token plus `_` plus the `requestId`, so a replay can only ever return the same caller's own result. A key on the requestId alone would hand one caller another caller's cached envelope, which for every write carries the whole committee state and for `rotateToken` carries a fresh token: a member would read admin data without passing a role check, because dedupe short-circuits ahead of the action. The requestId is also recorded in Document Properties **inside the same document lock as the write, before it is released**, so an execution that dies between the write and the cache put cannot double-write on retry.
- There is no `appVersion` and no minimum-version gate. The server re-derives every contract string on every write, so the gate guarded little and it interacted badly with a cached service-worker shell: once the minimum rose, a member could be locked out with "pull down to refresh", which does not bypass a cached shell.

**Success envelope**

```json
{ "v": 1, "ok": true, "action": "setStatus",
  "serverTime": "2026-09-27T19:04:11+08:00", "data": { } }
```

**Error envelope**

```json
{ "v": 1, "ok": false, "action": "addItem",
  "serverTime": "2026-09-27T19:04:11+08:00",
  "error": { "code": "VALIDATION", "message": "Deadline must be a date." } }
```

**Every response from every entry point in both shapes is one of these two envelopes, with no exceptions, including `ping` and `APP_OFF`.** The endpoint always returns HTTP 200 and never uses a status code to signal a domain error, because a cross-origin fetch cannot read a body on some error statuses and the app would lose the message.

**Actions**

| Action | Role | Writes | Payload | Returns in `data` |
|---|---|---|---|---|
| `ping` | none | no | none | `{ "appOn": true, "transport": "fetch" }` |
| `state` | admin, member | no | none | see below |
| `setStatus` | admin, member | yes | `{ "id": "D0007", "status": "Accomplished" }` | `{ "item": Item, "committee": CommitteeState }` |
| `addItem` | admin | yes | `{ "committee", "title", "deadline", "remark" }` | `{ "item", "committee" }` |
| `editItem` | admin | yes | `{ "id", "committee", "title", "deadline", "remark" }` | `{ "item", "committee" }` |
| `deleteItem` | admin | yes | `{ "id": "D0007" }` | `{ "id", "committee" }` |
| `rotateToken` | admin | yes | `{ "key": "K01" }` | `{ "key", "committee", "link" }` |
| `setSignoff` | admin | yes | `{ "weekStart", "preparedName", "preparedPosition", "checkedName", "checkedPosition" }` | `{ "signoff", "readiness" }` |

`setSignoff` writes or replaces one row of the weekly sign-off store (4.5) and stamps `Set at`. `weekStart` must match `/^\d{4}-\d{2}-\d{2}$/` and must be a Monday, else `VALIDATION`; a week other than the current one is allowed, because a correction to last week's published carousel is a real case and the Archive keeps that row. It returns the recomputed `readiness` string so the admin view can show the gate clearing in the same round trip.

Every write returns the affected committee's whole recomputed state, so the app never guesses what the slot numbers became.

**Dates, both directions, pinned.** Inbound `deadline` must match `/^\d{4}-\d{2}-\d{2}$/` and is constructed as `new Date(y, m-1, d)` in the script time zone. Never `new Date(iso)`: that parses as UTC midnight and lands as 08:00 in an Asia/Manila spreadsheet, which then fails the script's own "no time component" rule or writes a datetime that breaks the `ddd, mmm d` display and every `< IS9WD_WEEK_START` comparison. Outbound is `Utilities.formatDate(value, 'Asia/Manila', 'yyyy-MM-dd')`.

**`Item`**

```json
{
  "id": "D0007", "committee": "Partnerships",
  "rank": 1, "part": 1, "slot": "01", "page": "02", "published": true,
  "title": "Confirm speaker for Debt Traps Exposed",
  "deadline": "2026-09-21", "deadlineText": "Due Mon, Sep 21",
  "remark": "Send final name to Publication",
  "remarkText": "\u00b7  Send final name to Publication",
  "window": "W1", "stationHex": "#e9ebd4", "numberTextHex": "#1C2120",
  "status": "Open", "active": true,
  "statusAt": "", "statusBy": "", "flag": ""
}
```

`rank`, `part`, `slot`, `page` and `published` mirror the five derived columns on the data tab (5.1) and are computed by the same Core functions the feed formulas mirror, never by the browser. `published` is FALSE in exactly the cases where `page` is blank: the committee does not publish, the item is not active and titled, or it ranks past `IS9WD_PUBLISH_MAX`. The app reads `published` and never infers it from a blank page, because a blank field and a false flag are two different bugs.

`active` is the only status derivative the app needs: the checklist model has two statuses and one terminal flag, so a numeric `statusIndex` carried a position in a list that nothing reads, and a second representation of the same fact is a second thing to keep in step. The label itself is in `status`, and the label set with its colors is in `statuses` on the `state` payload.

`deadlineText` and `remarkText` come from `IS9WD_Core.js`, the same functions the feed formulas mirror. The app renders them and never builds them.

**`state` data, member role**

```json
{
  "role": "member", "appOn": true,
  "statuses": [ { "name": "Open", "terminal": false, "hex": "#e9ebd4", "textHex": "#1C2120" },
                { "name": "Accomplished", "terminal": true, "hex": "#085040", "textHex": "#F8FBFD" } ],
  "undoSeconds": 60,
  "week": { "number": "04", "start": "2026-09-21", "end": "2026-09-27",
            "line": "WEEK 04  |  SEP 21 TO 27  |  A.Y. 2026 - 2027",
            "inTerm": true, "term": "Term 1",
            "cutoffText": "Saturday 8 PM before the week starts" },
  "committee": { "page": "02", "name": "Partnerships", "headline": "PARTNERSHIPS",
    "publishes": true, "carouselOrder": 1, "pages": 1,
    "vpLine": "JUAN DELA CRUZ  |  VICE PRESIDENT",
    "tagline": "WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 21 TO 27  |  10 TASKS",
    "activeCount": 10, "publishedCount": 10, "publishMax": 20, "notPublished": 0,
    "slotsPerPage": 10, "maxParts": 2,
    "nextDueText": "Next due Mon, Sep 21",
    "items": [ "...Item..." ], "recentlyAccomplished": [ "...Item..." ] }
}
```

`activeCount`, `publishedCount` and `notPublished` replace v1's `openCount`, `maxOpen` and `atCap`. There is no cap to be at (5.4), so there is no boolean for being at it; what the view needs is how many items there are, how many reach the carousel, and how many do not. `publishes` is FALSE for the President and the four EVPs, and their card says their items are tracked and emailed but not published, which is a sentence rather than a warning.

`statuses` comes from the Configuration block, so nothing in the app needs a rebuild when a label changes, and `undoSeconds` comes from `IS9WD_UNDO_SECONDS` so the app can dim the untick control at the right moment. The server decides the window regardless of what the app shows (7.5). `recentlyAccomplished` covers the last 14 days, so a mistaken tick is visible.

**`state` data, admin role** adds `committees` (all 14 directory entries in **hierarchy order**, 4.8), `readiness`, `flags` (page, committee, slot, id, title, flag), `links` (key, committee, name, email, revoked, tokenAgeDays, link), `signoff`, `carousel` and `diagnostics` (lastHeartbeat, mailQuotaLeft, testMode, automationOn, transport, rowsUsed, todayOverride, weekNumberOverride).

`carousel` is what the admin view needs to show the week's shape without opening the Sheet: `{ "pages", "exportPageList", "masterPagesRequired", "itemsNotPublished", "capacityCheck", "planCheck", "flagListCheck" }`, every value read from Block A rather than recomputed (6.4). `readiness` carries the named blocking reasons, so the readiness card can list them in the order 6.4 gates them.

`signoff` carries what the sign-off card needs and nothing more: `{ "weekStart", "set", "preparedName", "preparedPosition", "checkedName", "checkedPosition", "setAt", "previous": { the same five fields for the prior week }, "directory": [ { "key", "name", "positionLabel" } ] }`. `directory` is the picker's list, all 14 entries with the position label to prefill (4.5). `previous` is the prefill convenience and is never treated as set.

`links` and `signoff` are admin-only and never present in a member-link response. A member-link response contains no other committee's or office's name, count or token, so a leaked payload discloses nothing beyond that one committee.

**Error codes**

| Code | Meaning | What the app shows |
|---|---|---|
| `APP_OFF` | `IS9WD_APP_ON` is FALSE | `The tracker is closed right now. Ask Ethan.` |
| `BAD_TOKEN` | token missing, malformed or unknown | `This link is not recognized. Ask Ethan for a new one.` |
| `REVOKED` | token found, `Revoked` checked | `This link has been replaced. Ask Ethan for the new one.` |
| `NOT_ALLOWED` | a `member` token called an admin action | `You cannot do that from this link.` |
| `VALIDATION` | a field broke a 5.1 rule; `message` names the field | the message, inline on the field |
| `NO_CHANGE` | the item already has that status | `Already ticked off on Sat, Sep 19.` |
| `NOT_FOUND` | no row with that id, **or an id the caller may not act on** | `That item is gone. Refreshing.` then reload state |
| `LOCKED` | document lock not acquired in 30 s | `Someone else is saving right now. Try again in a moment.` |
| `RATE_LIMITED` | see 7.6 | `Too many requests. Wait a minute.` |
| `UNDO_EXPIRED` | a `member` link tried to untick an item past `IS9WD_UNDO_SECONDS` | `The undo window has passed. Ask Ethan to reopen it.` |
| `OUT_OF_TERM` | write attempted with `IS9WD_IN_TERM` FALSE | `The term calendar says we are between trimesters. Ask Ethan.` |
| `SERVER_ERROR` | anything thrown | `Something went wrong. Ethan has been told.` |

**`CAP_REACHED` is gone**, with the cap it enforced (5.4). Nothing in the endpoint counts a committee's items before allowing another one, `addItem` and `editItem` no longer refuse on a count, and an untick is refused only by the undo window. Any client still handling `CAP_REACHED` is a client written against v1.

`NOT_FOUND` covers "exists but belongs to another committee or office" deliberately. Distinguishing it from `NOT_ALLOWED` would let a member link holder walk the sequential ID space and learn how many items exist across all 14 entries and which IDs are live, which contradicts section 11's promise that a token reaches exactly one committee. The attempt is still logged. `NOT_ALLOWED` is now strictly a role failure.

`NETWORK` is client only and never sent by the server: the app raises it when fetch rejects and shows `No connection. Your change was not saved.`

### 7.5 Server side

`IS9WD_Api.js` exposes exactly three non-underscore globals: `doGet`, `doPost`, `IS9WD_rpc`. Everything else ends in `_` (2.5).

- `doPost(e)` **rejects before parsing** when `e.postData.contents.length` exceeds 8192 bytes. After parsing it requires `v === 1` and `action` to be one of the eight names in 7.4, and it builds every write from **named fields only**, never by copying the payload object.
- `IS9WD_routeDecision_(req, ctx)` is a **pure** function in Core that returns an ordered plan, so the riskiest ordering in the build is unit tested (13.1). `IS9WD_route_` is thin glue over `LockService`, `CacheService` and `SpreadsheetApp`.
- Order, and it matters: (1) size and shape, (2) token **format**, (3) rate limit from cache, (4) resolve token, (5) `IS9WD_APP_ON`, (6) role, (7) term, (8) dedupe, (9) `LockService.getDocumentLock().tryLock(30000)` for every write, released in a `finally`, (10) act, (11) log. Steps 1 to 3 touch no `SpreadsheetApp` at all, so a bad-token flood cannot make the owner's own quotas pay for spreadsheet reads before the throttle is consulted. The directory and the switch block are cached in `CacheService` for 60 seconds, so a normal resolution costs no Sheet read.
- **The request path never throws out of `doPost`, `doGet` or `IS9WD_rpc`.** It always returns an envelope. One try/catch returns `SERVER_ERROR` and calls `IS9WD_alertOnce_`, which sends and **returns**. Only trigger jobs use `IS9WD_alertAndThrow_` (8.5d). A shared rethrowing helper would make Apps Script return its own HTML error page, the client's `JSON.parse` would throw, the typed error map would never run, and the optimistic rollback would never fire.
- **Server-side validation repeats every sheet rule**, because a sheet data validation does not apply to a code write: title non-empty and 40 or fewer characters, remark 30 or fewer, deadline a real date with no time component, committee present in the directory, status present in `IS9WD_STATUS_LIST`, `weekStart` a Monday for `setSignoff`, sign-off names 60 characters or fewer and positions 40 or fewer, and the item's committee equal to the caller's committee for a `member`. **There is no count check**: the cap is gone (5.4), so the write path no longer re-reads the committee inside the lock to count it, which also removes one Sheet read from every add.
- **Every inbound `title`, `remark` and sign-off name or position is normalized before it is written**: outer whitespace trimmed, and every line break and tab collapsed to a single space. This happens on the way in, once, so that no composed contract string ever needs a `TRIM` around it. That matters more than it sounds: `TRIM` inside a section 6 string would also collapse the double spaces the contract requires around every `  |  `, so the fix has to be upstream of composition or it breaks the thing it protects. A pasted cell can still carry a line break past this path, which is why `IS9WD_selfTest()` checks for one (13.4).
- `setStatus` is idempotent: the same status returns `NO_CHANGE` and writes nothing.
- **The undo window is enforced here, never in the app.** A `member` link may set `Accomplished` on its own item at any time, and may set `Open` again only while the server clock minus the item's stored `Status at` is under `IS9WD_UNDO_SECONDS`. Past that it gets `UNDO_EXPIRED`. The admin token is not bound by the window, which is what makes Ethan the only one who can reopen an older item. Reading `Status at` from the sheet rather than trusting the request means a reload, a second device, a replayed `requestId` or a wrong client clock cannot widen the window. An untick is never refused for a count: there is no cap (5.4), so the only refusals on an untick are the undo window, the term gate and the role check.
- `setStatus` writes `Status by` as the directory `Full name` for the link that was used, `Admin` when the admin token was used. There is no way to know which human held the link.

### 7.6 Rate limiting

`CacheService.getScriptCache()`, since `ANYONE_ANONYMOUS` gives no IP to key on:

- Per token, member or admin alike: key `IS9WD_RL_` plus the first 16 hex of an MD5 of the token, 60-second window, 60 reads or 20 writes, then `RATE_LIMITED`.
- Bad tokens: key `IS9WD_RL_BAD`, 600-second window. **One aggregated `Bad token flood` log row per window**, never one row per bad request, plus one alert a day. A log row per anonymous request would be a Sheet write per stranger, and `06 | Log` only gets trimmed hourly.

Cache counters are not atomic, so the limits are approximate. There is nothing to block: `ANYONE_ANONYMOUS` means the `/exec` URL is reachable by anyone and only the token gates content. This is a throttle, not a door.

### 7.7 Shape B, the disaster fallback, not built

Shape B served the same React bundle from Apps Script itself, inlined into one `App.html`, with `google.script.run` as the transport instead of `fetch`. The 7.1 measurement removed its reason to exist, so **it is not built**: no `IS9WD_Serve.js`, no `App.html`, no `tools/build-gsrun.mjs`, no `transport.gsrun.ts`, and `IS9WD_TRANSPORT` reads `fetch`. It stays on the record in one paragraph because it is the only route that survives a future in which cross-origin POST stops working, and because three of its findings are worth keeping either way. What it would cost: no home-screen install and no service worker, since HtmlService serves inside a sandboxed iframe (WEBAPP21, SHEETBACKEDREACT23); no offline read; the token in a query string on first load, therefore in Google's own logs, which `history.replaceState` hides but does not un-log (section 11 risk 4); `target="_blank"` on every link, because a bound project is not granted `allow-top-navigation-by-user-activation`; only `viewport`, `mobile-web-app-capable`, `apple-mobile-web-app-capable` and `google-site-verification` as meta tags, and only through `addMetaTag` (WEBAPP22); and roughly 400 to 1500 ms per round trip (SHEETBACKEDREACT24). What it would gain: same origin, and one less account in the handover chain. Two implementation notes, recorded so nobody rediscovers them under pressure: the bootstrap JSON must be escaped for `<`, `>`, `&`, U+2028 and U+2029 before it is injected, because `JSON.stringify` escapes none of them and one remark containing `</script>` would end the script element before any React code runs, with no error path; and `google.script.run` exposes every server global, which is why the 2.5 underscore rule and `IS9WD_assertUiContext_()` stay in the build even though nothing calls `IS9WD_rpc` today.

**Conditions on ever shipping Shape B.** These are not acceptance checks for this build, because there is nothing to run them against, and a check that cannot be executed does not belong in 13.3. They are the gate anyone must pass before the fallback goes live: from a token-less page, `google.script.run.IS9WD_menuRotateAll()` and `google.script.run.IS9WD_sendMondayAssignments_()` must both fail, write nothing and send nothing; a bootstrap payload containing `</script>` and U+2028 must still boot; and no token may remain in the visible URL after first paint. Taking the fallback also re-accepts risk 4 in section 11.

**What Shape A keeps from that design.** One transport module, `app/src/lib/transport.ts`, whose only export is `call<A extends Action>(action, payload): Promise<DataOf<A>>` and which throws a typed `ApiError` carrying `code` and `message`. No component calls `fetch` directly and no component reads `location.hash`; `useToken()` does. The wire call is `fetch(endpoint, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(req), credentials:'omit'})`, with the endpoint from `VITE_IS9WD_ENDPOINT` (7.2) and no other header. Output is `app/dist/`, published by `.github/workflows/pages.yml`. Vite `base` is `process.env.VITE_IS9WD_BASE ?? './'`, never the repo name hardcoded, because a rename or a transfer to the IS9 organisation would otherwise 404 every asset until someone edited `vite.config` and rebuilt; handover step 4 says to rebuild. The service worker and manifest are registered in one file, and the worker is **network-first for `index.html` and the asset manifest**, with an `updatefound` handler that calls `skipWaiting()` and reloads, so a stale shell can never strand anyone. Handover pieces in Shape A: Sheet, script, deployment, GitHub repo, Pages URL.

**There is no offline write queue.** It was the most expensive and least valuable thing in the design: the whole user benefit is that someone who taps a checkbox in a lift need not tap again, and against that it bought a replay path that could duplicate an `addItem`, a queue that had to survive token rotation, item deletion and cap changes between enqueue and replay, and a second reconciliation path with its own tests. A failed write rolls back with `No connection. Your change was not saved.` The service worker stays, for the shell and the last read, which is what earns the home-screen install that motivates Shape A at all.

### 7.8 React app: routes, components, views

Hash routing, so GitHub Pages never rewrites a deep path and the token stays in the fragment.

| Route | Component | Who |
|---|---|---|
| `#/` | `LandingRoute` | nobody: `This link is not recognized. Ask Ethan for a new one.` |
| `#/m/:token` | `MemberRoute` | any of the 13 member links |
| `#/a/:token` | `AdminRoute` | Ethan |
| `#/health` | `HealthRoute` | anyone: build hash, transport mode, `ping` result, last latency. No token, no data. |

```
main.tsx
App.tsx                      router, error boundary, theme
lib/  transport.ts  types.ts  errors.ts  useToken.ts  useTracker.ts
components/  AppShell  WeekBanner  CommitteeHeader  ItemList  ItemRow
      DoneCheck  ConfirmSheet  AccomplishedList  ItemForm
      CommitteePicker  ReadinessCard  FlagList  LinkManager
      SignoffCard  Toast  ErrorState  EmptyState  Skeleton
routes/  LandingRoute  MemberRoute  AdminRoute  HealthRoute
```

The member route is `#/m/`, not `#/v/`. Nothing has shipped, so there is no old path to redirect and no link in anyone's inbox to break. `IS9WD_linkFor_()` is the only place the path is written (4.8), so this is one string in one function.

**Member view** (`#/m/:token`, any of the 13). Committee or office headline, the person's line, week line, cutoff text. Their own active items in rank order, each with the item number on a chip in its station color, the title, the deadline text and the remark text exactly as the feed renders them, and one **checkbox**. Items accomplished in the last 14 days, collapsed. Items past the publishable maximum appear in the same list under a line reading `Not on the carousel this week`, because they are still that officer's work and hiding them would be the one thing the removed cap was supposed to stop. A committee or office that does not publish sees one line saying its items are tracked and emailed and reach no Canva page. One action: tick an item off, which needs no confirm sheet because the undo is the safety net, and untick it while the undo window is open. The row shows an `Undo` affordance for `undoSeconds` after a tick and then stops offering it; a tap that arrives late gets `UNDO_EXPIRED` from the server and the row reverts with that message, since the server owns the window (7.5). Cannot add, edit any text, change a deadline, delete, see another committee, or see a token other than its own.

**Admin view.** All 14 directory entries behind a picker, in **hierarchy order**: Ethan, the four EVPs, then the nine committees in carousel order (4.8). Per committee: active items in rank order, recently accomplished, the active count, how many of them publish, and how many do not, with the items past the publishable maximum shown below a divider reading `Not on the carousel this week` rather than hidden or refused. Add, edit, delete, set any status: nothing is refused for a count (5.4). Readiness card and flags list, with the readiness card naming each of the seven gates that is holding it (6.4) and a line for the week's carousel shape, `11 of 19 pages, 0 items not published`. **Sign-off card** for the current week: a picker of all 14 entries for each of Prepared by and Checked by, position prefilled from the directory and editable, free text allowed, prefilled from last week and saved only on submit (4.5). The readiness card shows `Sign-off not set for this week` as a blocking reason, with the card one tap away, because that is the one blocking condition Ethan can clear in ten seconds and the one most likely to be discovered at run time. Link manager: copy, rotate one, rotate all, revoke, with token age; the President's row shows `Admin link` and no rotate control of its own (4.8). The week line, both overrides when either is set, and whether the term calendar says automation is running.

**Optimistic UI.** Every write applies locally at once, row dimmed with a small `Saving` label, then reconciles: on success replace the affected committee with the server's `CommitteeState`, so slot numbers and windows come from the server and never from client arithmetic; on a typed `ApiError` roll back and toast `error.message`; on `NO_CHANGE` keep the optimistic state and toast informationally; on `NOT_FOUND` discard local state and refetch. A tick is optimistic. An untick is optimistic too, and `UNDO_EXPIRED` is one of the errors that must roll it back cleanly.

---

## 8. Automation and emails

### 8.1 One trigger

`ScriptApp.newTrigger('IS9WD_hourlyDispatch').timeBased().everyHours(1).create()`, created by `Install automations`, the only time-driven trigger. Apps Script schedules time triggers to the hour, not the minute, so a job's `Hour` is the earliest it can run.

`Install automations` is **idempotent**: it deletes every existing trigger whose handler is `IS9WD_hourlyDispatch`, creates exactly one, and reports the resulting count. Without that, two clicks make two triggers, doubling runtime and log volume with nothing on screen to say so.

An installable trigger always runs as the account that created it and no other account can even see it (WEBAPP19). `Install automations` therefore refuses unless `Session.getEffectiveUser().getEmail()` equals `IS9WD_AUTOMATION_OWNER`, and names the account to use instead.

### 8.2 Dispatcher

`IS9WD_hourlyDispatch()`:

1. Read Configuration through the named ranges.
2. If `IS9WD_AUTOMATION_ON` is FALSE: heartbeat, log `Automation off`, return.
3. **If `IS9WD_TODAY_OVERRIDE` is non-blank: heartbeat, log `Override set, automation paused`, alert once a day, return.** The override is the lever Ethan uses for testing and Phase 3 requires him to set it; nothing forces him to clear it.
4. If `IS9WD_IN_TERM` is FALSE: heartbeat, log `Outside the term calendar`, return.
5. Owner guard: if `Session.getEffectiveUser().getEmail()` is not `IS9WD_AUTOMATION_OWNER`, write it to `IS9WD_LAST_OWNER`, log, alert once a day, return without sending anything.
6. For each `IS9WD_SCHEDULE` row where `On` is TRUE and `Check` is `OK`:
   - `period` = `yyyy-MM-dd` of the **real Manila clock**, and the weekday and hour gates read the **real Manila clock** too, never effective today. Keying any of them on the override would freeze every job forever behind a done key that never advances, with a green heartbeat and `Last status = ok`.
   - Skip if the done key is set.
   - If `Runs` is `Weekly`, skip unless the Manila weekday equals `Day`.
   - Skip if the Manila hour is below `Hour`.
   - If the Manila hour is above `Hour` plus `Catch-up hours`, set the done key to `missed`, write `Last status = missed`, log, skip. The window closes rather than firing a Monday email on Thursday.
   - Otherwise take the document lock, run the job in its **own try/catch**, and set the job-level done key in a **`finally`**, so a job that throws still marks its window consumed and cannot re-run five more times inside its catch-up window. Record `Last run` and `Last status`, continue to the next job.
7. Heartbeat.
8. Prune done keys older than 90 days, trim `06 | Log` to the newest 5,000 rows.
9. If any job failed, rethrow one aggregate error, so Google's own trigger failure notice fires (WEBAPP20) without one failing job blocking the other four.

Done keys live in Document Properties as `IS9WD_DONE_<JOBKEY>_<yyyy-MM-dd>`. A weekly job needs no week key: the weekday gate makes a day key unique per week.

### 8.3 Why the week rule lines the jobs up

- `MONDAY_ASSIGNMENTS`, Monday 07:00. Week start is that same Monday, so the email describes the week that is starting.
- `SUNDAY_BRIEF`, Sunday 19:00. Week start has already rolled to the coming Monday, so the brief describes the week the Canva run is about to publish.
- `ARCHIVE_WEEK` and `RETIRE_ACCOMPLISHED`, Saturday 22:00 and 23:00. Week start is still the Monday of the week that is ending.
- `DAILY_DIGEST`, 18:00 daily. Uses effective today, so the rollover does not affect it.

### 8.4 Heartbeat

`IS9WD_heartbeat_()` writes `IS9WD_HEARTBEAT` with the current Manila timestamp and calls `SpreadsheetApp.flush()`. It runs on every dispatcher pass, including the early returns, so a silent dispatcher is distinguishable from a stopped one. It exists on top of `setRecalculationInterval(HOUR)` because Claude reads cached values through Drive.

**UNTESTED:** whether writing a cell reliably forces `TODAY()` to recalculate. If not, the fallback is for `IS9WD_EFFECTIVE_TODAY` to read a date the dispatcher writes into a cell instead of calling `TODAY()`, which removes the uncertainty at the cost of depending on the trigger. That is a one-cell change and is not built until the need is proven.

### 8.5 The four emails

All four go through `MailApp.sendEmail` with `name: IS9WD_SENDER_NAME` and `replyTo: IS9WD_REPLY_TO`, or `noReply: true` when `IS9WD_MAIL_NOREPLY` is TRUE (Workspace only, available here, default off so VPs can reply to Ethan). `noReply: true` suppresses `replyTo`; the menu toggle warns when both are set. Subject prefix `[IS9]`, with `[TEST MODE]` straight after it while `IS9WD_TEST_MODE` is TRUE.

Every email sends **both `body` and `htmlBody`**, the plain text version being the accessible fallback, and all table markup comes from one shared helper so the palette and the no-em-dash rule are enforced in one place.

Every email prints the app link read from Configuration through `IS9WD_linkFor_(key)`, never a hardcoded URL and never a second link builder. The URL is a setting because a public repo and a redeployable endpoint both make a constant wrong eventually (2.6, 12.3). **Exactly one link per email.** For the President's row that link is the **admin link**, because Ethan holds no member token (4.8, 7.3), so an email to him carries the admin view and nothing else. An email that offered two links would teach the one person who must not confuse them that either will do.

**Send loops are resumable.** Each recipient is wrapped in its own try/catch that logs and continues, and a per-recipient done key `IS9WD_DONE_<JOBKEY>_<date>_<key>` is written next to each `sendEmail`, keyed on the directory key rather than a page because five entries have no page. Without it, one bad address in the directory would re-mail everyone ahead of it on every hourly pass inside the catch-up window, up to six rounds for the Monday job, which is exactly what the one-email-per-person rule exists to prevent.

**(a) Monday assignment**, one per directory entry with at least one active item, so up to 14. Subject `[IS9] Week 04 deliverables: Partnerships`, with the committee or office name. Body: greeting by first name; the week line; a table of the active items in rank order with item number, title, deadline text, remark text and current status; **items past the publishable maximum are listed too, marked `Not on the carousel this week`**, because telling someone about a deliverable is independent of Canva having a slot for it; for the five entries with no Canva page, the same table with one line saying their items are tracked but not published; the cutoff text; their link with one sentence saying it is theirs alone; sign-off from `IS9WD_PREPARED_NAME` and `IS9WD_PREPARED_POSITION`, which are this week's values (4.5) and are **omitted entirely when this week's sign-off is not set**, rather than printing two blank lines under a rule. Anyone with no active items gets nothing.

**(b) Daily digest**, one merged email per directory entry. Never one email per deliverable, never two to one person in one day. Subject `[IS9] Due tomorrow and overdue: Partnerships`, or one of the two single-section variants. Body: `Due tomorrow` (active items whose deadline equals effective today plus one), `Overdue` (active items with a deadline before effective today, oldest first), then the link and the sign-off. Anyone with nothing in either section gets nothing; on a quiet day the job sends zero emails.

**(c) Sunday brief to Ethan.** Subject `[IS9] Sunday brief: Week 04 readiness`. To `IS9WD_ADMIN_EMAIL` only. Body, in this order:

- `Ready for Canva: YES` or `NO` copied from the feed, and when it is NO, **each of the seven gates that is holding it named** (6.4): out of term, the weekly sign-off, `Capacity check`, `Plan check`, `Flag list check`, `Feed errors`, and the blocking flags on publishing rows. Naming them is not a nicety now that there are seven: four of the seven are conditions Ethan cannot see anywhere else, and three of those four are the ones that mean the feed is describing a carousel that cannot be built.
- **This week's sign-off**: Prepared by name and position, Checked by name and position, or `Sign-off not set for this week` (4.5). It is in the brief so it can be corrected from the phone that received the email, an hour before the run, rather than found on a published page.
- **`Feed as of` and its weekday**, and **each override that is set, named**: `Today override: 2026-09-20` and `Week number override: 04` (4.1, 4.9). A set override is the quietest way this workbook publishes a wrong week, so it is printed in the brief whether or not anything else is wrong.
- **The week's carousel shape**, in one line: `Carousel pages`, `Master pages required` beside the Canva design id, and `Export page list` (6.4). `Master pages required` is printed every week, not only when it changes, because it is the number that silently exceeds what the master design holds after a Configuration edit, and a mismatch found in the brief is a week of warning instead of a stopped run.
- The nine carousel committees with Count and Next due text, **in carousel order**, and **where a committee's real count exceeds what published, both numbers**, read from the feed's uncapped helper band `T25:T33` (6.4). `Publications: 20 published, 23 active` says what a flag never did. `Items not published` for the whole workbook is printed even when it is 0.
- **A separate short block for the five entries with no Canva page, with their counts and any flags, so their items are visible without ever affecting readiness** (6.1 item 6). This block and the one above are both in hierarchy order within themselves (4.8).
- The full flags list with IDs, across all 14 entries; any committee or office with items past the publishable maximum; any with zero active items; last week's accomplished count.
- **Any directory row whose token is older than `IS9WD_TOKEN_WARN_DAYS` or whose email changed since the token was issued.**
- Rows used of 2,000, the number of accomplished items waiting to be retired, and the remaining mail quota.
- The admin link, and one line naming the Canva design id and `canva/CANVA_RUN.md`.

**(d) Error alert to Ethan.** Subject `[IS9] Tracker job failed: MONDAY_ASSIGNMENTS`. To `IS9WD_ADMIN_EMAIL` only. Body: job key, Manila timestamp, error message, stack, last five log lines. At most **once per job per day**, keyed `IS9WD_ALERT_<JOBKEY>_<yyyy-MM-dd>`, so with five schedule rows (4.7) the ceiling is **five job alerts in a day**, not four; on the request path the key is per day and per error code, since the job keys do not cover API failures. Two helpers: `IS9WD_alertOnce_` sends and returns, `IS9WD_alertAndThrow_` sends and rethrows. Only trigger jobs use the second. Deactivating the trigger also stops Google's own notices (WEBAPP20), so never leave the trigger off to silence noise.

### 8.6 Quota guard

Inside each send job, never once at the top of the dispatcher, because the reading is valid for the current execution only:

```js
const left = MailApp.getRemainingDailyQuota();
if (left < recipients.length + reserve) {
  log(); IS9WD_alertOnce_(jobKey, new Error('Mail quota reserve hit')); return;
}
```

`reserve` is `IS9WD_QUOTA_RESERVE`, default 100. This is a controlled skip that alerts and **does not throw**.

| Day | Recipients |
|---|---|
| Monday | up to 14 assignments plus up to 14 digests, so up to 28 |
| Tuesday to Saturday | up to 14 digests |
| Sunday | up to 14 digests plus 1 brief, so up to 15 |
| Any day | up to 5 error alerts, one per schedule row (4.7 has five rows) |

Worst realistic day is 33 of 1,500: a Monday's 28 plus all five alerts. A loop sending one email per deliverable would reach 140 or more. The rule stands anyway: it is also the difference between a readable inbox and 14 people muting the sender.

24 hourly runs against the 6-hour ceiling leaves 15 minutes per run on average; a heartbeat-only run is seconds and Monday's 14 emails should stay under a minute. The 6-minute per-execution limit is never approached.

### 8.7 TEST mode

`IS9WD_TEST_MODE` TRUE, the default, redirects **every** email to `IS9WD_ADMIN_EMAIL`, prints the intended recipient and their committee or office at the top of the body, and tags the subject `[TEST MODE]`. Test sends still write to the log, marked `TEST`. Turning it off is a menu action with a confirm dialog naming how many people will receive mail on the next run.

---

## 9. Menu: `IS9 Deliverables`

One simple `onOpen`, one menu, in `IS9WD_Menus.js`. Submenus keep the top level short. Every dynamic label goes through `IS9WD_toggleLabel_()`, which falls back to a static label if `PropertiesService` is refused, so a simple trigger can never lose the whole menu bar. **Every handler's first statement is `IS9WD_assertUiContext_()`** (2.5).

```
IS9 Deliverables
  Build or repair workbook
  Apply sheet guards
  ---
  Open the app (admin)
  Show the links
  Copy the endpoint URL
  ---
  Archive this week
  Retire accomplished items
  ---
  Emails >
      Preflight check
      Send this week's assignment emails now
      Send today's digest now
      Send Ethan's brief now
      Test mode: ON  (click to turn OFF)
      Show the log
  Automation >
      Install automations
      Remove automations
      Show automation status
      Run the dispatcher now
  Links >
      Rotate a link
      Rotate every link
      Revoke a link
  Sample data >
      Seed sample data
      Seed sample data (overflow test)
      Clear sample data
  Checks >
      Run self test
      Check the term calendar
      List every protection
      Record the live deployment settings
  ---
  About
```

Handlers: `IS9WD_menuBuildOrRepair`, `IS9WD_menuApplyGuards`, `IS9WD_menuOpenApp`, `IS9WD_menuShowLinks`, `IS9WD_menuCopyEndpoint`, `IS9WD_menuArchiveWeek`, `IS9WD_menuRetire`, `IS9WD_menuMailPreflight`, `IS9WD_menuSendMonday`, `IS9WD_menuSendDigest`, `IS9WD_menuSendBrief`, `IS9WD_menuToggleTestMode`, `IS9WD_menuShowLog`, `IS9WD_menuInstallAutomations`, `IS9WD_menuRemoveAutomations`, `IS9WD_menuAutomationStatus`, `IS9WD_menuRunDispatcher`, `IS9WD_menuRotateOne`, `IS9WD_menuRotateAll`, `IS9WD_menuRevokeOne`, `IS9WD_menuSeed`, `IS9WD_menuSeedOverflow`, `IS9WD_menuClearSeed`, `IS9WD_menuSelfTest`, `IS9WD_menuCheckTerms`, `IS9WD_menuListProtections`, `IS9WD_menuRecordDeployment`, `IS9WD_menuAbout`.

Notes:

- `Build or repair workbook`: the idempotent setup from sections 3 to 6. Creates missing tabs, rewrites every formula, validation, format and named range, re-points every range to its full span, extends the sign-off store when it is nearly full (4.5), backfills an ID and `Open` on any row with content and a blank A or F, writes a token for any directory row without one except `K10`, and writes `K01` to `K14` into any blank `Key` cell plus the carousel order and hierarchy order into any blank cell of those two columns (4.8). Never deletes a tab, never duplicates a tab, never touches an item, a token, an archive row or a log row.
- **`Build or repair workbook` sizes the feed from the three capacity numbers, and it rewrites seven things together or none of them** (6.3, 6.4): the officer table's row count, `publishing rows`; the page header table's row count, `publishing rows * IS9WD_MAX_PARTS`; the page plan's row count, `1 + publishing rows * IS9WD_MAX_PARTS`; the slot table's row count, `publishing rows * IS9WD_MAX_PARTS * IS9WD_SLOTS_PER_PAGE`; Block D's row count, `14 * IS9WD_PUBLISH_MAX + 40`; the helper bands, re-pointed to match; and **the `Feed errors` scan's last column and last row**. The scan is the one that gets forgotten, and a stale scan is worse than no scan: it reads green over the rows it no longer covers. It refuses to resize at all while `Capacity check` is not `OK`, because resizing from numbers that disagree would build a feed nothing can publish from. Growing the plan or the slot table also means the master design needs more pages, which is hand work under Ethan's approval, so the resize logs `Master pages required: <n>` and the Sunday brief prints it every week (8.5c).
- **`Build or repair workbook` also sizes the two views, from two settings, and it is the same together-or-not-at-all rule** (6A.2, 6B.3): `03 | Statistics` from `IS9WD_DIR_ROWS`, `IS9WD_STATS_TREND_WEEKS` and the schedule block's span, and `04 | Officer Tables` from `IS9WD_DIR_ROWS` and `IS9WD_STATS_OFFICER_ROWS`. Statistics is built first, because every count in an officer table's band row is an `INDEX` into a named range on it. Neither call is gated on the capacity numbers, unlike the feed: that is the point of a view. A broken carousel arithmetic must not stop a view, and a broken view must not stop the carousel, so each tab's cross-tab reads fall back to the `!ERR` sentinel that both tabs count and the self test fails on. Each build also writes the two counts it actually used into `IS9WD_STATS_TREND_BUILT` and `IS9WD_OT_ROWS_BUILT`, which are what the two guard notes in 4.6 compare against, and it widens `05 | Archive`'s span when it runs short (10.1). **No new menu item is needed for any of this.**
- **The write-ownership map, which is what makes that last sentence testable.** Every cell in the workbook is in exactly one of three classes, and setup knows which: **script owned** (rewritten on every run: formulas, headers, formats, validations, the `Check` columns, J to Q on the data tab, and all of `01 | Canva Feed`, `03 | Statistics` and `04 | Officer Tables`, each of which is script owned end to end and adds no range to the snapshot, so `user cells changed: 0` still means what it meant), **Ethan owned, write if blank** (written only when empty and never overwritten: the directory names and addresses, the term calendar, the A.Y. label, the switch defaults, every item field), and **append only** (never written except by appending: `05 | Archive`, `06 | Log`, the sign-off store's filled rows). `Build or repair workbook` snapshots the display values of every Ethan-owned and append-only range before it starts and compares afterwards, then logs `user cells changed: 0` or, if it is ever not zero, the exact addresses and a failure. "Idempotent" is otherwise an intention rather than a property, and this is the one check that can tell the difference.
- **Every menu handler that writes takes the document lock**, immediately after `IS9WD_assertUiContext_()` and released in a `finally`, and tells the user `Someone else is saving right now. Try again in a moment.` if it cannot get it in 30 seconds. A double click on `Archive this week` or two people on two devices running `Build or repair workbook` is otherwise two concurrent writers over the same ranges, and the second one wins silently.
- **Before anything destructive, name a version by hand.** `File > Version history > Name current version`, before the first `Build or repair workbook` on a workbook that already holds real items, before `Retire accomplished items`, and before any bulk paste. Sheets keeps revisions, but a **full file restore reverts every later edit**, so a named point is the difference between losing one action and losing a week. Nothing in the script can do this, which is exactly why it is written here.
- `Apply sheet guards`: the warning-only protections in 5.6, logged to the execution log and to `06 | Log`.
- `Seed sample data` and `Clear sample data`: 13.2. `Seed sample data (overflow test)` is v1's cap test renamed: there is no cap to test, so what it exercises is the continuation page and the items past the publishable maximum. Seeding **appends** to the first free rows and never overwrites an existing row, and it records the exact set of IDs it wrote, plus each row's title, deadline, remark and status, in Document Properties. Clearing removes only rows whose ID is in that recorded set, **and skips any of them whose content has changed since it was seeded**, reporting each skip, because an edited sample row is a row somebody decided to keep. Clearing also clears `IS9WD_TODAY_OVERRIDE`, since the fixture requires it to be set and a leftover override is the one thing that silently freezes the whole workbook on a past week (4.9).
- `Archive this week` appends the current week's visible feed rows to `05 | Archive` and clears nothing. `Retire accomplished items` is the separate path in 10.1.
- `Record the live deployment settings` writes the literal access and executeAs strings Ethan reads out of Manage deployments into B100, so the most consequential setting in the build is recorded rather than assumed.
- There is **no** `Share with the Canva reader`. That share is manual, so the project never calls `DriveApp` and the `drive` scope never exists (2.2).
- v1's `Apply protections` is gone as written: there are no per-VP protections. v1's `Send reminder emails` is the `Emails` submenu.
- `Show the links` lists the 13 member links plus the admin link, each with its key, name, token prefix, age in days and revoked state, and shows `K10` as `Admin link` with no member token of its own (4.8). It is the only place a whole token is displayed, and it is a menu action, so `IS9WD_assertUiContext_()` gates it.

---

## 10. `05 | Archive` and `06 | Log`

### 10.1 `05 | Archive`

Append only. v1's seven columns keep their order and meaning, with seven appended:

`Week` | `Week start` | `Committee` | `Title of Task` | `Deadline` | `Remarks` | `Archived at` | `ID` | `Status` | `Status at` | `Status by` | `Source` | `Prepared by` | `Checked by`

- **`Deadline` holds the real date**, not the rendered `Due Mon, Sep 21` text. The rendered string cannot be sorted, compared or re-formatted, and it does not carry a year, so an archive of rendered text cannot be used to reconstruct a week two years later, which is the only reason this tab exists.
- **`Prepared by` and `Checked by`** carry the week's sign-off names as they were at archive time, from `IS9WD_PREPARED_NAME` and `IS9WD_CHECKED_NAME` (4.5). They are written by the snapshot path and left blank by the retire path, which is not tied to a published week. This is what makes the weekly sign-off auditable after the names have moved on: the store holds the current mapping, the Archive holds what was actually published.

Two writers, two different jobs, because one job cannot do both:

| Path | Reads | Dedupe | Clears | Source |
|---|---|---|---|---|
| `Archive this week` / `ARCHIVE_WEEK` | the feed's **visible** rows | `Week` plus `ID` | nothing | `Published snapshot` |
| `Retire accomplished items` / `RETIRE_ACCOMPLISHED` | `02 \| Deliverables` directly, rows whose status is terminal and whose `Status at` is older than `IS9WD_RETIRE_DAYS` | `ID` alone among `Retired` rows | clears A to I on the row, after the append | `Retired` |

The snapshot path records what Canva published, so a still-active item appears once per week it was published, by design. The retire path records accomplishment exactly once per ID, which the snapshot path structurally cannot: the feed excludes terminal items, so a snapshot-only archive would carry `Status = active` and blank status columns forever, and accomplished rows would accumulate until the 2,000 rows filled. **The arithmetic got worse when the cap went.** The old figure was 140 items a week, 14 entries at the 10 item cap, filling 2,000 rows in about three and a half months. The planning figure now is **280 a week**, 14 entries at the publishable maximum of 20, which fills 2,000 rows in **about seven weeks**, and nothing caps it, so a heavy trimester can be faster. Seven weeks is less than one trimester, which turns `RETIRE_ACCOMPLISHED` from a preference into a scheduled job someone has to decide about (Appendix B item 3).

Both run inside the document lock and call `SpreadsheetApp.flush()` before reading, because a `setStatus` from the endpoint changes every remaining `Rank` and therefore every slot key in that committee.

Accomplishment is never lost even with `RETIRE_ACCOMPLISHED` off, because `06 | Log` records every status change. Retiring is about the row budget and about a readable long-term record.

**The tab is now bounded and grown, because the trend block reads it.** It used to be open ended, which is fine for appending and impossible for a formula: a named range has to span a real grid. So `IS9WD_ARCHIVE` gains `lastRow: 1003` (1,000 rows), `growBy: 1000` and `minFreeRows: 100`, the same shape the sign-off store already uses, and it gains six named ranges over the columns the trend block reads: `IS9WD_ARC_WEEKSTART`, `IS9WD_ARC_COMMITTEE`, `IS9WD_ARC_DEADLINE`, `IS9WD_ARC_ID`, `IS9WD_ARC_STATUS_AT` and `IS9WD_ARC_SOURCE`. The other eight columns carry no name, because no formula asks about them.

Four things follow, and the third is the one that needs someone to act.

- **1,000 rows costs nothing new in the connector read**, because a Sheets tab ships with that many anyway and this tab was never trimmed. `Build or repair workbook` widens the span downward, never inserts into it, so no appended row moves and no ID changes. Widening is all setup may do: migrating an append only row is a capability it does not have, which is why the span only ever grows.
- **The self test checks these six names the way it checks the store's**, on their start, their width and a height that is a whole number of `growBy` blocks, because a growing block's declared last row is stale the moment it grows and an exact comparison would fail on a healthy workbook.
- **The append path owes the same growth check.** A row appended between two builds that lands past the current span falls outside the six ranges and vanishes from the trend until the next `Build or repair workbook`. The safe shape in `IS9WD_Archive.js` is: append, then if the appended row is past the span, widen it and re-point, inside the lock it already holds. **This is the one place this revision touches an append only path, and it is not yet written**, because that module ships in a later phase.
- **Whole-column references like `'05 | Archive'!B:B` were rejected** as an alternative. That is address coupling by another name, it breaks the day a column is inserted, and 2.5 exists to prevent exactly that.

**This tab grows inside the same Drive read the feed depends on,** and that is a standing cost rather than a solved problem. The connector returns every tab as markdown in one response, so the Archive and the Log share whatever size limit that response has, and **that limit is UNTESTED** (6.5). Three things keep it survivable and none of them is a cap on this tab: `01 | Canva Feed` is tab 2, so a truncated read loses the Archive and the Log before it loses a single contract string; the feed carries no reference to an archive row, so a lost archive row cannot corrupt a published page; and the weekly run reads the feed's own cells, which it can verify by `A1` and by `Feed errors`. What is not covered: nothing trims `05 | Archive` the way the heartbeat trims `06 | Log` to 5,000 rows, so at some point this tab wants moving to its own file. **That standing note now has a second reason**: this tab is inside two formulas' scan ranges as well as inside the connector read, so it costs recalculation time on every tick as well as read size on every Sunday. Recorded at the end of Appendix B rather than half-solved here.

### 10.2 `06 | Log`

Hidden, append only.

`At` | `Actor` | `Source` | `Action` | `Committee` | `ID` | `Detail` | `Result`

`Source` is one of `App`, `Menu`, `Trigger`, `Setup`. `Actor` is `Admin`, a committee or office name, or an email for a menu or trigger action. The log records the token's directory entry, never a person, because the accessing user's identity is unavailable by design. Every `UNDO_EXPIRED` refusal is logged too, because a run of them is the signal that the 60 second window is too short. The heartbeat trims to the newest 5,000 rows.

---

## 11. Security model and accepted risks

The design is a reachable URL plus a secret in a link. Stated plainly so nobody is surprised later.

**What holds**

- The Sheet is private to one DLSU account. No VP has any Drive access, and none is ever requested.
- The web app runs as the owner, so nobody holding a link needs a Google account, a sign-in or an OAuth consent, and none of them gets any Drive permission. Verification screens do not apply: they appear only for `USER_ACCESSING` deployments, and same-domain Apps Script projects are exempt anyway (DOMAINFALLBACK3, DOMAINFALLBACK4).
- A `member` token reaches exactly one committee or office and one kind of write, ticking and unticking its own items. It cannot add, edit, delete, read another entry, or learn that another entry's items exist: an id it may not act on returns `NOT_FOUND`, and its `state` response contains no other entry's data.
- **Reopening an item older than the undo window is Ethan's alone.** The window is checked on the server against the stored `Status at` (7.5), so it cannot be widened from a browser.
- 130 bits of token width. Guessing is not a threat model.
- **Tokens are not in the workbook.** They are in Script Properties, so the markdown the Drive connector returns every Sunday, and the fallback Viewer share if it is ever needed (2.2), cannot carry one. `03 | Statistics` puts a ranked table of fourteen officers inside that same read, which is a judgement rather than personal data: it names no address, it never reaches the feed, an email or Canva, and an officer with too small a sample is suppressed rather than ranked (6A.6).
- No project function other than `doGet`, `doPost`, `IS9WD_rpc`, `onOpen` and the menu handlers is reachable by name, and every menu handler refuses outside a document UI.
- In **Shape A** the token sits in the URL fragment, so it never reaches GitHub's servers and never appears in a `Referer`.
- Every write is logged, and every write a directory link can make is reversible by Ethan in one tap.
- No `UrlFetchApp` and no `DriveApp`, so nothing leaves Google's network except the four emails, and no scope reaches beyond this spreadsheet.

**Accepted risks**

1. **The token is the entire identity.** Anyone holding a member link can tick that entry's items off. No second factor, no way to tell one holder from another: `Session.getActiveUser().getEmail()` is blank under `ANYONE_ANONYMOUS` plus `USER_DEPLOYING`.
2. **Tokens travel by email** and live in inboxes, phone browser history and any screenshot. Treat them as semi-public. 13 member tokens, plus the admin token, which is Ethan's only one (7.3).
3. **Tokens do not expire.** A link keeps working until Ethan revokes or rotates it, including after someone leaves mid-trimester or loses a phone. The only prompt is the token-age line in the Sunday brief (8.5c).
4. **In Shape B the token would travel in a query string**, so it would be present in Google's own request logs, in the address bar and in anything that previews URLs in mail, and stripping it from the visible URL after first paint does not un-log it. This risk is **not live**: Shape B is not built and the 7.1 measurement means the token stays in a POST body. It is listed because taking the fallback re-accepts it.
5. **`ANYONE_ANONYMOUS` means the `/exec` endpoint is world reachable.** Only the token gates content. The endpoint URL also sits in the shipped bundle, which is public by definition, and the repo that builds it is public too (2.6). That is the design, not a leak: the endpoint without a valid token returns `BAD_TOKEN`, having touched no spreadsheet (7.5), and no request is trusted before a token is proven.
6. **No IP address is available**, so rate limiting is per token and approximate. A bad-token flood can be throttled and aggregated in the log but not blocked, and it still consumes the owner's execution concurrency, which the hourly dispatcher shares. The cache-only pre-gate in 7.5 keeps it from costing Sheet reads and Sheet writes as well.
7. **The log records a committee or office, not a person.** Two people sharing one link are indistinguishable.
8. **A ticked checkbox is a claim, not proof.** No attachment, no link, no sign-off. Decided design.
9. **A grey banner reading "This application was created by another user, not by Google" may appear** above a Shape B page. Only community reports describe it. **UNTESTED**, and not live while Shape B is unbuilt.
10. **A DLSU admin can turn Apps Script off for an OU**, blocking the web app, the menu and every trigger at once (ADMINCONTROLS1, ADMINCONTROLS2). **Confirmed enabled as of 2026-09-27** for Ethan's OU, which removes the unknown but not the risk: the setting is an administrator's, not his, and it can change without notice. Nothing routes around it. The Sheet stays hand-editable, which is the whole mitigation, and 5.3 is what keeps hand-edited rows honest.
11. **DLSU could restrict sharing to consumer accounts.** **Confirmed permitted as of 2026-09-27** (ADMINCONTROLS11), and in any case the share is now only a fallback: the connector is connected to Ethan's DLSU account too, so the first thing tried is a read with nothing shared (2.2). If both the policy changed and the DLSU read failed, the weekly Canva run would have no reader and would need another route. That stops the run, never the build.
12. **GitHub Pages is a third party, and the repo is public.** GitHub's terms forbid commercial use and advise against sensitive transactions; a student org tracker is inside those terms. The repo must be public because `is9-dlsu` is on GitHub Free (2.6), so the bundle, the workflow and the endpoint URL are readable by anyone, and GitHub sees every page load. What is never committed: a name, an address, a token, a directory row. The 14 person roster lives only in the Sheet (4.8).
13. **Multi-login** is documented as unsupported for Apps Script web apps (DOMAINFALLBACK6). The 13 member link holders dodge it because no sign-in happens. It still affects Ethan opening the Sheet or the editor while signed into two accounts.
14. **Any file editor can open and edit the bound script.** Today there is exactly one editor, Ethan, so this is theoretical; the moment a second editor is added it is not. An editor can read Script Properties, and therefore every token, run any function from the editor, and change the deployment. The warning-only protections of 5.6 are guard rails against accident, not access control, and `IS9WD_assertUiContext_()` stops a web caller, not an editor. Also worth knowing before it is needed: **removing someone from the file's editors does not retract anything they already copied**, so a departure means `Rotate every link`, not a permissions change. Accepted, with the rule that stays: one editor.

**Mitigations in the build:** rotate any link at will, revoke without erasing, log every request and write, keep every tick reversible by Ethan, default TEST mode ON, and keep `IS9WD_APP_ON` as a single kill switch that closes the app without touching the deployment.

---

## 12. Handover and term rollover

### 12.1 What works, because the host is DLSU

Ownership of a Drive file can move between two accounts **inside the same organisation**, so handing the Sheet to the next president's `dlsu.edu.ph` account is supported. That is the single biggest advantage of the DLSU host over the consumer account briefly considered, where cross-domain transfer is permanently impossible.

| Survives a same-domain transfer | Needs redoing |
|---|---|
| The file id and URL | The installable trigger: it belongs to whoever created it |
| Every tab, value, formula, named range | `IS9WD_AUTOMATION_OWNER`, `IS9WD_ADMIN_EMAIL`, `IS9WD_REPLY_TO`, `IS9WD_READER_EMAIL` |
| The bound script project and its Script Properties, including the tokens | Versioned deployments: ownership of a versioned deployment does not transfer (HANDOVER13), so the new owner creates a fresh deployment |
| `05 \| Archive` and `06 \| Log` | `IS9WD_ENDPOINT_URL`, the `VITE_IS9WD_ENDPOINT` repository variable, and all 13 member links re-sent if the endpoint changed |
| Document Properties, including `IS9WD_NEXT_ID` and the done keys | The term calendar for the new academic year |

**UNTESTED, about 0.8 confidence:** that a same-domain ownership transfer keeps the existing `/exec` URL working. Google documents that deployment ownership does not transfer and that a web app breaks when ownership moves to a **different** domain. A same-domain move is covered neither way. Plan for a fresh deployment and treat a surviving URL as a bonus.

### 12.2 What breaks it

- **Moving the file to a shared drive breaks the web app** until the new owner redeploys (HANDOVER12, ADMINCONTROLS22). DLSU accounts can create shared drives, which makes this a live temptation.
- **Moving the file out of `dlsu.edu.ph`** breaks the web app and is undone only by moving it back or redeploying in the new domain.
- **A GitHub Pages URL does not redirect after a repo transfer** (SHEETBACKEDREACT16). Web and Git links redirect; the Pages site does not. So all 14 links, the 13 member ones and the admin one, change once per handover, and the bundle must be rebuilt with the new `VITE_IS9WD_BASE` and `VITE_IS9WD_ENDPOINT`. This is the reason the app URL is a Configuration setting that every email reads rather than anything committed (2.6).

### 12.3 The rule that makes handover survivable

**Every URL is a setting, never a constant.** `IS9WD_APP_BASE_URL` and `IS9WD_ENDPOINT_URL` live in Configuration and every printed link reads them through `IS9WD_linkFor_(key)`. Nothing in code, in the repo, in an old email, or in a bookmark is load bearing. The one place the endpoint is not read from Configuration is the built bundle, which gets it from a repository variable at build time (7.2), so a handover updates that variable and rebuilds. A handover that changes both URLs costs one paste, one variable, one rebuild, one `Rotate every link` and 13 emails plus the new owner's own admin link.

### 12.4 Handover checklist, `docs/HANDOVER.md`

0. **Outgoing owner, before transferring anything:** run `Remove automations`. This cannot be done afterwards. An installable trigger is invisible to every other account, so the incoming owner cannot delete it; it would keep firing hourly on the old account until the owner guard tripped, and if that account lost Sheet access it would throw every hour and mail failure notices to a departed inbox forever. (If the outgoing owner is already gone, the owner guard plus removing their access is the only remedy.)
1. Transfer the Sheet to the new president's `dlsu.edu.ph` account.
2. New owner opens the script editor, runs one function, and authorizes once.
3. New owner creates a fresh deployment, `ANYONE_ANONYMOUS` plus `USER_DEPLOYING`, pastes the `/exec` URL into `IS9WD_ENDPOINT_URL`, and runs `Record the live deployment settings`.
4. Transfer the GitHub repo inside `is9-dlsu` or to the new owner, re-enable Pages, **set `VITE_IS9WD_BASE` and `VITE_IS9WD_ENDPOINT` as repository variables and rebuild**, then paste the new Pages URL into `IS9WD_APP_BASE_URL`. The URL follows the repo name (2.6). The old Pages URL dies with no redirect. Confirm the repo is still public and that nothing personal has been committed since.
5. Set `IS9WD_ADMIN_EMAIL`, `IS9WD_AUTOMATION_OWNER`, `IS9WD_REPLY_TO`, and `IS9WD_READER_EMAIL` only if step 10 turns out to need it.
6. `Install automations` from the new account.
7. `Rotate every link`, then send the 13 member links, one at a time. The new owner keeps the admin link and takes over the President's directory row, which holds no member token (4.8).
8. Fill the new term calendar, **both start and end for each trimester** (4.3). Confirm `IS9WD_WEEK_NUMBER` reads `01` on the first Monday and that `IS9WD_WEEK_NUMBER_OVERRIDE` is blank.
9. Set the first week's sign-off in the admin view (4.5), or `Ready for Canva` reads NO on the new owner's first run.
10. Test the Canva read from the new owner's DLSU account first. Share the file as Viewer to the reader address **only if that read fails** (2.2), by hand, and confirm the connector can read it either way.
11. Confirm the Canva master design still holds `Master pages required` pages, which the Sunday brief prints every week (8.5c), and that the directory's `Carousel order` column still matches the pages the master was built for. Transferring the Sheet does not transfer the design, and a new president who adds a committee has changed the page mapping (6.3).

Recorded facts in this file: the scriptId and the Canva design id `DAHVvLLgskQ`, and nothing else. The deployment id, the `/exec` URL, the Pages URL and every address stay in `00 | Configuration`, and this file points there, because the repo is public (2.6).

### 12.5 Term rollover, three times a year

1. Fill the next trimester's `Start` **and `End`**, and confirm `Start` is a Monday from the `Check` column. A blank `End` pauses everything (4.3).
2. Clear `IS9WD_TODAY_OVERRIDE` and `IS9WD_WEEK_NUMBER_OVERRIDE`. (The dispatcher is paused while the first is set; the second silently relabels every week.)
3. Run `Archive this week` for the last week of the closing trimester, then `Retire accomplished items`.
4. Confirm `IS9WD_WEEK_NUMBER` reads `01` on the first Monday.
5. Rotate a link and update the directory for anyone who changed. Names and addresses go into the Sheet only.
6. The weekly sign-off store needs no rollover: it is keyed on week start, never cleared, and `Build or repair workbook` extends it before it fills (4.5). Set the new trimester's first week before the first Canva run.

Between trimesters `IS9WD_IN_TERM` is FALSE and the dispatcher sends nothing. No switch needs flipping.

---

## 13. Testing and acceptance

Follows the ARW precedent: a pure JS core tested in Node with **no npm dependencies**, plus an in-sheet self test and an automated em dash scan. The React app gets its own lightweight tests.

Every check in 13.3 is tagged **[auto]** (a command), **[claude]** (Claude drives it in the Sheet or against `/dev`), or **[ethan]** (only Ethan can do it: a real inbox, a phone, a browser profile, a DLSU policy answer). No phase closes on an untagged claim.

### 13.1 The pure core

`IS9WD_Core.js` holds every decision that does not need a spreadsheet, touches no Apps Script global except a date formatter passed in or mocked, and is loaded into a Node `vm` realm exactly as `ARW_Referral_Tracker.gs` is. The host `Date` must be shared into the realm, or every `instanceof Date` check fails.

| Function | Returns |
|---|---|
| `IS9WD_weekWindow(effectiveToday)` | `{weekStart, weekEnd}` |
| `IS9WD_activeTerm(date, termCal)` | `{name, start, end}` or null |
| `IS9WD_weekNumber(weekStart, termCal)` | integer or null |
| `IS9WD_windowFor(deadline, weekStart, weekEnd)` | `OVERDUE`, `W1`, `W2`, `W3` |
| `IS9WD_rangeText(start, end)` | `SEP 21 TO 27`, `SEP 30 TO OCT 4` |
| `IS9WD_weekLine(weekNo, rangeText, ayLabel)` | the contract string, `--` when weekNo is null |
| `IS9WD_legendLines(weekStart, weekEnd)` | the three legend strings |
| `IS9WD_vpLine(vpName, position)` | the contract string |
| `IS9WD_tagline(weekNo, rangeText, count)` | the contract string, `1 TASK` and `0 TASKS`. `count` is the officer's total, the same on both of their pages (6.1 item 3) |
| `IS9WD_deadlineText(deadline, weekStart)` | `Due Mon, Sep 21`, `Overdue: Fri, Sep 18` |
| `IS9WD_nextDueText(items, weekStart)` | the contract string |
| `IS9WD_remarkText(remark)` | `·  <remark>` or `""` |
| `IS9WD_isActive(status, statusList)` | boolean |
| `IS9WD_undoAllowed(statusAt, now, undoSeconds, role)` | boolean: TRUE for `admin` always, TRUE for `member` only inside the window |
| `IS9WD_signoffFor(weekStart, signoffRows)` | `{preparedName, preparedPosition, checkedName, checkedPosition, setAt, set}`, with `set` FALSE and the four strings blank when that week has no row. `setAt` is returned as the text `yyyy-MM-dd HH:mm`, because it crosses the wire as JSON, where a date object cannot survive and a date alone would drop the time the store calls a timestamp |
| `IS9WD_normalizeText(s)` | trimmed, line breaks and tabs collapsed to single spaces (7.5) |
| `IS9WD_sortActive(items)` | deadline ascending, then ID ascending |
| `IS9WD_slotRows(items, weekStart, weekEnd, hex, slotsPerPage, maxParts)` | `{pages: [{part, rows}], notPublished}`, each `rows` exactly `slotsPerPage` long |
| `IS9WD_checkFlag(item, effectiveToday, statusList)` | a flag or `""`. No rank and no cap argument: `Over cap` is gone (5.3) |
| `IS9WD_publishSplit(count, slotsPerPage, maxParts)` | `{parts, published, notPublished}`, with `parts` `MAX(1, ROUNDUP(count/slotsPerPage))` capped at `maxParts` |
| `IS9WD_masterPage(carouselOrder, part, maxParts)` | `1 + (i-1)*maxParts + p`, the one place a physical page number is produced (6.3) |
| `IS9WD_pagePlan(officers, slotsPerPage, maxParts, publishEmptyPages)` | the 19 plan rows: page, used, position, part, parts, first and last item number, slots used, count |
| `IS9WD_exportPageList(plan)` | `1,2,4,5,6,8,10,12,14,16,18`, ascending integers, and it throws rather than returns on a non-ascending plan |
| `IS9WD_validateItem(payload, directory, statusList)` | `{ok}` or `{ok:false, field, message}` |
| `IS9WD_parseDate(str)` / `IS9WD_formatDate(date)` | the 7.4 date rules, round trip identical |
| `IS9WD_recipientsFor(jobKey, directory, items, effectiveToday)` | the directory rows to mail, all 14 in scope |
| `IS9WD_tokenLookup(token, directory, tokens)` | `{role, key, carouselOrder, publishes, committee, name}` or null, where `role` is `member` or `admin`. `carouselOrder` is blank and `publishes` FALSE for the five entries with no Canva page. |
| `IS9WD_newToken(hex)` | a 26-character Crockford Base32 token |
| `IS9WD_doneKey(jobKey, dateStr, key)` | the property key, keyed on the directory key rather than a page |
| `IS9WD_shouldRun(jobRow, nowManila, doneKeys)` | `run`, `skip`, or `missed` |
| `IS9WD_routeDecision_(req, ctx)` | the ordered plan from 7.5 |
| `IS9WD_envelopeOk` / `IS9WD_envelopeErr` | the two envelopes |

`IS9WD_routeDecision_` is in Core precisely because a wrong order there is a security or double-write bug, and because the two cases that matter most, a replayed requestId and two simultaneous adds, are nearly impossible to trigger by hand.

**The page plan functions are in Core for the same reason, and they carry the golden cases the review demanded.** `feed.test.js` pins: count 0 gives 1 part and a page that is used only while `publishEmptyPages` is TRUE; count 10 gives **1** part, which is the off-by-one a naive `INT(n/10)+1` gets wrong; count 11 gives 2 parts with 1 slot used on part 2; count 20 gives 2 parts exactly full; count 23 gives 2 parts, 20 published and **3 not published**; nine committees all overflowing gives 19 used pages and an export list of 19 ascending integers; and the same nine with `publishEmptyPages` FALSE and every count 0 gives a single used page, the title page. `IS9WD_masterPage` is pinned at every `(i, p)` pair from `(1,1)` to `(9,2)` against the literal list 2 to 19, because that mapping is what the master design was built by hand to match.

### 13.2 Sample data

With `Today override = 2026-09-20` (a Sunday), the week is Sep 21 to 27, and Term 1 starting `2026-08-31` gives Week 04.

**The fixture's term start is a test value, not the live one.** Live, Term 1 starts `2026-09-07` (4.3), which makes the week of Sep 21 Week **03**, not 04. The fixture keeps `2026-08-31` because every golden string carried over from v1, and every expected value in 13.3, is written for `WEEK 04` and `SEP 21 TO 27`. So the Node tests pin the fixture calendar and pass it in explicitly, while the live workbook holds the real one. Two consequences, both worth stating: the `[auto]` week number check below asserts `04` **against the fixture calendar** and would read `03` against the live one, which is correct rather than a failure; and after any fixture run in the live workbook, `Clear sample data` restores the real term start along with clearing the override.

Seed into `02 | Deliverables`, committee `Partnerships`, all `Open`:

| Title of Task | Deadline | Remark |
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

Plus: one overdue row in `Publications` with deadline 2026-09-18; one `Accomplished` row in `Publications` with `Status at` 2026-09-19; two `Open` rows in `Marketing and Advocacy`, deadlines 2026-09-22 and 2026-09-24; one active row in `Documentation` with a blank deadline; one active row against `President` with deadline **2026-09-23** and one against `Executive Vice President for Operations` with deadline **2026-09-25**, which exercise the five entries that have no Canva page; `Finance` left empty.

`Seed sample data (overflow test)` adds **13 more active `Publications` rows**, deadlines spread from 2026-09-21 to 2026-10-02, taking that committee to 14 active titled items. That is the fixture for the whole pagination design and it is chosen to exercise the cases that break quietly: 14 items means 2 parts, so master pages 04 and 05 are both used and the carousel is 11 slides rather than 10; part 2 carries 4 visible slots and 6 invisible; both taglines read `14 TASKS`; and page 05's first slot carries `Item no` 11. Seven more rows by hand, taking `Publications` to 21, is the fixture for `Items not published`, which then reads 1 while every check cell stays `OK` and `Ready for Canva` stays `YES`, because an item that does not fit a slide is not an error (5.4).

**Both unpublished rows carry in-week deadlines, and neither is flagged at seed time.** That is the point of giving them dates: an undated row picks up `Missing deadline`, and two extra flags would have made the expected flag count wrong in three of the checks below. So the seed's flag count is exactly **two**: the `Overdue` row in `Publications` and the `Missing deadline` row in `Documentation`. **The overflow test adds no flag at all**, which is the visible difference between v1 and this revision: the eleventh item used to add `Over cap`, and now it adds a Canva page instead. Every check that names a flag count below counts from those two.

The seed also writes a sign-off row for week start `2026-09-21`, with placeholder names, because `Ready for Canva` now reads NO until the week's sign-off is set (4.5) and every feed check below expects a readiness value that reflects the items rather than a missing signature. `Clear sample data` removes that row too.

The seed remark `Send final name to Publication` is left exactly as v1 wrote it, because it is the worked example of the `Remark text` string in 6C and that string is a frozen contract. It is 30 characters, at the cap; `Publications` would be 31 and would fail validation. It is remark prose, not a committee reference.

### 13.3 Acceptance checks

**Workbook**

- [auto] A fresh build creates all **9** tabs, six visible and three hidden. A second run changes no item, no token and no archive row, and creates no duplicate tab. All three computed tabs are entirely script owned, so `user cells changed: 0` still holds; `IS9WD_setupSnapshot_` gained the `_Engine` blocks, because that is where the settings went.
- [claude] **The cream rule, by eye and then by test.** Open `00 | Configuration` cold and confirm that every cell with a cream fill is one you would type into, that the sentence beside it in column C says what to type and what happens if it is wrong, that clicking the cell shows the same sentence as a note, and that no calculated cell is cream. Do the same on `_Engine`. Then confirm `02 | Deliverables` has exactly five cream columns, that row 4 carries one sentence per column, and that both row 3 and row 4 carry the same sentence as a note. `IS9WD_selfTest()` asserts all of it (13.4), so the eye check is for the wording rather than for the mechanics.
- [claude] **The three charts.** Run `Build or repair workbook` three times and confirm `03 | Statistics` still holds exactly **three** charts, each anchored inside its own reserved band. This is the check for the one failure that compounds silently: `insertChart` appends, so a build that forgot to remove first would leave nine.
- [claude] **An empty chart is still a chart.** On a workbook with no deliverables and no archive rows, confirm all three charts render as empty plots rather than as broken objects, and that the caption row above each one says in plain words what will fill it (6A.10).
- [claude] **The hidden tabs.** Confirm `_Engine` and `_Views` are hidden, that `06 | Log` still is, and that **`01 | Canva Feed` is not**: whether the Drive connector reads a hidden tab is unmeasured and the Sunday run depends on that tab. Then unhide `_Engine` by hand, run `Build or repair workbook`, and confirm it is hidden again.
- [claude] **The directory's two halves.** Confirm `IS9WD_DIR_KEY` on `00 | Configuration` and the `Key` column of `DIRECTORY MACHINERY` on `_Engine` hold the same fourteen keys in the same order. Then overwrite one key on `_Engine` by hand: `IS9WD_selfTest()` fails naming the row, because the join is by row position (4.4).
- [claude] **The renumbering.** On a workbook built before this change, run `Build or repair workbook` and confirm it renames `03 | Archive` to `05 | Archive` and `04 | Log` to `06 | Log` by their developer metadata, creates no twin, and strands no row. Then rename `03 | Statistics` to something of your own in the tab bar and re-run: it repairs **that** sheet and leaves your name alone, because the rename only applies to a name of the project's own `NN | Something` shape (section 3).
- [claude] **The store's move to `_Engine`.** Run the build on a workbook created before this change and confirm the store's rows are where 4B.10 now says and its `Check` column reads `OK` on every filled row. **With filled store rows this check is expected to fail, because setup widens an append only block and never migrates one**, which is why the move had to land before Gate A (4B.10). Today the store holds zero filled rows, so the cost is zero.
- [claude] Set `IS9WD_STATS_OFFICER_ROWS` to 13 on `_Engine` without rebuilding: `D63` says to run `Build or repair workbook` and `IS9WD_selfTest()` fails. Rebuild: the tab shrinks to 229 rows, every section resizes, every range re-points, and the self test passes. Do the same with `IS9WD_STATS_TREND_WEEKS` and `D56`, and confirm chart 3's range follows the trend block's new height.
- [claude] Every named range in sections 4 and 5 resolves, and each `IS9WD_DEL_*` range spans exactly 2,000 rows. Every `IS9WD_DIR_*` range spans exactly 14 rows, `IS9WD_DIR_KEY` reads `K01` to `K14`, `IS9WD_DIR_CAROUSEL` holds the integers 1 to 9 and five blanks, `IS9WD_DIR_PUBLISHES` holds nine TRUE and five FALSE, and `IS9WD_DIR_HIERARCHY` holds 1 to 14 with no repeat. `IS9WD_DIR_PAGE` **must not resolve at all**: it is retired, and a formula still reading it is a formula that was not updated (4.8). Every `IS9WD_SIGNOFF_*` range spans the same number of rows, a multiple of 52, and all six ranges agree (4.5).
- [claude] **The three capacity numbers.** Set `IS9WD_MAX_PARTS` to 1 with `IS9WD_PUBLISH_MAX` left at 20 by pasting a literal over `B37` on `_Engine`: that tab's `D37` and the feed's `Capacity check` both read `Capacity numbers disagree: 10 times 1 is 10`, `Ready for Canva` reads NO, `IS9WD_selfTest()` fails, and `Build or repair workbook` refuses to resize the feed and says why (4.6, 6.4, 9). Restore `B37`'s formula and all three clear together. This is the check that stands in for the silent truncation the review rated highest: without it, ranks 11 to 20 would produce slot keys that match no page and no block, and nothing would fire.
- [claude] **The directory's three carousel checks.** Blank one publishing row's `Carousel order` on `_Engine`: that officer's `Check` on `00 | Configuration` reads `On the carousel with no slide number: ask before changing this`, the feed's `Plan check` names it, `Ready for Canva` reads NO. Duplicate another row's: `Two rows share one slide number`. Set one to 12: `Slide number is out of range`. Each one alone fails `IS9WD_selfTest()`. **This is also the check that the `Check` column reaches across two tabs**, which it does through `INDEX(IS9WD_DIR_CAROUSEL, ROW()-29)` rather than by column letter (4.4).
- [claude] Validation rejects a 41-character title, a 31-character remark, a non-date deadline, and a status not in the list. The status dropdown offers exactly `Open` and `Accomplished`. The committee dropdown offers all 14 directory entries.
- [claude] **Paste past the validation**, which is the case validation cannot cover: paste a 41-character title, a 31-character remark, and a committee name that is not in the directory, each into a used row. They produce `Title too long`, `Remark too long` and `Unknown committee`, and each one forces `Ready for Canva: NO` (5.3).
- [claude] `Build or repair workbook` on a workbook holding real items logs `user cells changed: 0`. Then change one item by hand, re-run, and confirm it still logs zero and the change is still there.
- [claude] Rename `02 | Deliverables` in the tab bar, run `Build or repair workbook`, and confirm it repairs **that** sheet by its developer metadata and creates no second sheet (section 3).
- [claude] Run `Apply sheet guards` twice: `List every protection` shows one protection per range in 5.6, each described `IS9WD guard: ...`, with domain edit off, and a protection added by hand on an unrelated range survives both runs.
- [claude] The four hex cells on `_Engine`: set one to `#fff` and confirm `E11` reads `Hex is not #RRGGBB` and `IS9WD_selfTest()` fails (4B.2).
- [claude] The term calendar `Check` reads `Start is not a Monday` for a Tuesday start. The schedule `Check` reads `Row does not parse` for `Weekly` plus `Any`.
- [claude] Create an item, delete it, run `Build or repair`, create another: the second ID is higher than the deleted one.
- [claude] A hand-typed row holding only a committee and a title is flagged (`Missing ID`), not published, and `Build or repair` backfills its ID and `Open` with a log line.
- [claude] Pasting `2026-09-21 17:00` and pasting the text `Sept 21` each produce `Deadline not a date` and `Ready for Canva: NO`.
- [claude] Sorting the data range by Deadline changes no slot key.
- [auto] No tab freezes a column, and every tab freezes exactly the header rows `IS9WD_FREEZE` names, including the four on `02 | Deliverables`. Nothing on any of the three computed tabs is merged, the KPI tiles included.
- [claude] **The plain English explanation on the feed.** Confirm `E1` of `01 | Canva Feed` carries the sentence in 6.3, that `A1` carries it as a note, and that neither one displaced a sentinel: `B1` still reads `IS9WD FEED START v2` and the tab still ends on its end sentinel.

**`03 | Statistics`**

- [claude] With the seed loaded, `Active this week` plus `Accomplished this week` equals the count of seeded items with a deadline in the week, and `Active this week` differs from `IS9WD_FEED_TOTAL` by exactly the seeded items with deadlines outside it. The reading says so in words.
- [claude] `Overdue now` equals `COUNTIF(IS9WD_DEL_CHECK,"Overdue")` and equals the rows the data tab shows flagged `Overdue`. Tick the worst one off: both fall by one in the same recalculation and the reading names the new worst.
- [claude] Clear one officer's items entirely: `Officers with nothing entered this week` rises by one and names them, that officer's `Attention` reads `Nothing entered for this week`, and the flag treatment fires on both.
- [claude] With `IS9WD_TODAY_OVERRIDE` set to the Sunday before week start, `IS9WD_STATS_ELAPSED` is 0, `Completion against pace` reads `the week has not started`, and nothing is flagged behind pace. Move the override to the Thursday: elapsed reads 4 and an officer at 25% flags.
- [claude] `On time` is blank for every officer with `Judged` below `IS9WD_STATS_MIN_JUDGED`, those officers collect at the bottom of the ranked block in muted text with no rank number, and the note names the minimum. Seed a fourth past-deadline item for one of them: a rate and a rank appear.
- [claude] **The `MMULT` on-time formula equals a hand check.** For one officer, count by hand the past-deadline titled items and how many were ticked before the end of the deadline day, and confirm the cell matches. Then confirm the fourteen-cell `SUMPRODUCT` fallback returns the same fourteen values (6A.6).
- [claude] **The broadcast assumption holds.** Confirm `COUNTIFS`, `SUMIFS`, `MINIFS`, `MAXIFS` and `SUMIF` each return fourteen values under `ARRAYFORMULA` on the live sheet, not one repeated value. If `MINIFS` or `MAXIFS` does not broadcast, the fallback is fourteen single cells per column and the cost figures in 6A.13 rise.
- [claude] Break a named range a view reads: `!ERR` appears, the tab's own error count counts it, the self test fails, and **`Ready for Canva` does not move.** Then break one the feed reads: readiness does move. **This pair is what proves a view cannot hold the carousel.**
- [claude] Force one gate to HOLD by clearing this week's sign-off: `IS9WD_STATS_GATE_STATE` shows exactly one HOLD, row 16's reading names that gate, and `IS9WD_STATS_GATE_AGREE` reads `OK`. Then edit the gate list to omit a gate and confirm `_GATE_AGREE` catches the disagreement.
- [claude] `Weeks of row room left` against a known created-at distribution matches a hand calculation, and flags below `IS9WD_STATS_ROOM_WEEKS_WARN`.
- [claude] With the Archive empty, every trend row reads `Not archived`, the sparkline cell is blank, and the note tells Ethan to switch `ARCHIVE_WEEK` on. Run `Archive this week` once: that week's row flips to `Snapshot only` with a real `Published` count. Retire an accomplished item whose deadline was in that week: the row flips to `Archived` and `Accomplished` reads 1.
- [claude] A trend week inside a previous trimester numbers against **its own** trimester, not the current one.
- [claude] **Recalculation time.** Tick an item through the app with the seed loaded and time until the officer table settles. Record the figure; it is the number 6A.13's cut list is judged against.

**`04 | Officer Tables`**

- [claude] Fourteen blocks in hierarchy order, the President first and Finance last. Each band names the officer, the position, the person and the counts, and each count matches the statistics tab cell it reads.
- [claude] A block's items are in deadline order then ID order, active before accomplished, and **the order matches that committee's `Rank` order on the data tab** for its active items. Sort the data tab by Deadline: the block does not change.
- [claude] Accomplished rows read muted across all seven columns and their `Status` column shows the label. **Rename the status `Accomplished` to `Done` in Configuration and re-run the build: the rows are still muted**, because the rule reads the derived flag and not the label.
- [claude] An officer with nothing shows one sentence, not twelve blank banded rows, and the band says `no deliverables entered`.
- [claude] **Overflow is never silent.** Give one officer 20 titled items with `IS9WD_STATS_OFFICER_ROWS` at 13: twelve rows show, the notice row reads `+ 8 more not shown here` with the flag treatment, the band reads `8 not shown below`, row 3 names the officer and the number, and the self test's anti-truncation assertion passes. Remove eight items: all three notices clear together.
- [claude] The tab fits a 1366 px window with no horizontal scroll, and the frozen rows keep the banner, the help line and the summary on screen at the bottom of the tab.
- [claude] A 41-character title pasted into a used row appears in the block's `Flag` column as `Title too long` with the flag treatment, so a blocking flag is visible without opening the data tab.
- [claude] Each block's item table is one consistent width, joinable on `ID`.

**Week rule**

- [auto] Override `2026-09-20` gives week start `2026-09-21`, week end `2026-09-27`, and week number `04` against the fixture term calendar (13.2). Override `2026-09-26` gives the same week. Override `2026-09-27` gives week start `2026-09-28`, which is week number `04` against the **live** term start `2026-09-07` (4.3). Both are asserted, because the pair is what proves the term start is the only thing moving.
- [claude] Clearing the override makes the feed track the real date. An override outside every trimester makes `In term` FALSE, renders `WEEK --`, and stops the dispatcher. Blanking Term 1's `End` does the same thing **inside** Term 1, which is the trap in 4.3 and is worth seeing once.
- [claude] `IS9WD_WEEK_NUMBER_OVERRIDE` set to `07` makes every printed week number read `07`: the week line, all nine taglines, the email subjects and the app. `B102` reads `SET: 07` and the Sunday brief names it. Clearing it restores the calculation. Nothing else changes, because only `B10` reads it (4.1).
- [claude] With the whole term calendar blank, `Week number` is **blank**, not a five digit number, and the week line reads `WEEK --`.

**Feed, carried over from v1**

- [claude] The Partnerships feed shows 10 visible slots in date order: slots 01 to 03 `W1` `#e9ebd4`, 04 to 07 `W2` `#8a64a9`, 08 to 10 `W3` `#085040`. Tagline ends `10 TASKS`.
- [claude] The overdue row is slot 01 of its committee with `Overdue: Fri, Sep 18`, and that committee's title page text reads `Overdue: Fri, Sep 18`.
- [claude] The empty committee shows Count 0 and `No deliverables this week`.

**Feed, new in v2**

Every readiness expectation below assumes **the current week's sign-off is set**, which the seed does (13.2). With it unset, `Ready for Canva` reads NO regardless of the items, which is the first check in this group.

- [claude] **Sign-off gate.** With no row for the current week start, `Ready for Canva: NO`, `C37` reads `Sign-off not set for this week`, and the four title page sign-off cells are blank. Write the row through the admin view: readiness flips to `YES` in the same recalculation, and the title page prints the name uppercased and the position as typed. Set a row for **next** week only: readiness stays NO, which is the case a naive "any sign-off exists" gate would pass.
- [claude] The sign-off store rejects nothing silently: a Tuesday `Week start` reads `Week start is not a Monday`, a second row for the same week reads `Duplicate week`, and `IS9WD_selfTest()` fails on either.
- [claude] The `Accomplished` row is absent from every feed block and does not count. The two `Open` rows in `Marketing and Advocacy` are present and counted.
- [claude] The two rows against `President` and `Executive Vice President for Operations` have a blank `Publish key`, a blank `Master page`, a blank `Slot key`, appear in **no** feed block and no officer row, and are **unflagged** as seeded, because both carry in-week deadlines (13.2). Now clear one of their deadlines: it flags `Missing deadline`, appears in Block D with a blank `Page`, and readiness still reads `YES`, which is the whole point of filtering the gate on `Publish key`. Restore the deadline. Both appear in the Sunday brief's separate block either way.
- [claude] **The readiness filter survives the new keying, which is the check the pagination review asked for first.** Clear the title of one active `Partnerships` item: it flags `Missing title`, it has no rank, so its `Part`, `Slot on page`, `Master page` and `Slot key` are all blank, and `Ready for Canva` reads **NO**. That is the case a readiness criterion keyed on a non-blank `Page` would have passed, because page is blank on a row with no rank (5.1, 6.4). Then clear the title of one of Ethan's own items: readiness returns to `YES`.
- [claude] Put 21 active items against `President`: none of them flags, none reaches any feed block, `Items not published` stays **0** because that entry does not publish, and `Ready for Canva` reads `YES`.
- [claude] **The continuation page**, with the overflow fixture (13.2). `Publications` reads `Count` 14, `Pages` 2 and `Not published` 0. The plan shows master pages 04 and 05 both `Used`, `Position` 03 and 04, `Part of Parts` 1 of 2 and 2 of 2, `First to Last` `01 to 10` and `11 to 14`, `Slots used` 10 and 4. `Carousel pages` reads 11, and `Export page list` reads `1,2,4,5,6,8,10,12,14,16,18`. Page 05's header row carries `PUBLICATIONS`, the same VP line as page 04 and a tagline ending `14 TASKS`, and its slot rows 01 to 04 are visible with `Item no` 11 to 14 while 05 to 10 are `Visible = FALSE`.
- [claude] **Exactly ten items is one page, not two.** Take `Publications` to exactly 10 active items: `Pages` reads 1, master page 05 is **not** `Used`, `Carousel pages` returns to 10, the export list loses the 5, and the tagline ends `10 TASKS` with no part marker. Add one item: everything above flips back. This is the off-by-one that would otherwise publish a blank slide for every committee that is exactly full.
- [claude] **Items past the publishable maximum.** Take `Publications` to 23 active items: `Count` reads 20, `Not published` reads 3, Block A's `Items not published` reads 3, both pages are `Used`, the taglines read `20 TASKS`, no item is flagged, every check cell reads `OK`, and `Ready for Canva` reads **YES**. The three items appear in the app, in the Monday email marked `Not on the carousel this week`, and in the Sunday brief as `Publications: 20 published, 23 active` (5.4, 8.5).
- [claude] **The whole carousel at its worst case.** Put 11 active items against each of the nine committees: all 19 master pages read `Used`, `Position` runs 01 to 19, `Carousel pages` reads 19, the export list is 19 ascending integers, `Plan check` reads `OK`, and nothing anywhere says the carousel is too long, because 19 is inside Instagram's 20 at every possible input (6.1 item 8).
- [claude] **The empty page switch.** Set `IS9WD_PUBLISH_EMPTY_PAGES` FALSE with `Finance` empty: master page 18 stops being `Used`, `Carousel pages` drops by one, the export list loses 18, and every other page's `Position` renumbers with no gap. Set it back TRUE and page 18 returns with `No deliverables this week` and a tagline ending `0 TASKS`.
- [claude] `Rows with a flag` reads exactly the number of flagged items: **2** with the seed alone, **3** with the cap row (13.2). Never 2000. The Block D row count equals it, and both counts include rows that do not publish.
- [claude] Block D is non-empty, sorted by page then slot, and the `Missing deadline` item is identifiable by its ID with a blank slot.
- [claude] **Block D is not sized for nine committees.** Put 20 active flagged items against each of the 14 directory entries, 280 in total, and confirm every one appears in Block D, `Rows with a flag` reads 280, the Block D row count equals it, and nothing is truncated (6.3).
- [claude] **Block D can now be overrun, and it says so.** Add 41 more flagged rows, 321 in total against a 320 row block: `Flag list check` reads `Flag list truncated by 1 rows`, `Ready for Canva` reads NO, and `IS9WD_selfTest()` fails. This is the hole the removed cap left, and the check is the patch (6.3).
- [claude] **The `Feed errors` scan covers the whole tab.** Break a named range used only by a **plan row** and then one used only by a **slot row's `Item no`** column: each one alone makes `Feed errors` non-zero, `Ready for Canva` NO, and `IS9WD_selfTest()` fail. Then confirm `IS9WD_selfTest()` asserts the scan's last cell is at or past both the plan block's last cell and Block D's last row, by shrinking the scan by one row on purpose and watching the self test fail (6.4).
- [claude] With any capacity number changed, `Build or repair workbook` re-sizes the plan block, the slot table, Block D and the `Feed errors` scan together, logs `Master pages required: <n>`, and `IS9WD_selfTest()` passes.
- [claude] **The keys and the sentinels.** Every block row's column A holds the key 6.3 specifies, no key except `HEADER` and `SENTINEL` repeats anywhere on the tab, and the nine sentinel rows read exactly `IS9WD FEED START v2`, `IS9WD BLOCK: READINESS`, `IS9WD BLOCK: TITLE`, `IS9WD BLOCK: COMMITTEES`, `IS9WD BLOCK: PLAN`, `IS9WD BLOCK: PAGES`, `IS9WD BLOCK: SLOTS`, `IS9WD BLOCK: FLAGS` and `IS9WD FEED END`. A connector read that does not contain `IS9WD FEED END` is a truncated read and the run stops (6.5).
- [claude] **Out of term and `Feed errors` now gate readiness** (A2 items 3 and 4, accepted). With an override outside every trimester, `Ready for Canva` reads NO and names `out of term`. With a broken named range, it reads NO and names `Feed errors`. Neither did in v1.
- [claude] Setting a slot 01 item to `Accomplished` promotes slot 02 to slot 01 on the next recalculation, with no gaps.
- [claude] Break a named range on purpose: `!ERR` appears, `Feed errors` counts it, and `IS9WD_selfTest()` fails.
- [auto] Week line, the three legend lines, the VP line and the tagline match section 6 byte for byte, including the double spaces. Remark text starts with U+00B7 then two spaces. A week spanning a month boundary renders `SEP 30 TO OCT 4`, **and a week spanning a year boundary renders `DEC 28 TO JAN 3`**, which is the case the `yyyy-mm` comparison in `IS9WD_RANGE_WEEK` exists for and the one a month-only comparison would render as `DEC 28 TO 3`.
- [claude] `A1` reads `01 | Canva Feed`, `B1` reads `IS9WD FEED START v2`, `C1` reads the feed-as-of date with `  |  TODAY OVERRIDE SET` appended while the override is set, and `D1` reads the feed stamp. Tick an item through the app and confirm the stamp changes, which is what lets the run detect drift between two reads (6.5).
- [claude] **The connector read, measured rather than assumed.** Read the whole workbook through the Drive connector against the real 579-row feed with the overflow fixture loaded and `05 | Archive` holding at least 500 rows, and confirm the response carries `IS9WD FEED END`, all 19 plan rows, all 180 slot rows, `IS9WD STATS END` and `IS9WD OFFICER TABLES END`. **Record whether hidden columns appear at all**, which decides whether `03 | Statistics` contributes 12 columns to the read or 23. **This is a gate, not a note** (6.5, 14): the feed roughly doubled this revision, the two views added 324 rows on top of it, and the truncation limit has never been measured.
- [ethan] One read-only Canva `read-design` call on `DAHVvLLgskQ`, confirming the page count and that the pages are **not** responsive (6.5). It has never been run, it gates the master build and the hide rule, and it is one call.
- [claude] `T25:T33` holds the uncapped count: at 23 active `Publications` items, the officer row reads `Count` 20 and `T` 23, and the Sunday brief says `Publications: 20 published, 23 active` (6.4, 8.5c).
- [auto] The tagline is built from the officer's `Count` and not from the cell beside it. A committee whose `Next due text` is `Next due Mon, Sep 28` and whose `Count` is 8 renders `...  |  8 TASKS`, never `...  |  Next due Mon, Sep 28 TASKS`. This is a golden-string test because v1's formula referenced the wrong column and the bug was invisible in the formula (6.4).
- [claude] Nothing on the feed tab is merged, each of the two Block C tables is one consistent width, and the plan block, the page header table and the slot table can each be joined on `Page` with no ambiguity (A2 item 2, accepted).
- [claude] With a Wednesday override, a Monday deadline in the current week prints `Due Mon, Sep 21` with `Window = W1` while `Check` reads `Overdue`. Expected, and the reason for the Sunday constraint in 6.5.

**Cross-origin transport, measured 2026-09-27**

- Recorded fact, not a check to run (7.1): from a page on `https://example.com` against a real `/exec` on the DLSU account, **in a desktop Chromium browser**, a GET with query parameters and a POST with `Content-Type: text/plain` both return readable JSON with `response.type` `cors` and the 302 followed automatically; an `application/json` POST fails with `TypeError: Failed to fetch`; any custom request header fails the same way. Written up in `docs/CORS-MEASUREMENT.md`, with the browser and version named there.
- [auto] The transport module sends exactly one header, `Content-Type: text/plain;charset=utf-8`, and no other, and the token appears only in the body. This is the regression guard: one added header breaks every write for all 14 people at once, with a browser-level `TypeError` and no readable envelope.
- [ethan] The same three requests from **a phone browser**, iOS Safari and Android Chrome, during Phase 5. **The 2026-09-27 measurement ran in a desktop Chromium browser**, so it is fact for that engine only; iOS Safari and Android Chrome remain unverified, and they are the clients all 13 link holders actually use (7.1). Record the browser versions in `docs/CORS-MEASUREMENT.md`. This check does not move and does not get waived by the desktop result.

**Deployment**

- [ethan] Manage deployments shows access `Anyone` and execute as `Me`, recorded verbatim through `Record the live deployment settings`, after **every** deployment.
- [ethan] From a signed-out browser profile, `/exec?action=ping` answers with no sign-in prompt. This is the only real proof of `ANYONE_ANONYMOUS`.
- [auto] After each redeploy, `/exec` still answers `ping`.

**App**

- [claude] A `member` token calling `addItem`, `editItem`, `deleteItem`, `rotateToken` or `setSignoff` gets `NOT_ALLOWED` and writes a log line. Calling `setStatus` with another entry's id gets `NOT_FOUND` and a log line. An EVP token behaves exactly like a committee VP's token. **Ethan's own directory row, `K10`, has no member token at all**: `Show the links` reports it as `Admin link`, and every email to him carries the admin link and no second link (4.8, 8.5).
- [claude] `setSignoff` from the admin token writes the row, stamps `Set at`, returns the recomputed readiness string, and replaces rather than duplicates on a second call for the same week. A non-Monday `weekStart` returns `VALIDATION`.
- [claude] Undo window: a tick then an untick inside `IS9WD_UNDO_SECONDS` both succeed. With `IS9WD_UNDO_SECONDS` set to 1, the same untick a moment later returns `UNDO_EXPIRED`, writes nothing and logs. The admin token unticks the same item with no window. With `IS9WD_UNDO_SECONDS` at 0, no member link can untick anything. An untick is never refused for a count, because there is no cap (5.4).
- [claude] A revoked token gets `REVOKED`. A made-up token, an empty token, a whitespace token, and a token submitted while its stored value is missing all get `BAD_TOKEN`.
- [auto] `IS9WD_tokenLookup` returns null for `""`, `"   "`, a 25-character token, and a token with `i`, `l`, `o` or `u`.
- [claude] Setting the same status twice writes once and returns `NO_CHANGE`. Replaying the same `requestId` writes once. Replaying another caller's `requestId` does not return their data.
- [claude] Two `addItem` calls fired together produce two items with two different IDs and two different ranks, and neither is refused. At 20 active items a 21st `addItem` succeeds, returns `published: false` on the new item and `notPublished: 1` on the committee, and no error code is returned (5.4, 7.4).
- [claude] A 1 MB body and an unknown action name are both rejected cheaply. A forced throw inside an action returns a parseable `SERVER_ERROR` envelope, not an HTML error page.
- [claude] `IS9WD_APP_ON` FALSE returns `APP_OFF` in the standard envelope.
- [ethan] A member link opens on a phone, shows only that committee or office, and the checkbox works: one tap ticks, a second tap inside the undo window unticks, and the `Undo` affordance disappears when the window closes. The page is usable at 375 px and every tap target is at least 44 px. Airplane mode rolls the row back and says the change was not saved.

**Emails**

- [claude] Preflight lists all 14 directory addresses, the remaining quota, the test mode state and the link it would print, and sends nothing. The President's row shows the admin link, so exactly 13 member links appear in the list.
- [ethan] In TEST mode every send reaches the admin only, with the intended recipient printed at the top and `[TEST MODE]` in the subject. All four emails render in Gmail on a phone with no markup showing.
- [claude] The Monday job sends exactly one email per directory entry with items, including the two entries that have no Canva page, none to an entry without items, and marks any item past the publishable maximum `Not on the carousel this week`. The digest sends exactly one merged email per entry, and none to an entry with nothing in either section.
- [claude] A forced failure on the third recipient does not re-mail the first two on the next dispatcher pass.
- [claude] Every email's link matches `IS9WD_TRANSPORT` and the Configuration URLs, uses the `#/m/` path for a member and `#/a/` for Ethan, and the endpoint the built bundle calls equals `IS9WD_ENDPOINT_URL`. No email contains two links.
- [claude] The Sunday brief prints this week's sign-off, or `Sign-off not set for this week`, names `Today override` and `Week number override` whenever either is set, prints `Carousel pages`, `Master pages required` and `Export page list` every week, and names each of the seven readiness gates that is holding a NO (8.5c).
- [claude] With `IS9WD_QUOTA_RESERVE` above the remaining quota, every send aborts, logs and alerts once, and does not throw.
- [ethan] A forced error sends one alert, a second the same day sends none, and Google's trigger failure notice still arrives.

**Automation**

- [ethan] `Install automations` run by an account other than `IS9WD_AUTOMATION_OWNER` refuses and names the right account. Running it twice leaves one trigger.
- [claude] Two dispatcher runs in the same hour run each job once. A job whose window has passed is marked `missed`. A filled `Today override` stops the dispatcher rather than freezing it. `Remove automations` removes only this project's handler.

**Archive, protections, text**

- [claude] `Archive this week` twice in one week appends no duplicate. `Retire accomplished items` archives an item older than the window, clears its row, and never archives the same ID twice.
- [claude] An archived row's `Deadline` holds a real date that sorts and reformats, not the rendered `Due Mon, Sep 21` text, and its `Prepared by` and `Checked by` hold that week's sign-off names (10.1). Change the sign-off, archive a later week, and confirm the earlier row's names did not move.
- [claude] `Seed sample data` refuses to overwrite an existing row. Edit one seeded row, then `Clear sample data`: the edited row survives and is reported as skipped, every untouched seeded row goes, and both overrides and the fixture term start are restored.
- [claude] `List every protection` shows warning-only protections on exactly the ranges in 5.6 and nothing else.
- [auto] A search of every string the script writes, and of the whole React bundle, finds no em dash.
- [claude] A Viewer-level read of every shared surface contains no token.
- [auto] A search of the whole repo finds no `@dlsu.edu.ph` address, no `/exec` URL and no 26-character token. This is what keeps a public repo honest (2.6), and it runs before every commit, not only at review time.

### 13.4 Automated checks

- `node test/core.test.js`, `feed.test.js`, `schedule.test.js`, `token.test.js`, `api.test.js`. No npm dependencies. Each loads `IS9WD_Core.js` into a `vm` realm and mocks `Utilities.formatDate` for Asia/Manila, UTC+8, no DST.
- `api.test.js` covers `IS9WD_routeDecision_` and the envelope builders against a table of fake contexts: bad token, malformed token, revoked, a `member` calling each of the five admin actions including `setSignoff`, a `member` touching another committee, app off, out of term, rate limited, replayed requestId, another caller's requestId, lock refused, oversized body, unknown action. The role values it asserts are exactly `member` and `admin`; a test that still expects `vp` is a test that was not updated.
- `core.test.js` covers `IS9WD_undoAllowed` at the boundary: one second inside the window, one second outside, `undoSeconds` 0, and the admin role, which ignores all three. It also covers `IS9WD_signoffFor` against an empty store, a store with only a later week, a store with the matching week, and a duplicated week, and `IS9WD_normalizeText` against a value carrying a line break, a tab and outer spaces.
- `token.test.js` asserts the alphabet is exactly 32 characters with no `i`, `l`, `o`, `u`, that `IS9WD_newToken` returns 26 characters, that all 32 symbols appear across 100,000 tokens, and that no character shows bias beyond chance.
- `node test/emdash.test.js` scans every pushed source file, every string literal, and `app/dist` if present, for U+2014 and fails on any hit. It warns on U+2013 and U+2212.
- `app/`: `npm test` runs Vitest over `lib/errors.ts`, `lib/useTracker.ts` (optimistic apply, rollback, reconcile) and `lib/transport.ts` (envelope parsing, typed error mapping) with a mocked transport. No component snapshot tests.
- `IS9WD_selfTest()` in the sheet, and the list grew with the page plan:
  - every named range resolves and spans its full range, and `IS9WD_DIR_PAGE` does **not** resolve, because it is retired (4.8);
  - every schedule row parses;
  - all 14 directory rows have a key, a name and an address; exactly nine have `Publishes` TRUE; those nine hold the carousel orders 1 to 9 with no duplicate and no gap; the hierarchy column holds 1 to 14 with no repeat; and exactly 13 have a token, `K10` being the one that must not (4.8);
  - no row with content in B to F has a blank `Active` or a blank `Publish key`. `Rank`, `Part`, `Slot on page`, `Master page` and `Slot key` are **blank by contract** on an inactive or untitled row and on an item past the publishable maximum, so they are checked for consistency instead: a non-blank `Slot key` must equal its row's `Master page` and `Slot on page` joined, and no `Slot key` may appear twice;
  - **`Capacity check` reads `OK`** and `IS9WD_PUBLISH_MAX` equals `IS9WD_SLOTS_PER_PAGE * IS9WD_MAX_PARTS` (4.6). This one is a failure rather than a warning: every slot key in the workbook is arithmetic over those three numbers;
  - **`Plan check` reads `OK`**, the plan holds exactly `1 + publishing rows * IS9WD_MAX_PARTS` rows, no plan row's `Part` exceeds `IS9WD_MAX_PARTS`, the count of `Used` rows equals `Carousel pages`, the count of integers in `Export page list` equals it too, and that list is strictly ascending (6.4);
  - **`Flag list check` reads `OK`**, and Block D's row count equals `C4` and spans at least `14 * IS9WD_PUBLISH_MAX` rows (6.3);
  - **the `Feed errors` scan's last cell is at or past both the plan block's last cell and Block D's last row**, which is the assertion that catches a scan someone forgot to widen (6.4);
  - `C5` begins with `Ready for Canva: `, which is the error detection the scan gives up by skipping row 5;
  - all nine sentinel rows are present and spelled exactly as 6.3 lists them, and no machine key repeats except `HEADER` and `SENTINEL`, which repeat by design (6.3);
  - no title or remark contains a line break or a leading or trailing space (7.5);
  - the four urgency hex cells match `#RRGGBB` (4.2);
  - the script time zone equals the spreadsheet's (2.4);
  - the sign-off store has no non-Monday and no duplicate week, and the current week's row exists;
  - the feed has no `#REF!`, `#N/A` or `!ERR`;
  - the term calendar is sane and each filled trimester has both a start and an end;
  - the endpoint answers `ping`; the remaining mail quota.

  And the assertions the two views add, in the order the suite runs them:

  - **the nine tabs are in the order section 3 lists**, `01 | Canva Feed` is the second, and the seven numbered tabs hold positions 1 to 7;
  - **`_Engine`, `_Views` and `06 | Log` are hidden and `01 | Canva Feed` is not**, the last in a sentence of its own, because whether the Drive connector reads a hidden tab is unmeasured and the Sunday run depends on that one tab;
  - **the cream rule, on both settings tabs, cell by cell**: every Ethan owned or append owned cell carries the fill `#e9ebd4` and a note, every calculated cell carries neither and carries the calculated note instead, every input row carries visible hint text in column C, and every block carries its plain English line in the row under its band. A workbook that passes every other check and fails this one is correct and unreadable, which is the failure the 2026-09-27 revision was about;
  - **the two halves of the directory hold the same fourteen keys in the same order**, because they are joined by row position and a mismatch would give an officer somebody else's slide number;
  - **`03 | Statistics` holds exactly as many charts as `IS9WD_STATS_CHARTS` declares**, no two on one anchor row, every one inside its own reserved band, and every caption row non-blank. This is the assertion for the failure that compounds silently: `insertChart` appends, so a build run five times would leave fifteen;
  - **no column on `03 | Statistics` is hidden**, because the helper band is on `_Views` now and a hidden column there would be hiding a KPI tile or a chart caption;
  - **`_Views` reaches its end row and its last column, names itself in `A1`, ends on `IS9WD VIEWS END`, and its own error count reads 0**, with `Checks > Rebuild the views` named as the fix, because a broken helper band reads as a blank dashboard rather than as an error;
  - **no tab freezes a column**, `IS9WD_FREEZE` asks no tab to, and every tab freezes exactly the header rows it names, the four on `02 | Deliverables` included. Ethan's instruction of 2026-09-27 made testable;
  - both views reach their end row and their last column, carry nothing below the end row, name themselves in `A1`, end on the literal `IS9WD STATS END` and `IS9WD OFFICER TABLES END`, and **contain no merged cell**;
  - no cell on either view reads as an error or as `!ERR`, and each tab's own error count reads 0 and agrees with the scan;
  - **`IS9WD_STATS_GATE_AGREE` reads `OK`**, every gate reads exactly `PASS` or `HOLD`, and the gates block holds as many rows as the gate list. This is the assertion that catches a stale copy of the seven gate list, and nothing else can;
  - `IS9WD_STATS_TREND_BUILT` equals `IS9WD_STATS_TREND_WEEKS`, `IS9WD_OT_ROWS_BUILT` equals `IS9WD_STATS_OFFICER_ROWS`, and the trend block spans the setting's own number of rows. A layout setting changed without a rebuild fails here rather than showing a stale tab;
  - `IS9WD_STATS_OFF_NAME` holds exactly the directory's names, once each, in `IS9WD_DIR_HIERARCHY` order;
  - `IS9WD_STATS_OFF_TOTAL` equals `_ACTIVE_ALL` plus `_DONE_ALL` on every row, and the fourteen `_ACTIVE_ALL` values sum to the feed's `Total active deliverables`. **This is the cross check that the two windows are not quietly confused**, and it also catches an item filed under a committee no directory row names;
  - `_ONTIME` is blank on every row where `_JUDGED` is below `IS9WD_STATS_MIN_JUDGED`, and between 0 and 1 elsewhere;
  - for each publishing officer, `_NOTPUB` equals the feed's `Not published` for the same carousel order, and it is blank on every officer who does not publish;
  - `_FIRSTDUE` recomputed from the items in JavaScript equals the cell on every officer, which is the assertion that catches `MINIFS` or `MAXIFS` failing to broadcast under `ARRAYFORMULA` and handing all fourteen rows the first officer's answer (6C.3);
  - the trend block holds exactly `IS9WD_STATS_TREND_WEEKS` rows, its week starts are Mondays seven days apart in ascending order, and the newest is `IS9WD_WEEK_START - 7`;
  - `04 | Officer Tables` holds one numbered section per directory row, each with a hierarchy ordinal literal in the hidden column, with no duplicate and no gap, and each heading names that ordinal's officer;
  - **no officer shows fewer rows than `_TOTAL` unless that block's notice row is filled, the notice's number equals `_TOTAL - (R - 1)`, and row 3 agrees with both.** This is the anti-silent-truncation assertion (6B.4);
  - every sort key in every block begins with `0` or `1` and its middle six characters parse as a number, so nothing on that tab keys on a status label;
  - warning only: every trend row reading `Not archived`, which is what an empty Archive looks like and is expected until an archive job is switched on; and `Weeks of row room left` below `IS9WD_STATS_ROOM_WEEKS_WARN`.

  **A throwaway Node harness stands behind all of this, and it is worth knowing it exists.** It loads every pushed source file into one `vm` context against a fake of the spreadsheet surface, runs `Build or repair workbook` **twice**, and then asserts over the captured cells what no test in a real sheet can assert cheaply: that the build raises no exception, that `user cells changed` is 0 on both runs, that every declared named range resolves and spans what the layout says, that the cream rule holds cell by cell on both settings tabs and column by column on the data tab, that exactly three charts exist after two builds, that every tab freezes the rows it should and no column, that the hidden tabs are hidden, and that no cell anywhere is painted `#1C2120`. Its fake **refuses a conditional format rule whose formula names another sheet**, which is the class of bug that left `04 | Officer Tables` empty, so that bug cannot come back silently. What it cannot do is evaluate a formula: it evaluates exactly one, the derived publishable maximum, because the build branches on it. Every check that needs a computed value is therefore still a 13.3 eye check or a live `IS9WD_selfTest()` run.

  Two assertions in the design were left to 13.3 rather than written here. **Readiness not moving when a view breaks** needs a forced break, so it is an acceptance check. **Every fill and font colour on both views being in `IS9WD_PALETTE`** is not assertable cheaply: a conditional format rule's colours are not readable back in a form worth comparing, so the palette is enforced where it is written, in `IS9WD_ROLE`, and no module outside `IS9WD_Config.js` names a hex.

  Writes a pass or fail line per check to `06 | Log`. Sends no email, writes no item.

---

## 14. Build phases and approval gates

Nothing in a later phase starts before its gate. "Ask" means ask Ethan in chat and wait for a clear yes. **Gate A's approval covers every subsequent `clasp push` to this one project**; any other Drive creation still needs a fresh ask.

**Phase 0, paperwork.** SPEC v2 replaces `SPEC.md`. CLAUDE.md is updated per the list handed over with this spec. Appendix B's research note points at `scratchpad/v1-findings-checklist.md`, and every section that contradicts one of its 40 items is corrected; the cross-check and the deliberate divergences are recorded at the end of Appendix B. No code, nothing in Drive.

> **Gate A.** Ethan approves SPEC v2 and: (1) **Term 1's end date, and the Term 2 and Term 3 start and end dates.** Term 1's start is settled at `2026-09-07` (4.3) and the sign-off is no longer a Gate A blank, since it is set weekly in the app (4.5). An **end** date for Term 1 is still required and is not optional: a blank `End` makes `In term` FALSE in the middle of the trimester and pauses every email, every app write and every week number. A provisional date is acceptable, a blank one is not. (2) Creating the Sheet and bound script in his DLSU Drive, and all later pushes to it. (3) That he pastes the 14 names and addresses into `00 | Configuration` himself, because they are personal data and are deliberately absent from this repo (4.8, 2.6). (4) Recorded as **answered on 2026-09-27**, not asked again: DLSU permits sharing a Drive file to a personal gmail, and Apps Script is enabled for his OU (2.2). Both stay on the risk list, because an administrator can change either later (11 risks 10 and 11). (5) The **repo name** under `is9-dlsu`, which fixes the Pages URL (2.6), and that the repo is public because the organisation is on GitHub Free. (6) A ruling on Appendix B. **Appendix A2 is already ruled on**, on 2026-09-27: eight items accepted and applied, one withdrawn, one skipped (A1 item 10, A2). What is left in A2 is four new proposals raised by the page plan, each shipping with an interim, so none of them blocks Gate A.

**Phase 1, local only.** Repo skeleton, `IS9WD_Core.js`, all six Node test files, `.claspignore`, `.gitignore`, `.clasp.json` placeholder, `appsscript.json`, `docs/` stubs. Nothing touches Drive or GitHub. Exit: every core test passes.

**Phase 2, the workbook.** Confirm `clasp --user dlsu show-authorized-user` reports the DLSU account. Create the Sheet in the chosen folder by hand, bind with `create-script --parentId`, then `IS9WD_Config.js`, `IS9WD_Setup.js`, `IS9WD_Menus.js`. Run `clasp show-file-status` before the first push. Run `Build or repair workbook` twice and prove the second run changes nothing. Exit [ethan]: nothing.

**Phase 3, the feed.** `IS9WD_Feed.js`, `IS9WD_Items.js` read paths, sample data, the full 13.3 workbook and feed checks. Exit [ethan]: reads the live feed.

**Two measurements belong to this phase and neither has ever been made.** Both are cheap, both are read only, and both gate work that is expensive to undo:

1. **The connector truncation limit, measured against the real tab** (6.5, 13.3). The feed's last row moved from 307 to 579 this revision, the two views added 324 rows, `05 | Archive` grows inside the same read, and a truncated read looks exactly like a smaller carousel. Load the overflow fixture, put at least 500 rows in the Archive, read the workbook through the Drive connector, and confirm `IS9WD FEED END`, all 19 plan rows, all 180 slot rows and both view end markers come back. Record whether hidden columns appear.
2. **One read-only Canva `read-design` call on `DAHVvLLgskQ`**, confirming the page count and that the pages are not responsive (6.5). It decides whether the hide rule of 6.5 is implementable at all, which is true of the v1 ten page master too, so it is not a Canva-phase question. If the pages are responsive, the fallback in 6.5 applies and the master may need rebuilding as fixed-page, which is a decision Ethan should have months before the first live run, not on a Sunday night.

> **Gate B.** Ethan reads the live feed and confirms every section 6 string. Any change he wants is agreed here, in writing, before anything depends on it. Gate B now also covers the two measurements above and **the master design**: the carousel is 19 physical pages built once by hand (6.3), the title page keeps its nine station indicators, and nothing in this build can create a page, so the master must exist before Phase 9 can run against it. Building it on a copy of the design first is free and cannot corrupt the master.

**Phase 4, retired.** This phase was `SPIKE S1`, the cross-origin spike. It ran on **2026-09-27** and its result is section 7.1: Shape A wins, `IS9WD_TRANSPORT` is `fetch`, and the write-up goes in `docs/CORS-MEASUREMENT.md`. Nothing is left to do here. The number is left empty rather than shifted, so every later phase and gate reference in this document still points where it did. **Gate C went with it:** no throwaway `ANYONE_ANONYMOUS` deployment and no throwaway public repo are needed. The one piece of the old Gate C that survives is an `[ethan]` check inside Phase 5, the same three requests from a phone browser (13.3).

**Phase 5, endpoint and app, private.** `IS9WD_Api.js`, `IS9WD_Items.js` write paths, and the whole `app/` tree. Shape A only: nothing from 7.7 is built. Tested against the `/dev` URL and a local `vite dev`, which only script editors can reach. Tokens generated, sent to nobody. Contains the one `[ethan]` check that survived the retired Phase 4: the same three cross-origin requests from iOS Safari and Android Chrome, because the 2026-09-27 measurement was a desktop Chromium one (7.1, 13.3).

**Phase 6, going live.** Re-authorize from the editor (2.4), create the real versioned deployment, paste `IS9WD_ENDPOINT_URL`, run `Record the live deployment settings`. Create the public repo under `is9-dlsu`, add `.github/workflows/pages.yml`, set the `VITE_IS9WD_BASE` and `VITE_IS9WD_ENDPOINT` repository variables, publish, paste `IS9WD_APP_BASE_URL`, which follows the repo name (2.6). Before the first push to GitHub, run the repo scan from 13.3 and confirm it finds no address, no `/exec` URL and no token. Release runbook: `push -f`, verify "Pushed N files", `create-version`, `update-deployment <id> --versionNumber <n>`, `ping`.

> **Gate D.** Ethan approves the public deployment and publishing to GitHub Pages under `is9-dlsu` in a public repo, having seen section 11 and accepted every risk. One VP opens their link on a phone and reports what they see before the other 12 link holders are told anything.

**Phase 7, emails in test mode.** `IS9WD_Emails.js`. Re-authorize (new `script.send_mail` use), cut a version, repoint. Preflight, then every email to Ethan alone with `IS9WD_TEST_MODE` TRUE. Quota guard and alert-once verified.

> **Gate E.** Ethan approves turning TEST mode off, having seen a sample of all four emails.

**Phase 8, automation.** `IS9WD_Automation.js`, `IS9WD_Archive.js`. Re-authorize (new `script.scriptapp` use), cut a version, repoint. Dispatcher run by hand first, then the hourly trigger.

> **Gate F.** Ethan approves installing the hourly trigger, from his own account, as `IS9WD_AUTOMATION_OWNER`.

**Phase 9, handover paperwork and rollout.** `canva/CANVA_RUN.md` with the Sunday constraint, the six run steps, the three run rules and the connector quirks from 6.5, and the design id. Confirm the master design holds `Master pages required` pages, which is 19, and do a dry run of the whole procedure **on a copy of the design** before touching `DAHVvLLgskQ`: the export list, the page-scoped pastes and the three cross checks, end to end, on a week with at least one committee over ten items. `docs/HANDOVER.md` from section 12, carrying **the scriptId and the Canva design id only**: the deployment id, the `/exec` URL and the Pages URL are settings, they live in `00 | Configuration`, and the file points there, because the repo is public (2.6). **Re-run the repo scan from 13.3 before committing anything in this phase**, since this is the phase whose whole job is writing down identifiers, and confirm it finds no address, no `/exec` URL, no Pages URL and no token. Test the Canva read from the DLSU account first and share the Sheet as Viewer to the reader address only if that read fails (2.2), then confirm the connector reads the feed either way. Set the first week's sign-off (4.5). The 13 member links sent one at a time, with a short note saying the link is theirs alone; Ethan keeps the admin link.

**Phase 10, optional, specified in section 15 and not built.**

> **Gate G.** Ethan asks for the Google Tasks mirror after living with the tool for at least one full trimester.

---

## 15. Optional later phase: the Google Tasks mirror

Specified so it can be built without re-researching. **Not built in Phases 0 to 9.**

Mirror **Ethan's own view** of the items into Google Tasks, one list per directory entry, and read back ticked tasks as terminal. The checklist model of 1.3 makes this a much closer fit than the four-status model it replaced. Verified facts that bound its shape:

- The Apps Script advanced Tasks service and the Tasks API only ever touch the task lists of the account that authorized the script (GOOGLENATIVE1, GOOGLENATIVE6). There is no `assignee` and no `userId`; `assignmentInfo` is output only (GOOGLENATIVE7). Task lists cannot be shared (GOOGLENATIVE12).
- So this is **Ethan's surface only**. It can never replace the member links. Anyone proposing otherwise needs domain-wide delegation from a DLSU super admin plus a service account, out of reach and out of scope (GOOGLENATIVE8, GOOGLENATIVE9).
- `Task.due` is RFC 3339 but **date-only in practice**: the time portion is discarded (GOOGLENATIVE3), which matches 5.1 exactly.
- `Task.title` takes 1,024 characters and `Task.notes` 8,192 (GOOGLENATIVE4), so 40 and 30 fit easily.
- `Task.status` is `needsAction` or `completed`, with `Task.completed` carrying the timestamp (GOOGLENATIVE5). That maps one to one onto the two statuses in 1.3: `needsAction` is `Open`, `completed` is `Accomplished`, and a pull can set either. The undo window does not apply, because a pull is an admin write.
- Tasks appear in the Tasks mobile apps and the Gmail, Calendar, Drive and Docs side panels, and dated tasks show on Google Calendar (GOOGLENATIVE11). Courtesy limit 50,000 queries a day (GOOGLENATIVE10).

Design, when it is built: 14 lists named `IS9 | Partnerships` and so on, one per directory entry, matched by title, ids cached in Document Properties as `IS9WD_TASKLIST_<key>`. Each task's notes carry `IS9WD:<id>` on the first line as the join key, never a title match. `IS9WD_tasksPush_()` upserts active items and deletes tasks for items no longer active. `IS9WD_tasksPull_()` reads `completed` tasks, maps them back by id, and writes the terminal status with `Status by = Admin (Tasks)`. Both run from the hourly dispatcher as two new schedule rows, `TASKS_PUSH` and `TASKS_PULL`, defaulting OFF. Adds `Tasks v1` to advanced services and `https://www.googleapis.com/auth/tasks` to `oauthScopes`, the only new dependency in the whole build, and therefore a re-authorize plus a new version (2.4). Risk to name at Gate G: two write surfaces for one field, so `IS9WD_tasksPull_` compares `Status at` against the task's `completed` timestamp and logs `Conflict, kept the app write` rather than guessing.

---

## Appendix A. Canva Feed contract

### A1. Consequences of the decided model, applied in this spec

Not proposals. They follow from the decided status field, the decided publish set, the removal of the cap and Ethan's rulings on A2, and Ethan should see them because they change values the Canva pages carry. **No printed string format changes** in items 1 to 9; items 10 to 16 are this revision's additions and each one says exactly what a reader of the carousel would notice.

1. **Count and "rows with a title" mean active rows with a title.** Accomplished items leave the feed and stop counting.
2. **`Ready for Canva: NO` fires on any blocking flag** (5.3), not only `Missing title` and `Missing deadline`. There are **eight** blocking flags. `Over cap` was the ninth and it is gone with the cap (item 11 below).
3. **`Count` and the tagline count are capped at `IS9WD_PUBLISH_MAX`, which is 20**, not 10. The feed never describes more items than a committee's pages can render. The uncapped number is written to the hidden helper band at `T25:T33`, one cell per publishing committee, and the Sunday brief reads it and prints both numbers when they differ (6.4, 8.5c). What did not fit is also printed as a number in the feed itself, per committee and in total (item 12 below).
4. **Block D gains two appended columns, `ID` and `Title`.** v1's four keep their relative positions. Without an ID, a `Missing title` row is unidentifiable, because it has no rank and therefore no slot and now no page either.
5. **`Total deliverables` counts active titled items only, and is relabelled `Total active deliverables`** (A2 item 7, accepted on 2026-09-27). It counts all 14 directory entries, not only the nine that publish.
6. **`Ready for Canva` reads only the rows that publish.** 14 people, nine publishing committees (4.8). A flag on one of Ethan's own items or an EVP's cannot make the carousel wrong, so it must not block the run. The filter is the new `Publish key` column (5.1), **not** a non-blank page number, because page is now blank on any row without a slot and the old criterion would have quietly stopped catching `Missing title` on a publishing committee.
7. **Three committee names are corrected** (4.8), so three Canva headlines change: `PUBLICATIONS`, `MEMBERSHIP` and `INVESTMENT STRATEGY & EDUCATION`. No string format changes; the source values do.
8. **The four sign-off values are per week, and `Ready for Canva` reads NO until this week's are set** (4.5). The four named ranges, and therefore the four title page formulas, are unchanged.
9. **Two more blocking flags, `Title too long` and `Remark too long`, plus `Unknown committee`** (5.3). A row v1 would have published overlong now holds the carousel.
10. **Ethan ruled on A2 on 2026-09-27, and eight of the ten numbered items are now applied** (A2). Four of them are visible on the tab rather than on a page: Block C is split into two tables, every block row carries a machine key in column A, sentinel rows mark the start, each block and the end, and `Feed errors` now holds readiness. Three are strings or labels: `0 TASKS` confirmed, `Next due: date missing` for a committee whose active items all have blank deadlines, and `Total active deliverables`. One is a gate: out of term forces `Ready for Canva: NO`, which also closes erratum E2. Item 5 was withdrawn the same day and item 10, a `Status` column on the slot rows, is skipped.
11. **There is no cap on items per person** (5.4). The entry-time refusal, the `CAP_REACHED` error code, the `Over cap` flag and the readiness block are all gone. `IS9WD_MAX_OPEN` is replaced by three numbers, `IS9WD_SLOTS_PER_PAGE`, `IS9WD_MAX_PARTS` and the derived `IS9WD_PUBLISH_MAX`, with a Check cell that fires when they disagree and holds readiness at NO (4.6). What a reader of the carousel notices: a committee with 14 items now publishes all 14 across two pages, where v1 refused the eleventh at the door.
12. **What does not publish is reported, in four places** (5.4): the app, that officer's Monday email marked `Not on the carousel this week`, the officer table's `Not published` column with Block A's `Items not published` total, and the Sunday brief as `Publications: 20 published, 23 active`. Nothing is silently dropped, which is the whole reason the cap could go.
13. **`Ready for Canva` now has seven gates, not two** (6.4): out of term, the weekly sign-off, `Capacity check`, `Plan check`, `Flag list check`, `Feed errors`, and the eight blocking flags on publishing rows. The Sunday brief names whichever ones are holding it, because four of the seven are conditions Ethan can see nowhere else.
14. **The carousel is computed and the master design is fixed at 19 pages** (6.3). Committee `i` owns master pages `1 + (i-1) * IS9WD_MAX_PARTS + p`. The nine committees' page numbers therefore change from 02 to 10 to **02, 04, 06, 08, 10, 12, 14, 16 and 18**, each with its continuation page immediately after it, and the week's carousel is between 10 and 19 slides exported in ascending page order. No page is added, deleted or reordered in a weekly run. What a reader notices: a committee that overflows gains a slide, and the slide reads as the same committee continued.
15. **A continuation page repeats its committee's headline, VP line and total count, and carries no part marker.** Decided by Ethan on 2026-09-27. So a committee with 14 items prints `14 TASKS` above page 1's ten slots and `14 TASKS` again above page 2's four, and the slots simply continue. The trade is deliberate and it is the one place this revision knowingly prints something a careful reader could misread: the count is the week's true size, not that page's slot count. A `PAGE 2 OF 2` suffix is A2 item 11, proposed and not applied.
16. **The publish set stays at the nine committees, on arithmetic** (6.1 item 8). Instagram carries up to 20 photos and videos in one manual carousel post and 10 through the API, both read on 2026-09-27. Nine committees give `1 + 9 + 9 = 19` in the worst case, safe at every possible input, so this build needs no slide gate and has none. Fourteen would give 29, which no setting can make safe. The President and the four EVPs keep items, links, emails and their own block in the Sunday brief.

### A2. Proposed, NOT applied, pending Ethan's approval

**Ethan ruled on every one of v1's ten numbered proposals on 2026-09-27.** The rulings are recorded here because A2 is where a future reader will look for them, and because the accepted ones are now load bearing in sections 6.3 and 6.4:

| Item | Ruling | Where it landed |
|---|---|---|
| 1. `0 TASKS` for an empty committee | **Accepted** | 6.1 item 4, A1 item 10. v1's own formula already produced it; it is now confirmed rather than assumed. |
| 2. Split Block C into two tables | **Accepted** | 6.3. Page headers rows 57 to 74, slot rows 77 to 256. It stopped being cosmetic when the header row went to 5 columns against a 13 column slot row, 18 times. |
| 3. `WEEK --` out of term, and out of term forces readiness NO | **Accepted, both halves** | 6.4. `WEEK --` can no longer reach a page, which closes erratum E2. |
| 4. `Feed errors` gates readiness | **Accepted** | 6.4. It also forced the `Feed errors` scan to skip row 5, or readiness and the scan would be a circular reference. |
| 5. Whether a missing sign-off gates readiness | **Withdrawn 2026-09-27**, superseded | 4.5, A1 item 8. The number is kept rather than reused. |
| 6. A string for the all-deadlines-blank case | **Accepted**: `Next due: date missing` | 6.4 officer row. |
| 7. Relabel to `Total active deliverables` | **Accepted** | 6.4 Block A. |
| 8. A machine key column | **Accepted** | 6.3. Row keys rather than cell keys, because every block is a table with a header row. It stopped being polish when the feed doubled in length. |
| 9. Sentinel rows | **Accepted**, with three added | 6.3. `IS9WD BLOCK: PLAN`, `IS9WD BLOCK: PAGES` and `IS9WD BLOCK: SLOTS` are new, because the blocks they mark are new. |
| 10. A `Status` column on the slot rows | **Skipped** | Not built. Interim stands: terminal items are filtered upstream and the feed does not say so. |

**Four new proposals, raised by the page plan, each with the interim behaviour that ships until Ethan rules.** Until he says yes, every printed string stays exactly as 6A to 6D and A1 describe it.

11. **A part marker in the tagline on a continuation page.** Proposed string: `WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 28 TO OCT 4  |  14 TASKS  |  PAGE 2 OF 2`, with `PAGE 1 OF 2` on the owner's first page, two spaces each side of every pipe. **Interim, and it is Ethan's 2026-09-27 decision rather than a default:** no marker, and both pages print the committee's total (A1 item 15). Cost of the interim, stated plainly: `14 TASKS` sits above four visible slots on page 2, and a reader who counts that page alone finds a number that does not match. Cost of the change: it is a new string in a frozen contract, and it appears only on the weeks a committee overflows, so it will be seen for the first time on a live carousel.
12. **The run overwrites the number text on a continuation page.** The master's frames read 01 to 10 on every page, so a committee's eleventh item publishes under a frame numbered 01. The feed already computes the right number in the slot row's `Item no` column, 11 to 20 as two digit text. **Interim:** the run does not touch number text, so item 11 publishes as 01 and `Item no` is used only as the run's cross check that the right items reached the right page (6.4). Cost of the interim: on an overflow week the numbering restarts, which is the second thing a careful reader would notice after the repeated count.
13. **A printed line on the page saying what did not publish.** Proposed string, in the last slot's remark position with the same middle dot and two spaces as every remark: `·  Plus 3 more, not on this page`. **Interim:** nothing prints on any page. The number is in the feed, in the app, in that officer's email and in the Sunday brief (A1 item 12), which is four places a person will see it and none of them is the carousel. Cost of the interim: a committee with 23 items publishes 20 and the audience is not told, which is exactly the transparency argument that removed the cap, applied one level further out.
14. **A non-blocking `Not published` value in the `Check` column** for a row past the publishable maximum. **Interim:** no flag. `Check` values are copied into the feed's slot rows and into Block D, so a new value is a change to the 6D contract, and it would put a row in the flags list that has nothing wrong with it. Cost of the interim: `Check` is silent about the one state a reader of the data tab cannot otherwise see, and the four counts in A1 item 12 are what cover it.

## Appendix B. Open decisions for Ethan

Everything decided on 2026-09-27 has been removed from this list: the status model (1.3), the roster (4.8), the cross-origin transport and the winning shape (7.1, 7.2), the IS9 GitHub organisation and its handle (2.6), the weekly sign-off (4.5), Term 1's start date (4.3), the two DLSU policy answers below, and, later the same day, the six pagination decisions: the publish set stays at nine, there is no cap on items, the carousel is computed, a continuation page repeats the committee's total with no part marker, hierarchy order governs the tracker's own lists, and every one of v1's ten A2 proposals is ruled on (A1, A2). What is left is what Ethan still has to answer.

**Research of record.** The v1 adversarial review, 77 findings of which 76 survived an adversarial verify pass, and the architecture panel both ran in this conversation; their digest file was lost from the session scratchpad, and their substance has been reconstructed as `scratchpad/v1-findings-checklist.md`, 40 numbered items, which is the reference this document is checked against and whose cross-check is recorded in the subsection at the end of this appendix, while `consumer-summary.txt`, `dlsu-webapp.json`, `todo-options.json` and `lovable-research.json` are still on disk and are cited throughout this document by claim id.

**Two DLSU answers, confirmed on 2026-09-27 and no longer open.** Ethan confirmed that DLSU permits sharing a Drive file to a personal gmail address, and that Apps Script is enabled for the OU his account sits in. Both were open questions in the previous draft and both were blocking something: the first the weekly Canva run, the second the whole app, the menu and every trigger. What survives is the residual risk, on the list at 11 risks 10 and 11: these are administrator settings rather than Ethan's, and either can change later with no notice and nothing in this build able to route around it. The sharing answer also matters less than it did, because 2.2 now tries a read with nothing shared at all first.

1. **Term 1's end date, and the Term 2 and Term 3 start and end dates.** Term 1's start is settled at `2026-09-07` (4.3). The rest are blank here, and all of them go into the Sheet, never into this repo. **This is the one blank left that blocks Gate A**, and the end dates are as load bearing as the starts: a blank `End` on Term 1 makes `IS9WD_IN_TERM` FALSE in the middle of the trimester, which blanks the week number, renders every week line and tagline `WEEK --`, pauses the dispatcher and refuses every app write with `OUT_OF_TERM`. If the official calendar is not published yet, enter a provisional end date and correct it later. The sign-off values have left this item: they are set weekly in the app (4.5).
2. **Two definitions of overdue: accept or align?** `Check` and every human view call an item overdue when its deadline is before effective today. The Canva `OVERDUE` window, unchanged from v1, is before week start. They disagree only for a deadline between week start and effective today, which on a Sunday read is never. Recommended: accept, because they mean different things and 6.5's Sunday constraint is what keeps the feed honest. Aligning them would change a v1 contract string's meaning and needs written approval.
3. **`ARCHIVE_WEEK` and `RETIRE_ACCOMPLISHED` both default OFF, and the removed cap made this urgent.** Turn either on, or keep both manual? Two separate costs if they stay off. `RETIRE_ACCOMPLISHED`: the old figure was 140 items a week, 14 entries at the 10 item cap, filling 2,000 rows in about three and a half months. The planning figure now is **280 a week**, 14 entries at the publishable maximum of 20, which fills 2,000 rows in **about seven weeks**, and **nothing caps it any more**, so a heavy trimester is faster than that. The `Rank` column gets slower the whole way, and its cost is no longer bounded by a cap either (5.5). Seven weeks is less than one trimester, so this is no longer a question with a deadline, it is a question past it: the recommendation is to turn `RETIRE_ACCOMPLISHED` on at Phase 8 rather than leave it manual. `ARCHIVE_WEEK`: the snapshot is the only record of what Canva actually published in a given week, and now also of who signed off on it (10.1), so leaving it off means that record depends on Ethan remembering to click on a Saturday.
4. **Links in every email, or once?** Repeating the link is convenient and spreads a semi-secret across more inboxes, now 13 member inboxes rather than nine. Alternative: one welcome email carrying the link, and every later email says "use your own link" with no URL.
5. **Sunday brief at 19:00 Manila.** Is that when Ethan actually does the Canva run? The brief only earns its place if it is read before the run, so its hour should sit an hour or two ahead of it. If the run is Sunday morning, the brief should move to Saturday evening and the week rule already supports that.
6. **Token rotation cadence.** The Sunday brief warns past `IS9WD_TOKEN_WARN_DAYS`, default 120. Is that the right number, or should all 14 tokens, the 13 member ones plus the admin one, rotate every trimester on principle? Rotating costs one menu click plus 13 emails.
7. **Should a person be able to add a short note when they tick an item?** Currently no. It costs one column, a longer view, and it turns the bootstrap escaping in 7.7 from robustness into a hard requirement if the fallback is ever taken.
8. **`Status by`.** Currently the directory `Full name` for the link that was used, which records the entry rather than the human. Alternative: a free text "your name" box, unverified but more informative.
9. **`noReply`.** Available on Workspace, default off so people can reply to Ethan. Keep it off?
10. **The case of the sign-off position label.** The picker prefills the position from the directory's `Position label`, which is upper case (`VICE PRESIDENT`), while the title page prints the prepared-by position **as typed** and v1's worked example shows `Vice President` (4.5). So an unedited prefill publishes an upper case position, and the field is editable either way. Decide once: prefill upper case and let the carousel carry it, prefill and expect Ethan to retype, or store a second title case label in the directory. Nothing about this is hidden at run time, but it is a per-week retype if the answer is the second one.
11. **Closed on 2026-09-27.** Every one of v1's ten A2 proposals is ruled on: eight accepted and applied, item 5 withdrawn, item 10 skipped (A2). Items 8 and 9, the machine key column and the sentinel rows, were the two that most changed the weekly run, from counting rows to looking up keys, and they are the reason the doubled feed is readable at all.
12. **A ruling on the four new A2 proposals**, each of which ships with an interim so none blocks the build (A2 items 11 to 14): a `PAGE 2 OF 2` marker in the tagline on a continuation page; whether the run overwrites the number text so item 11 reads 11 rather than 01; a printed `·  Plus 3 more, not on this page` line; and a non-blocking `Not published` value in the `Check` column. The first two are what a reader of an overflow week would notice, and there will be no overflow week until a committee passes ten items, so the cost of waiting is that the first one is also the first live test.
13. **Whether `RETIRE_ACCOMPLISHED` should turn on at Phase 8**, which item 3 above now recommends rather than asks.
14. **`Rows reserved per officer`: 13 or 21?** 13 shows 12 items per officer and costs 229 rows of the connector read; 21 guarantees nothing is ever hidden and costs 340 (6B.3). Shipped at 13, because the worked week has committees at 3 to 8 items and the read's truncation limit is the largest open risk in the build. It is one Configuration edit plus one `Build or repair workbook` to change, and the overflow notice is what tells Ethan the day it matters.
15. **Keep the ranked block?** `TRACK RECORD, RANKED` is the only workload-fair comparator in the workbook and it is a league table of fourteen people, readable by the Canva reader account (6A.6). Shipped, with a small sample suppressed rather than ranked and nothing reaching the feed, an email or Canva. Ethan's to reverse: deleting the block costs one edit and no other block reads it.
16. **Keep `Avg days`?** It is the weakest column on the officer block, it costs about 84,000 range reads, and it is first on the cut list if recalculation bites (6A.7, 6A.13). It is a data quality signal rather than a performance measure, and it is shipped on that basis.
17. **Accept the frozen-column loss on `02 | Deliverables`, `05 | Archive` and `06 | Log`?** The instruction was given workbook-wide and is applied workbook-wide (2.5, Appendix C). Those three tabs are wider than a screen, so scrolling right now loses the row's identity. The alternative is to apply the ban only where it costs nothing, which is the two views.

### v1 findings not carried into v2

All 40 items of `scratchpad/v1-findings-checklist.md` were walked against this document on 2026-09-27. Thirty-four are covered, several of them by fixes made in this revision: tab discovery by developer metadata (3), the idempotency rules against accumulation (2.5), the manifest time zone (2.4), hex validation (4.2), the guarded week number (4.1), `Title too long`, `Remark too long` and `Unknown committee` (5.3), protection descriptions and domain edit (5.6), the write-ownership map, the document lock on menu actions, the named version before destructive work and the seed and clear rules (9), the inbound trim rule (7.5), the year-crossing range check (13.3), the real archive deadline (10.1), and the two rules the Canva run must follow (6.5).

Six are **not** carried, each deliberately and each with its cost stated:

- **Item 4, the sort position of an undatable row.** The checklist asked for a titled row with a blank or text deadline to sort **last**, with a blank `Deadline text`, `Window` and hex. It sorts **first** and renders `Window = W1` with W1's colors (5.4, 6.4). The reason is visibility over tidiness, and the safety net is that both conditions are blocking flags, so such a row cannot reach a published page. If Ethan prefers last-and-blank, it is a change to one `Rank` formula and one `Window` formula, and it needs a blank-window value the contract does not define.
- **Item 10, a deadline typed without a year.** Stated in 5.1, flagged nowhere. A "deadline more than a year from today" rule was considered and not added, because a new flag name changes the blocking list, the readiness formula and three tests for a case the app cannot produce at all. The exposure is hand-typed rows near a year boundary.
- **Item 11, sentinels and a key column on the feed. Now carried in full**, by Ethan's ruling of 2026-09-27 (A2 items 8 and 9, accepted). The tab identifies itself in `A1`, nothing is merged, every block row carries a machine key in column A, and nine sentinel rows mark the start, each block and the end (6.3). The weekly run looks values up by key instead of counting rows, and a truncated read is detectable because `IS9WD FEED END` is missing from it. This moved from polish to prerequisite when the feed's last row went from 307 to 579.
- **Item 18, capping the Archive.** The dedupe guards and the tab order are carried (10.1). Nothing trims `05 | Archive`, which grows inside the same Drive read the feed depends on, against a truncation limit that is still UNTESTED (6.5). At some point this tab wants its own file.
- **Item 32, reporting who is not yet shared.** Dropped as obsolete: no directory member gets any Drive access in v2, so there is nothing to report. The one remaining share is conditional and done by hand (2.2).
- **Item 40, sequencing a second admin.** Dropped as obsolete: one editor, no per-range editor lists, so there is no second admin to sequence. The half that still applies, that removing an editor does not retract what they already hold, is 11 risk 14.

---

## Appendix C. Errata and rulings, added 2026-09-27 after the second audit

Six audit fixes were applied to this file directly (directory Check wording, the example token, the illustrative Pages URL, the job count in the section 0 diagram, the request envelope, and the sign-off range span). The following remain. Each is small, each is the builder's job, and none blocks Gate A.

**E1. The base seed does not pass readiness, by design.** The blank-deadline seed row sits in `Documentation`, carousel order 8, master pages 16 and 17, a published committee, so `Ready for Canva` reads NO on the base seed. State that in 13.2, and have each acceptance check that expects YES first give that row a deadline.

**E2. Readiness still ignores a blank week number.** The week number goes blank rather than negative and the week line renders `WEEK --`, but readiness does not gate on it, so a carousel can pass with no week number. Appendix A2 proposes the gate; Ethan rules.

**E3. The quota table counts job alerts only.** Request-path alerts are keyed per day and per error code, so a day with several distinct API failures adds one alert per code on top of the five job alerts.

**E4. The archive snapshot must resolve the sign-off by the week it is archiving**, through the store row whose week start matches, not through the current-week derived cells. `Archive this week` can be run on any day.

**E5. Both overrides surface in four places, not two:** the diagnostics block, the feed's `Feed as of` cell, the Sunday brief and the admin view. The Today override additionally pauses the dispatcher.

**E6. Resolved by this revision.** The stale "row 217" cross-reference is gone with the check that carried it; Block D now runs to row 578 and the check that matters is `Flag list check` (6.3).

**E7. The daily digest omits the sign-off block when this week's sign-off is unset**, the same rule the Monday email already states.

**E8. Erratum E2 is closed.** Readiness now reads NO out of term (A2 item 3, accepted), and a blank week number and a blank term are the same condition, so `WEEK --` can no longer reach a published page.

**E9. Block D's bound became a budget.** With no cap on items, 320 rows is a generous allowance rather than a proof, so `Flag list check` compares `Rows with a flag` against the block's row count, holds readiness at NO and fails the self test when the list is short (6.3). Nothing in v1 needed this, because the cap made the bound arithmetic.

**E10. The `Feed errors` scan gave up one cell to gain 272 rows.** It now skips row 5 as well as its own row, because readiness reads it and a scan covering readiness would be a circular reference. The self test asserts `C5` begins with `Ready for Canva: ` instead (6.4).

**E11. v1's tagline formula referenced the wrong cell**, `$D17` where `Count` was in C, so the shipped string would have read `...  |  Next due Mon, Sep 28 TASKS`. Corrected in 6.4 by looking the count up from the plan by page, and 13.3 now carries a golden-string test for it.

### Rulings

**R1. The test fixture keeps its own term start.** Every golden string carried from v1 is written for `WEEK 04` and `SEP 21 TO 27`, which needs term start 2026-08-31. Live Configuration uses 2026-09-07. Fixtures supply their own inputs; this is not a contradiction and neither value changes.

**R2. Term 1 needs an end date before Gate A.** A blank End makes `In term` FALSE mid-trimester, which pauses every job. A provisional date is enough and can be corrected later.

**R3. Sign-off position prefills in title case** (`Vice President for Partnerships`), editable, and prints as typed. The VP line on the committee pages stays uppercase, as the section 6 contract requires.

**R4. The Pages URL waits on the repo name.** The rule is in 2.6; Gate A collects the name.

**R5. Three flags are new since v1** (`Unknown committee`, `Title too long`, `Remark too long`) and each blocks readiness. No contract string changes, but a row v1 would have published can now hold the carousel. Recorded in Appendix A1 for Ethan to see rather than discover.

### Rulings added with the pagination revision, 2026-09-27

**R6. Hierarchy order is a column, not a re-sort of the directory.** Ethan chose hierarchy order for the tracker's own lists: the President, the four EVPs, then the nine committees. Physically reordering the directory rows would have renumbered every `Key`, and a key is the token's identity and is never edited (4.8, 7.3). So the block stays `K01` to `K14` in row order, `Hierarchy order` in column L is what every list a person reads sorts by, and the carousel keeps the nine committees in their existing order among themselves. Nothing about the President appearing first in the app and not at all on the carousel is accidental.

**R7. The page identity stays a two digit page number.** The pagination design proposed a new key of the form `K02.P2`, on the reasoning that a physical page number moves week to week. Under the fixed master mapping it does not: `1 + (i-1) * MAX_PARTS + p` is arithmetic over two integers that are written once and never rewritten, so master page 05 is Publications part 2 for the life of the term. Keeping the number preserves v1's `Page` field and every slot formula byte for byte in the officer table, the page header rows, the slot rows and Block D, and it avoids a new identifier string in a frozen contract for no gain. What replaced the design's key scheme is the machine key column of A2 item 8, which is strictly better for the reader: `C.P05.S01` names the block, the page and the slot, where a bare key named only the page.

**R8. `Publishes` and `Carousel order` are two columns on purpose, with three Check strings to keep them honest.** One column could have carried both facts, a non-blank ordinal meaning "publishes". Two columns is what makes flipping the publish set a checkbox rather than an arithmetic edit, and what lets a committee that leaves keep its ordinal so the master's pages do not renumber (4.8). The cost is that they can disagree, so the directory `Check` reads `Publishes with no carousel order`, `Carousel order duplicated` or `Carousel order out of range`, the feed's `Plan check` repeats all three, readiness reads NO, and the self test fails.

**R9. The A2 count, reconciled.** The task that produced this revision recorded that Ethan accepted nine of the ten A2 proposals and skipped the status column. Item 5 had already been withdrawn earlier the same day, so it cannot also have been accepted. What is recorded, item by item, in A2: **eight accepted** (1, 2, 3, 4, 6, 7, 8, 9), **one withdrawn** (5), **one skipped** (10). Nine of the ten numbered items therefore carry a ruling that changes the build, and item 10 is the only live proposal Ethan declined.

**R10. The review's fifth high finding needed no fix, and that is the point of it.** It asked for either a nine committee publish set or an endpoint slide check. The publish set stayed at nine, so the worst case is 19 slides against a limit of 20 and **no gate exists anywhere in this build**. The arithmetic is written out in 6.1 item 8 and repeated in 4.8, because the finding is only closed while the publish set is nine: a future president who raises it re-opens it, and `Master pages required` in the Sunday brief is the only thing that will say so.

**R11. Two things this revision does not resolve, both untested and both cheap.** The Drive connector's truncation limit has never been measured and this revision roughly doubles the feed. The Canva master has never been read, so whether its pages are responsive, and therefore whether the hide rule of 6.5 is implementable at all, is unknown. Both are Phase 3 gate items now (13.3, 14), and neither is a consequence of the pagination change: the second one applies to the v1 ten page master exactly as it applies to the nineteen page one.

---

## Appendix D. Errata from the pagination audit, 2026-09-27

Six fixes were applied to this file directly: the Feed errors scan now reaches column V, `Plan check` gains the master-pages condition, the resize list names all seven things it rewrites together, the write-ownership map spans J to Q, the Block C row arithmetic reads 198, and the Documentation seed row is identified by carousel order rather than a retired page number. The following remain, and each is the builder's job.

**E12. The seed's flag count sentence still mentions a cap row.** It should read: exactly 2 with the seed alone and 2 with the overflow fixture, because the overflow fixture adds no flag now that nothing is refused at entry. Never 2000.

**E13. The helper move is justified with a wrong fact.** The real reason: v1's helpers sat in N, O and P, one column past the widest block, and they move to R through V so that widening any block, or appending a column to the slot table, cannot reach them.

**E14. `Plan check` detects the three directory faults indirectly.** Each leaves a carousel order with no directory row, which it reports as `No committee for carousel order <n>`. Say that rather than implying it tests them directly.

**E15. Erratum E1 was never applied.** The `Documentation` seed row still has a blank deadline, so the base seed's readiness is NO. Either give it an in-week deadline and move the blank-deadline case to a named sub-step that blanks it deliberately, expects NO, then restores it, or state plainly in 13.2 that the base seed reads NO and have every check expecting YES set that deadline first.

### Open measurements, none of which block Gate A

**M1. The Drive connector's truncation limit is unmeasured**, and this revision roughly doubles the feed, from last row 307 to 579, while the Archive grows inside the same read and the two views add 324 rows (6A.2, 6B.3). Phase 3 measures it against a real read before the feed is trusted, and records whether hidden columns come back at all.

**M2. Whether the Canva master's pages are fixed or responsive is unknown.** On a responsive page the connector accepts only a handful of operations, which decides whether the run can do anything beyond replacing text. One read-only call settles it, and it is equally true of the existing 10 page master.

**M3. The 19 page master does not exist yet.** Nothing in this build can create a page, so it is hand work under Ethan's approval, with a dry run on a copy of the design before the first live week.

**M4. Four new Appendix A2 proposals await a ruling.** Each ships with an interim, so nothing blocks, but the interims only become visible in a week when a committee passes ten items.

**M5. The row budget now fills in about seven weeks** at 280 items a week, with nothing capping it. Turning on the retire-accomplished job at Phase 8 is the recommendation; it remains Ethan's call.

**R12. A section band is always `#085040` and a column header is always `#5d4170`, on every tab.** Section 5.1 originally had them the other way round on the data tab alone. The uniform rule wins, because an inconsistent header colour reads as a mistake rather than as a signal, and 5.1 is corrected in place.

**R13. `IS9WD_Core.js` is exempt from the trailing underscore convention.** Its names are pinned by the 233 tests in `test/core.test.js`, which were written from this document by a pass that never read the implementation, so renaming the API to satisfy a convention would cost the only independent check the project has. The exemption is safe because every Core function is pure: none reads or writes the workbook, sends mail, or touches Script Properties, so reaching one through a future `google.script.run` returns a computation over arguments the caller already supplied. Every function outside Core still carries the underscore, and every menu handler still opens with `IS9WD_assertUiContext_()`.

**R14. The Canva Feed painter sets Poppins over its whole block.** Setup applies the font before the feed is resized, so any row the feed adds below the old last row would otherwise come back in the default face on every build. One line in the painter, and the self test asserts the font on the feed's last row.

**R15. The frozen key column is withdrawn, on Ethan's instruction of 2026-09-27, and the ban is workbook-wide.** `IS9WD_FREEZE` reads `cols: 0` on all nine tabs, 2.5's "the key column where wide" is superseded, and the self test asserts it so it cannot come back by hand. **The cost is recorded here rather than rediscovered as a bug**: `02 | Deliverables` is 2,040 px of visible columns, `05 | Archive` 2,660 and `06 | Log` 1,930, so on those three, scrolling right loses the row's identity. It costs the two new views nothing, because both are sized to fit a 1366 px laptop without horizontal scroll, and on both the left edge carries the identifier and the verdict for exactly that reason. The frozen header row is Ethan's earlier instruction, it does not conflict, and it stays; `03 | Statistics` freezes two rows, `04 | Officer Tables` three and `02 | Deliverables` four, the fourth being the plain English hint row, so each tab always says what it is and what to type into it.

**R16. `00 | Configuration` holds only what a president sets, and every cell he fills is cream with a plain English sentence beside it and the same sentence as its own note.** Ethan's instruction of 2026-09-27, in his words: "for the things i need to encode, put a cream background on it, for the configuration and canva feed, explain what it does so in layman terms, as if i don't know anything about how to code. This is per cell i need to fill up in for". Implemented as 4.0, asserted in 13.4, and the reason banding is withdrawn from every block that holds an input column. The tab ends on row 67 rather than row 168.

**R17. Two hidden machine tabs, `_Engine` and `_Views`, and both take the page background as their tab colour.** Ethan's instruction: "you may add tabs for your use but hide it". `_Engine` takes every setting that exists for the code (4B) and `_Views` the helper band both computed views read (6C). Every value that moved keeps its named range, so nothing that reads a setting changed. The palette reuse decision 2.5 predicted is taken here: a tab outside the numbered reading order does not claim a colour from it.

**R18. `01 | Canva Feed` may never be hidden, and the self test says so in its own sentence.** Whether the Drive connector includes a hidden tab in its read is unmeasured, and the entire Sunday run depends on reading that tab. It is the one tab where hiding would risk the thing the build exists for.

**R19. `03 | Statistics` is a dashboard: eight KPI tiles, one table of sentences, the seven gates, three tables and three embedded charts.** Ethan's instruction: "i don't it to be a configuration, i want to see KPIs and Charts, literally for viewing". Every threshold moved to `_Engine` (4B.7), the hidden helper band and `OPERATIONAL HEALTH` and `SCHEDULED JOBS` moved to `_Views` (6C), and the single trend sparkline is replaced by chart 3. A flagged tile takes bold `#724485` text and no fill, which is this tab's one departure from the workbook's usual flag treatment: a cream filled tile reads as a box rather than as a number.

**R20. Every chart is removed before any is inserted, and a chart with no data is still inserted.** `insertChart` appends and has no replace form, so the first is the only thing standing between a build run twice and six stacked charts. The second is the honest half: a missing chart looks like a missing feature, so an empty plot ships with a caption saying what will fill it.

**R21. A conditional format rule may not reference another sheet, so every named range in every rule on a computed tab is wrapped in `INDIRECT`.** This is the bug that left `04 | Officer Tables` empty before this revision: Sheets refuses the rule at the moment it is applied, and the build dies several tabs after the mistake. The wrapper is applied to every named range including the local ones, because a wrapper applied selectively is a wrapper somebody forgets.

**R22. The directory is two blocks on two tabs, joined by row position.** The seven columns a president fills are on `00 | Configuration` and the five the code owns are on `_Engine`. The join is by index rather than by a lookup on the `Key`, because a lookup would make a mistyped key read as a different officer, which is a silent wrong answer, where a mismatch by index is a loud one the self test fails on.

**R23. On `02 | Deliverables` the per-cell explanation is per column, in a frozen hint row, plus a note on the header and the hint cell.** 17 columns times 2,000 rows is 34,000 notes, which is a minute of every build and a heavier file for a sentence that is already on screen one row above the column. The settings tabs, where a cell is a setting rather than a column, do carry a note per cell. The blocking flag rule on that tab loses its cream fill with it: bold strong purple text carries the signal, and a flagged row filled cream would say all seventeen cells were his to type into.

**R24. Column H of `04 | Officer Tables` stays hidden on a tab a person reads, and it is the one exception to "hidden helper columns move to a hidden tab".** It is not a helper: it is the eighth column of the very `SORT` that produces the seven visible ones, so it has to sit beside them on the same rows of the same sheet. The derived block on `02 | Deliverables`, columns K to Q, stays for the neighbouring reason: it is one row per item, and moving it to a hidden tab would add 2,000 rows to the connector read for the same seven hidden columns.

**R16. The two views never gate the Canva run, and the gates block is allowed to exist only because one cell checks it.** `Ready for Canva` stays exactly seven gates read from the feed. `03 | Statistics` carries a second reading of those seven, because the feed publishes the verdict and not the reason and the Sunday brief names the gate too late to fix it, and `IS9WD_STATS_GATE_AGREE` compares the two readings and fails the self test when they disagree. Without that cell the block would be a copy that can drift and read reassuringly forever. Recorded as a ruling because the instinct on reading a duplicated rule is to delete it, and the duplication here is deliberate and closed by a check.
