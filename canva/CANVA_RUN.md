# The Sunday Canva run

What a Claude session does every Sunday: read `02 | Canva Feed` through the Google Drive connector, and edit the text of the fifteen page Canva master design `DAHVvLLgskQ` from it. This file is the procedure. SPEC.md section 4 is the string contract it copies from, and `docs/BUILD-REFERENCE.md` sections 6.3 to 6.5 are where every cell named here is defined.

**The feed is valid for a run executed on a Sunday, or on any day with the Today override set to the Sunday being published from.** Week start is the Monday of the week containing tomorrow, so a Sunday read describes the week that starts the next morning, and every `Deadline text` and `Window` on the feed compares against that week start. Read on a Wednesday, an item that was due on Monday prints `Due Mon, Sep 28` with `Window = W1` while its `Flag` says `Overdue`: publish from that and a slide tells an officer an item is upcoming when it is two days late. The feed says which day it describes in its own first row, `Feed as of Sun, Sep 27`, and appends `  |  TODAY OVERRIDE SET` whenever the override in `01 | Configuration` (`Pretend today is a different date`, named `IS9WD_TODAY_OVERRIDE`) is non-blank. If that cell does not name the Sunday you are publishing from, stop before reading anything else.

## Three rules, before the first read

1. **Nothing in this run adds, deletes or reorders a page, and nothing deletes an element.** The master is drawn once by hand and reused every week. The run replaces text inside frames that already exist, and exports a page list. A frame the feed marks `Visible = FALSE` gets its blank strings pasted in and is otherwise left alone.
2. **Every paste is page scoped.** The headline, the VP line, the tagline and every slot string are pasted into one named page by its page index. Across fourteen near identical pages two officers with the same count share a byte identical tagline, and every unused slot shares identical blank text, so a design wide find and replace hits pages it was not aimed at. Only the week line and the three legends are design wide, and they live on page 1 alone.
3. **Copy, never assemble.** Every string is taken from its feed cell as is, with `\|` unescaped back to `|`, the double spaces kept, the middle dot kept, and the case kept. If a string looks wrong, the feed is wrong and the fix is in the workbook, not in the paste.

## What the connector hands you

`read_file_content` on the workbook returns markdown. Verified 2026-09-21 on a live multi tab IS9 Sheet, and unchanged since:

- Every tab is one table, separated by a blank line. **Tab names are not included.** The feed identifies itself: its cell `A1` reads `02 | Canva Feed`, and `B1` beside it reads `IS9WD FEED START v2`. Find that pair and you have found the tab.
- The first row of each table is an empty header placeholder. Do not count rows to find a cell; find it by the machine key in column A, which is why every block row carries one.
- A literal `|` inside a cell comes back as `\|`. The contract's `  |  ` separators arrive as `  \|  `. Unescape before pasting.
- Double spaces are preserved. Dates arrive as displayed. Nothing on the feed is merged, so you will never see `[merged]` there; if you do, you are on another tab.
- The feed sits ahead of every tab the read is allowed to lose, so a truncated read cuts the Archive and the Log before it cuts a contract string. Whether the read can still cut inside the feed is unmeasured, which is why the sentinels exist.

Take Block A, the plan, the page headers and every slot row **from one read of the whole tab**. The sheet is live while you work: an officer ticking an item changes a `Count`, which can flip a page's `Used` flag and rewrite the export list, and two reads can describe two different weeks. `D1` is the feed stamp, `Week start 2026-09-28  |  As of 2026-09-27  |  Counts 08-03-05-...`, one two digit count per officer. Record it. Before exporting, read the tab again and compare: a different stamp means the week moved under you, and the run starts over from the new read.

## The order of reading

Read in this order and stop at the first failure. Every row number below is the shipping layout, fourteen officers at fifteen slots on one page each, and is for orientation only: the key is the address.

### 1. The sentinels

Nine rows, column A reading `SENTINEL`, column B reading exactly:

| Row | Column B |
|---|---|
| 1 | `IS9WD FEED START v2` (beside `02 | Canva Feed` in A1) |
| 2 | `IS9WD BLOCK: READINESS` |
| 14 | `IS9WD BLOCK: TITLE` |
| 23 | `IS9WD BLOCK: COMMITTEES` |
| 39 | `IS9WD BLOCK: PLAN` |
| 56 | `IS9WD BLOCK: PAGES` |
| 72 | `IS9WD BLOCK: SLOTS` |
| 284 | `IS9WD BLOCK: FLAGS` |
| 536 | `IS9WD FEED END` |

All nine, in this order, in one read, or the read is truncated and the run stops. A short read looks exactly like a smaller carousel, and the end sentinel is the only thing that distinguishes them. Column C of each sentinel row carries a one line description of the block below it; it is help for a reader, not data.

### 2. Block A, the readiness summary

Rows 3 to 13. Key in A, label in B, value in C. Record all eleven before anything else.

| Key | Label | What it must read |
|---|---|---|
| `A.TOTAL` | Total active deliverables | a count, across all fourteen officers |
| `A.FLAGGED` | Rows with a flag | a count; it equals the number of rows in Block D |
| `A.READY` | Ready for Canva | `Ready for Canva: YES` |
| `A.ERRORS` | Feed errors | `0` |
| `A.PAGES` | Carousel pages | the number of `Used` plan rows; 15 at the shipping settings |
| `A.EXPORT` | Export page list | plain ascending integers, `1,2,3,4,5,6,7,8,9,10,11,12,13,14,15` at the shipping settings |
| `A.MASTER` | Master pages required | `15` |
| `A.NOTPUB` | Items not published | a count, normally `0`; a number here is not a fault |
| `A.CAPACITY` | Capacity check | `OK` |
| `A.PLAN` | Plan check | `OK` |
| `A.FLAGCAP` | Flag list check | `OK` |

Stop on `Ready for Canva: NO`, on any check cell that is not `OK`, on `Feed errors` above zero, and on a `Master pages required` that is not the page count the master was drawn with.

### 3. The seven gates

`Ready for Canva` is one cell with seven conditions behind it, and the feed prints the verdict rather than the reason. When it reads NO, this is how to see which gate holds, in the same read, without opening anything else:

| Gate | Where it shows on the feed | Who clears it |
|---|---|---|
| In term | the week line in Block B reads `WEEK --` | Ethan, trimester dates in `01 | Configuration` |
| Sign-off set for this week | Block B's four sign-off cells are blank | Ethan, in the app, from the picker over the fourteen |
| Capacity check | `A.CAPACITY` is not `OK` | Ethan, then `Build or repair workbook` |
| Plan check | `A.PLAN` names the problem, for example `No committee for carousel order 7` | Ethan, the directory on `01 | Configuration` |
| Flag list check | `A.FLAGCAP` reads `Flag list truncated by <n> rows` | `Build or repair workbook` |
| Feed errors | `A.ERRORS` is above zero and some cell on the tab reads `!ERR` | `Build or repair workbook`, then the self test |
| Blocking flags on publishing rows | Block D lists a row whose `Flag` is one of `Missing ID`, `Missing status`, `Unknown committee`, `Missing title`, `Missing deadline`, `Deadline not a date`, `Title too long`, `Remark too long` | Ethan, on `03 | Deliverables` |

A NO stops the run. Nothing in this procedure clears a gate; the Sunday brief already told Ethan which one is holding, and the run resumes with a fresh read after he fixes it. `Overdue` is a flag but not a blocking one: an overdue item publishes, with `Overdue: Fri, Sep 25` as its deadline text and `OVERDUE` as its window.

### 4. The title block and the officer block

**Block B, rows 15 to 22**, key in A, label in B, value in C. These are the eight strings on page 1:

| Key | Label |
|---|---|
| `B.WEEKLINE` | Week line |
| `B.LEGEND1` | Legend 1 |
| `B.LEGEND2` | Legend 2 |
| `B.LEGEND3` | Legend 3 |
| `B.PREPNAME` | Prepared by name, uppercase |
| `B.PREPPOS` | Prepared by position, as typed |
| `B.CHKNAME` | Checked by name, uppercase |
| `B.CHKPOS` | Checked by position, as typed |

**The officer table, header on row 24, rows 25 to 38**, fourteen rows in carousel order, which is hierarchy order: the President, the four EVPs, then the nine committees. Columns A to I: `Key` `Page` `Committee` `Count` `Next due text` `Station hex` `Number text hex` `Pages` `Not published`.

- `Key` is `B.C01` to `B.C14`. `Page` is the officer's master page, `02` for order 1 through `15` for order 14.
- `Committee` is uppercase, exactly as the headline prints it: `PRESIDENT`, `EXECUTIVE VICE PRESIDENT FOR EXTERNALS`, `MARKETING AND ADVOCACY`.
- `Count` is the number of active titled items that fit the slide, at most fifteen. `Not published` is how many did not fit. The two hex values are the colour of that officer's most urgent window, for the station indicator on page 1.
- `Next due text` is one of `Next due Mon, Sep 28`, `Overdue: Fri, Sep 25` (the earliest overdue date), `No deliverables this week` (count 0) or `Next due: date missing` (every active item undated, which cannot pass the gates).
- `Pages` is always `1` at the shipping settings. Stop if any row reads otherwise: the master has one page per officer.

### 5. The page plan and the page headers

**The plan, header on row 40, rows 41 to 55**, one row per physical master page, `PLAN.P01` to `PLAN.P15`. Columns A to L: `Key` `Page` `Used` `Position` `Committee` `VP line` `Part` `Parts` `First item no` `Last item no` `Slots used` `Count`. `PLAN.P01` is the title page.

Keep the `Used` rows in `Position` order. Assert three things before touching Canva:

- the number of `Used` rows equals `Carousel pages`;
- the number of integers in `Export page list` equals `Carousel pages`;
- `Export page list` is strictly ascending.

Any mismatch means the read was cut inside the plan, and the run stops. At the shipping settings all fifteen rows are `Used`, `Position` equals `Page` on every row, and the export list is 1 to 15. A row is `Used = FALSE` only when `Publish a page for an officer with no items` is unticked in `_Engine` and that officer has nothing this week; then `Position` renumbers with no gap and the export list is shorter, and both of those are what you follow.

**The page headers, header on row 57, rows 58 to 71**, `C.P02.HEAD` to `C.P15.HEAD`. Columns A to E: `Key` `Page` `Headline` `VP line` `Tagline`. One row per officer page, used or not. The tagline's count is the plan's `Count` for that page, which is the count that fit, so a reader who counts the lines on the slide gets the number in the headline.

### 6. The slots

Header on row 73, rows 74 to 283: fifteen rows per officer page, `C.P02.S01` to `C.P15.S15`, in page then slot order. Page `02` is rows 74 to 88 and page `15` is rows 269 to 283. Columns A to M: `Key` `Page` `Slot` `Visible` `Title` `Deadline text` `Remark visible` `Remark text` `Window` `Station hex` `Number text hex` `Flag` `Item no`.

- `Visible = TRUE` is an item. `Title`, `Deadline text` and, when `Remark visible` is TRUE, `Remark text` are pasted as they are. `Window` is `OVERDUE`, `W1`, `W2` or `W3`, and the two hex cells are that window's colours.
- `Visible = FALSE` is an unused frame. Its `Title`, `Deadline text` and `Remark text` are blank, its `Window` is blank, and blank is what gets pasted. The frame stays.
- `Item no` is the officer relative rank. At one page per officer it equals `Slot` on every visible row: `C.P08.S03` reads `03`. A slot whose `Item no` is not its `Slot` is the sign that the read is misaligned, and the run stops.
- `Flag` is copied from the item's `Check`. On a run that passed the gates it is blank or `Overdue`.
- A visible slot with a blank `Deadline text` and `Window = W1` is an undated item; it cannot reach this point because `Missing deadline` blocks, so if you see one the gates were not read.

### 7. Block D, the flags list

Header on row 285, rows 286 to 535, then `IS9WD FEED END` on row 536. Columns A to G: `Key` `Page` `Committee` `Slot` `Flag` `ID` `Title`, sorted by page then slot. `Key` is `D.` plus the item id, `D.D0007`, or `D.R<row>` for a row that has no id yet. `Page` and `Slot` are blank on a row that has no slot, which is what a `Missing title` row looks like; its `ID` and `Title` identify it.

The row count equals `Rows with a flag`. Report every row to Ethan, in the reply, before Canva is opened, even on a YES: on a YES they are all `Overdue`, and he wants to know that too.

## The fifteen slides

The carousel is 1 title page plus 14 officer pages, always, at every input. Ethan ruled on 2026-09-28: no continuation pages, fifteen slots per slide, every officer on the carousel. Nothing a week can hold makes it longer or shorter than the master.

| Page | Owner |
|---|---|
| 1 | title page: week line, three legends, prepared by, checked by, one station indicator per officer |
| 2 | the President |
| 3 to 6 | the four EVPs, Externals, Internals, Investments, Operations |
| 7 to 15 | the nine committees, Partnerships through Finance, in the directory's carousel order |

A page is identified by its owner, and its number is the owner's carousel order plus one. That order is a column on `_Engine`, written once by `Checks > Switch the carousel to all fourteen`, and the self test compares it to the shipping set row by row. It is a claim on a page somebody drew by hand, which is why the run never numbers anything itself: it follows `Page` on the plan row.

An officer holding more than fifteen active items shows fifteen. The rest live in the app, in the Monday email marked `Not on the carousel this week`, and in the Sunday brief, and the feed counts them in `Not published` on the officer row and `Items not published` in Block A. The tagline prints the count that fit, not the count held. An officer with nothing shows a page whose slots are all `Visible = FALSE`, whose officer row reads `No deliverables this week`, and whose tagline ends `0 TASKS`.

## The contract strings

Word for word from SPEC.md section 4, and they do not change without Ethan's approval. Two spaces each side of every pipe, uppercase where shown, a middle dot (U+00B7) then two spaces before a remark, `1 TASK` singular.

```
Week line       WEEK 04  |  SEP 28 TO OCT 4  |  A.Y. 2026 - 2027
Legend 1        DUE SEP 28 TO 29
Legend 2        DUE SEP 30 TO OCT 4
Legend 3        DUE AFTER OCT 4
Prepared by     JUAN DELA CRUZ          name uppercase
                Vice President          position as typed
Checked by      the same pair
Headline        MARKETING AND ADVOCACY
VP line         JUAN DELA CRUZ  |  VICE PRESIDENT
Tagline         WEEKLY DELIVERABLES  |  WEEK 04  |  SEP 28 TO OCT 4  |  10 TASKS
Deadline text   Due Mon, Sep 28
                Overdue: Fri, Sep 25
Remark text     ·  Send final name to Publication
```

A range inside one month reads `SEP 21 TO 27`; across a month boundary it reads `SEP 30 TO OCT 4`. Out of term the week line reads `WEEK --`, and readiness is already NO. In the connector's markdown every one of these pipes arrives as `\|`.

## What the run edits, and what it never does

The run edits what is already on a page and nothing else:

- **Text.** The eight strings on page 1. On each officer page the headline, the VP line, the tagline, and for each of the fifteen slots the title, the deadline text and the remark text. That is the whole list. A blank string is pasted as a blank string.
- **Colour, on an element that exists.** The two hex columns are the fill for a slot's station element and the colour of its number text, and the officer row's pair is the title page's station indicator for that officer. They are applied to the element already on the page, by its hex value from the feed, never by a hex from memory.

The run never: adds a page, deletes a page, reorders a page, deletes an element, draws an element, moves or resizes a frame, or renumbers a slot. Canva's connector can add a page but cannot duplicate one, and where an added page lands is undocumented, so a missing page is a stop and a hand rebuild, never a mid run repair.

## Editing, page by page

1. **Read the design once, read only, before any edit.** Call the read design operation on `DAHVvLLgskQ` with page metadata, no transaction open. It must hold at least `Master pages required` pages, which is 15, and its pages must not be reported as responsive. Fewer pages: stop, report the master's page count and the plan rows without a page. Responsive: stop and say so, because on a responsive page the editor accepts only text and fill replacements and refuses a whole batch if anything else is in it. This check is untested against the real master as of 2026-09-29.
2. **Open one editing transaction** and work page by page, in export list order. For each page read its content to get the locator id of each frame, then paste with the page scoped text replacement: page 1 from Block B, every officer page from its `C.Pnn.HEAD` row and its fifteen `C.Pnn.Snn` rows, matching frame to slot by position on the page. Keep the transaction open across pages.
3. **Three cross checks after the last paste, before the commit:** every pasted tagline's count equals that page's `Count` on the plan; every visible slot's `Item no` equals its `Slot`; and the number of pages you pasted equals `Carousel pages`.
4. **Re-read the feed and compare `D1`.** A changed stamp means an officer ticked something during the run: cancel the transaction, discard everything, and start again from the new read. Identical stamps: preview, then commit once. Cancel is always the right answer to any doubt; a cancelled transaction changes nothing.

How each frame on the master is told from its neighbours is fixed when the master is drawn, and the dry run on a copy of the design (SPEC section 8, phase 7) is where it is settled and written back here.

## Export

Call the export operation on `DAHVvLLgskQ` with its `pages` list set to `Export page list`, as integers, in the format the design reports it supports, one image per page. Confirm the returned page count equals `Carousel pages` before anything is posted or handed on. The carousel is not posted to Instagram; where the export goes is Ethan's, and the run ends when he has the files and the report.

## What the reply carries

In this order, so a reader can tell in one glance whether the run was clean:

1. `Ready for Canva`, `Feed as of` with its weekday, and the feed stamp.
2. `Carousel pages`, `Export page list`, `Master pages required`, `Items not published`.
3. Every Block D row, id and flag.
4. Every officer with `Not published` above zero, with both numbers from its row.
5. Which pages were pasted, and the three cross check results.
6. Anything that stopped the run, named by the sentinel, the gate or the cell that stopped it.

## Troubleshooting

**The read is truncated.** `IS9WD FEED END` is missing, a block has fewer rows than its layout, or the plan's `Used` count disagrees with the export list. Read again. If it is short twice, stop and say which sentinel was the last one seen; do not publish from a partial tab, because a partial slot table is a slide with items quietly missing. The tabs behind the feed are large and growing, and the fix, if the cut is inside the feed, belongs to Ethan and the build, not to this run.

**A stale override.** `Feed as of` carries `TODAY OVERRIDE SET`, or names a day that is not the Sunday being published from. Stop. Ethan clears `Pretend today is a different date` on `01 | Configuration` (or sets it to the right Sunday on purpose), and the run starts from a fresh read. A leftover override is the quietest way this workbook publishes the wrong week, which is why the feed prints it beside the strings. `Clear sample data` clears it too.

**A gate is holding.** `Ready for Canva: NO`. Find the gate in the table under step 3, name it in the reply, and stop. The Sunday brief names it as well, an hour before the run. Nothing here overrides a gate, including an out of term `WEEK --`, which is exactly the string the gate exists to keep off a page.

**The stamp changed mid run.** Cancel the transaction and start over from the new read. It costs a few minutes and it is the only thing that keeps the export list and the slot rows describing the same week.

**A pasted string shows a backslash.** The `\|` escape was copied. Unescape and paste again; there is no backslash in any contract string.

**The master has the wrong page count, or a page is missing.** Stop. Do not add a page. The master is rebuilt by hand under Ethan's approval, on a copy of the design first, after `Checks > Switch the carousel to all fourteen` has run and the self test is clean, because the page numbers come from the workbook and a page drawn against a different numbering is a page the run will skip.
