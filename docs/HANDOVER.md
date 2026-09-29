# Handover: giving the tracker to the next president

This is the checklist SPEC.md section 7 promises. It moves the whole sistema from one
president's DLSU account to the next, inside the `dlsu.edu.ph` domain, and it is written for
somebody who has never opened Apps Script. Do the parts in order. Each step says what to click
and why the step exists, so that when Google moves a button the reason still tells you what to
look for.

Six things change hands, and they are handed over by six different mechanisms:

| Thing | How it moves |
|---|---|
| The Sheet and the script bound to it | Drive ownership transfer, Part A step 9 |
| The web app deployment | Does not move. The new owner deploys again, Part B step 6 |
| The GitHub organization, the repo and the Pages site | Organization ownership, Part A step 6. The repo itself is never transferred |
| The fourteen private links | Rotated by the new owner, Part D |
| The Canva design | Shared in Canva, separately, Part E |
| The claude.ai project that runs the Sunday update | Rebuilt by the new owner, separately, Part E |

Nothing in this file is an address, a token, a deployment id or a link. Every one of those is a
cell in the Sheet, because this repo is public. When a step says "the /exec address", read it
from `01 | Configuration`, the row labelled `Web address the page talks to`, or from
`IS9 Deliverables > Copy the endpoint URL`.

## What survives the transfer and what does not

| Survives on its own | Has to be redone by the new owner |
|---|---|
| The Sheet, every tab, value, formula and named range | The web app deployment: it executes as whoever deployed it |
| The bound script and its Script Properties, which is where the fourteen tokens live | The hourly trigger: a trigger belongs to whoever installed it and is invisible to everyone else |
| `06 \| Archive`, `07 \| Log`, the sign-off store, the ID counter | The authorization: the script's permissions are granted per person |
| The GitHub repo, the Pages site and its address, because the organization owns them | `Your own email address`, `Reply-to email`, and the President's directory row |
| The sheet guards: they are warning-only and name no editor | Every one of the fourteen links, because the admin link must not stay with the outgoing president |

Two things break it and neither is recoverable by a click: moving the Sheet to a shared drive,
and moving it to an account outside `dlsu.edu.ph`. Both stop the web app until somebody
redeploys it. Do neither.

## Part A. The outgoing president, before anything moves

Do all of this while both DLSU accounts are still active. An ownership transfer needs a living
sender and a living receiver, and a suspended account can transfer nothing.

1. **Name a version.** In the Sheet: `File > Version history > Name current version`. Call it
   `Before handover` with the date. This is the undo for everything below.

2. **Tidy the week, optionally.** `IS9 Deliverables > Archive this week`, then
   `IS9 Deliverables > Retire accomplished items`. Neither is required. Both leave the new
   president a shorter data tab.

3. **Confirm test mode is ON.** Open `IS9 Deliverables > Emails`. The label reads
   `Test mode: ON  (click to turn OFF)` when it is on. If it reads
   `Test mode: OFF (click to turn ON)`, click it. While test mode is on, every email goes to the
   address in `Your own email address` and nothing reaches an officer. It stays on through the
   whole handover and is turned off only by the new owner, in Part F, after a preflight.

4. **Remove the hourly trigger.** `IS9 Deliverables > Automation > Remove automations`,
   confirm. This is the one step that cannot be done afterwards by anyone else. An installable
   trigger belongs to the account that created it and no other account can see it or delete it.
   Left in place it keeps firing every hour as the old account; once the new owner installs
   their own, the owner guard in `IS9WD_hourlyDispatch` makes the old one write a `SKIPPED`
   row to `07 | Log` every hour, and if the old account ever loses access it throws every hour
   and mails failure notices to a departed inbox.

5. **Confirm it is gone.** `IS9 Deliverables > Automation > Show automation status`. The first
   line must read `NO TRIGGER IS INSTALLED, so nothing runs by itself.`

6. **Make the new president an owner of the GitHub organization.** The organization `is9-dlsu`
   owns the repo and the Pages site, so ownership of the organization is what changes hands.
   Do not transfer the repo to a personal account and do not rename it: a Pages address follows
   the repo name and does not redirect, so a rename kills every link in every inbox at once.
   - Open the organization on GitHub, then its `People` tab.
   - `Invite member`, enter their GitHub username, and set the role to `Owner`. If they are
     already a member, open their row instead and use `Change role` to make them `Owner`.
   - Wait until they have accepted. An organization must keep at least one owner, so you cannot
     step down before they are in.
   - Then open your own row under `People` and either `Change role` to `Member` or
     `Remove from organization`.

7. **Share the Canva design.** The carousel is the design whose id SPEC.md section 1 names.
   In Canva, open it, click `Share`, add the new president's Canva account with `Can edit`.
   If your Canva team allows it, move the design into a team both of you belong to instead, so
   it does not die with your account. Do not make a copy: a copy has a new id, and the weekly
   procedure in `canva/CANVA_RUN.md` and SPEC.md section 1 both name the old one.

8. **Hand over the Sunday procedure.** `canva/CANVA_RUN.md` in the repo is the whole weekly
   Canva run. The claude.ai project that runs it cannot be transferred between accounts; the
   new president builds their own in Part E with that file as its instructions.

9. **Transfer ownership of the Sheet.** In Google Drive, right-click the Sheet, `Share`, find
   the new president in the list (add them as an Editor first if they are not there), open the
   role dropdown beside their name and choose `Transfer ownership`. Inside a Workspace domain
   the transfer is immediate. If Drive sends an invitation instead, the new owner must accept it
   from that email before Part B can start. The bound script goes with the Sheet: it is part of
   the file.

10. **Keep nothing.** After step 9 you are an editor of the Sheet. Ask the new owner to remove
    that access once Part D is done, or remove yourself. You hold the old admin link until the
    new owner rotates the links in Part D, which is why Part D is not optional.

## Part B. The incoming president: the Sheet and the script

1. **Confirm you own it.** Open the Sheet, click `Share`, and confirm your name carries the
   `Owner` role. If it does not, stop: nothing below works from an editor's account, because
   the deployment and the trigger would belong to the wrong person.

2. **Authorize the script as yourself.** The script asks for its permissions per person, so the
   outgoing president's grant does nothing for you.
   - `Extensions > Apps Script` opens the editor.
   - In the function dropdown beside `Run`, pick `onOpen` and click `Run`. It is the only
     menu function the dropdown lists: the editor hides every function whose name ends in an
     underscore, and every other one in this project does.
   - Click `Review permissions`, choose your DLSU account, and `Allow`. If Google says the app
     is unverified, use `Advanced` and continue; it is your own script, bound to your own Sheet.
   - The run logs one line saying no menu was built from the editor. That is the expected
     result. Every later menu click reuses this grant.

3. **Reload the Sheet.** The `IS9 Deliverables` menu appears after the reload.

4. **Fill in what is yours on `01 | Configuration`.** Every cell you type into on that tab is
   cream, with a sentence beside it saying what goes there.
   - `Your own email address`: your DLSU address. Your Sunday brief, every failure alert and
     everything test mode holds back come here. Leave it blank and nothing can be sent.
   - `THE PEOPLE`, row `K10`, the President: put your own `Full name` and `Email` there. The
     admin link is tied to this row. Update `Full name` and `Email` for every other officer who
     changed. Do not add, remove or reorder rows and never edit a `Key`: the links are tied to
     the keys.
   - `TRIMESTER DATES`: `First day (a Monday)` and `Last day` for the trimester in progress,
     and the next ones when DLSU publishes them. Do this now and not later: while no
     trimester covers the week, every job pauses, the week number is blank, and the app
     refuses every write from every phone, the sign-off in Part D included. A blank
     `Last day` on the trimester in progress does the same, so enter a generous later date
     and correct it rather than leaving it blank.
   - `Academic year, printed on the carousel`, under `WHAT YOU SET ABOUT THE WEEK`. It prints
     in the week line on every slide.
   - `Pretend today is a different date` and `Force a week number`, in the same block: clear
     both, before step 10 runs a pass. A leftover today override pauses nothing: every job
     keeps running on the real clock, and every email and the Canva feed describe the wrong
     week. A leftover week number is printed on every slide in place of the counted one.
   - `Test mode: send every email to me instead` stays ticked.
   - Leave `Web address of the officers' page` and `Web address the page talks to` alone for
     now. Steps 6 and 7 and Part C decide whether they change.
   Then `IS9 Deliverables > Checks > Check the term calendar`, and confirm the week number it
   reports is the week you are in.

5. **Fill in what is yours on `_Engine`.** It is hidden: `View > Hidden sheets > _Engine`.
   Under `MAIL AND APP PLUMBING`:
   - `Reply-to email`: your DLSU address, or blank for replies to reach the sending account.
   - `Sender display name`: leave it. It is the From name officers see.
   - `Canva reader email (Drive connector fallback)`: leave it blank for now. Part E fills it
     only if the Drive connector cannot read the Sheet from your DLSU account.
   - `Automation owner email`: do not type it. `Install automations` writes it in step 8, and
     the dispatcher compares it with the account each pass runs as.
   `Build or repair workbook` in step 9 hides `_Engine` again.

6. **Deploy the web app again, as yourself.** A bound web app executes as the account that
   deployed it, so until you do this every tick from every phone runs as the outgoing president.
   - In the editor: `Deploy > Manage deployments`.
   - If the live deployment is listed and has a pencil icon, click the pencil, set `Version` to
     `New version`, and `Deploy`. Editing the existing deployment keeps its address, so nothing
     else in the sistema changes. Copy the address it shows anyway and compare it with
     `Web address the page talks to` on `01 | Configuration`. Same address: go to step 7.
   - If the deployment is not listed, or the editor will not let you edit it, create one:
     `Deploy > New deployment`, the gear icon, `Web app`, `Execute as: Me`,
     `Who has access: Anyone`, `Deploy`, and authorize if asked. A new deployment has a new
     address ending in `/exec`. Paste it over `Web address the page talks to` on
     `01 | Configuration`, and do Part C step 2, because the officers' page carries the old
     address until the workflow writes the new one.
   - Never send anyone the address ending in `/dev`. Only editors of the script can open it.

7. **Prove the deployment is anonymous and record it.** Two checks, both by hand, because the
   script is forbidden to call its own address.
   - Open a private or signed-out browser window and paste the `/exec` address with
     `?action=ping` added to the end. It must answer a short block of JSON containing
     `"ok":true`. A Google sign-in page instead means `Who has access` is not `Anyone`: fix it
     in `Manage deployments` and deploy a new version.
   - `IS9 Deliverables > Checks > Record the live deployment settings`, and type the two values
     exactly as `Manage deployments` shows them: `Who has access`, then `Execute as`.
     `Execute as` must be you. The fourteen officers never hold Sheet access; the deployment's
     own identity is what reads and writes for them.

8. **Install the hourly trigger as yourself.** `IS9 Deliverables > Automation > Remove
   automations` first, which clears anything under your own account and reports
   `No automation trigger was installed.` if there was nothing, then
   `IS9 Deliverables > Automation > Install automations`. Then
   `IS9 Deliverables > Automation > Show automation status`: the line `Owner on record:` must
   name your address, and the same line says `you are` the same address. If they differ, a
   pass would stop without doing anything.

9. **Run the build.** `IS9 Deliverables > Build or repair workbook`, confirm. It repairs every
   formula, format, validation and named range, mints any missing token, and hides `_Engine`
   again. It never touches an item, a token that exists, an archive row or a log row. Run it
   again if it ran out of time; it is safe to repeat.

10. **Watch one pass.** `IS9 Deliverables > Automation > Run the dispatcher now`. Then open
    `00 | Dashboard`: the machine card shows the last run, test mode ON, and the mail quota. In
    test mode, anything a job sends comes to your own address.

## Part C. GitHub: the organization, the variable and the officers' page

1. **Accept the owner invitation** from Part A step 6 and confirm on the organization's
   `People` page that your role is `Owner`. The outgoing president steps down after that, not
   before.

2. **Update the endpoint variable, only if the `/exec` address changed in Part B step 6.**
   The page the officers open reads its `/exec` address from `app/endpoint.js`, and that file
   is not in the repo: the workflow `.github/workflows/pages.yml` writes it at publish time from
   a repository variable, so the address is never in git history.
   - Repo `Settings > Secrets and variables > Actions`, the `Variables` tab, the pencil beside
     `IS9WD_ENDPOINT`, paste the new `/exec` address, `Save`. It must be the same string as
     `Web address the page talks to` on `01 | Configuration`.
   - `Actions` tab, the workflow `Publish the officers page`, `Run workflow`, `Run workflow`.
     Wait for the green tick. The workflow refuses to publish if the variable is blank or is not
     an Apps Script `/exec` address, so a red run here is the guard working: read its message.
   - If the address did not change, skip this step. The published page is still correct.

3. **Confirm the page address.** Repo `Settings > Pages` shows the address the site is served
   from. It must equal `Web address of the officers' page` on `01 | Configuration`, without a
   trailing slash. It only differs if somebody renamed the repo, and then the old address is
   dead with no redirect: paste the new one into that cell, because every email builds every
   link from it. Do not rename the repo.

4. **Confirm the repo is still public and still clean.** A free organization can only publish
   Pages from a public repo. Open the repo's front page: it must say `Public`. Then look at the
   last few commits for anything personal; the pre-commit scan in `tools/hooks/pre-commit`
   catches an address, a token, a `/macros/s/` address and a Drive file id, and cannot catch a
   person's name.

5. **A local clone, only if you will change the code.** The Sheet and the page run without
   one. If you do clone:
   - `git clone` the repo, then inside it `git config core.hooksPath tools/hooks` so the leak
     scan and the em dash scan run before every commit. `node test/all.js` runs every test with
     no install step; there is no npm dependency anywhere.
   - `clasp login --user dlsu` in a browser, on your DLSU account. The Apps Script API switch
     at `script.google.com/home/usersettings` must be on for that account.
   - Create `.clasp.json` at the repo root, which is gitignored, holding two fields:
     `scriptId`, copied from the editor's `Project Settings`, and `rootDir` set to `src`.
   - `clasp --user dlsu show-file-status` must list only `appsscript.json` and the
     `IS9WD_*.js` files. Then `clasp --user dlsu push -f` and confirm the output says how many
     files were pushed: a non-TTY shell silently skips a push when the manifest changed.
   - A push changes nothing anyone sees until a version is cut and the deployment is repointed:
     `Deploy > Manage deployments`, pencil, `New version`, `Deploy`. Editing keeps the address.
     Creating a second deployment changes it and sends you back to step 2.
   - Never change `oauthScopes` in `appsscript.json` without re-authorizing from the editor
     first, then cutting a new version. An anonymous caller can never answer an authorization
     prompt, so a deployment with an unauthorized scope answers nothing.

## Part D. The fourteen links

Do this after Part C, because a link is the page address plus a token and the page address has
to be final first.

1. **Rotate every link.** `IS9 Deliverables > Links > Rotate every link`, confirm. All
   fourteen tokens are replaced, the thirteen member ones and the admin one, and every old link
   stops working at that instant, including the admin link the outgoing president still holds.
   Tokens live in Script Properties, never in a cell, so the Canva reader account and every
   editor of the Sheet see only the first six characters and the date on `_Engine`.

2. **Send each person their own link.** `IS9 Deliverables > Show the links` prints one line per
   officer. Send each line to that one person, one message each, with a note that the link is
   theirs alone: anyone holding it can tick that officer's items, which is the accepted risk in
   SPEC.md section 6, and the remedy for a leak is `Links > Rotate a link`.

3. **Keep the admin link.** `IS9 Deliverables > Open the app (admin)` shows it. Treat it like a
   password. It is the page with the admin role: every officer's items, and the sign-off.

4. **Set this week's sign-off.** Open the admin link on your phone. The `Sign-off for this
   week` card has a picker over the fourteen for `Prepared by` and `Checked by`. Save it.
   `Ready for Canva` reads NO until this week's sign-off is set, on purpose, because the
   alternative is printing last week's names. It is per week: set it every week, from the app.

5. **Remove the outgoing president's access to the Sheet**, if they have not removed
   themselves. `Share`, their row, `Remove access`.

## Part E. Canva and the Sunday run

1. **Confirm you can edit the design.** Open it in Canva from your own account. It must still
   hold every page `Master pages required` on `02 | Canva Feed` asks for, one title page and one
   page per officer, fifteen in all. Transferring the Sheet did not transfer the design, and a
   changed directory changes the page mapping: if you add or remove an officer, read SPEC.md
   section 3 before touching a page.

2. **Connect the Drive connector and test the read first.** In claude.ai, connect Google Drive
   to your DLSU account, then ask it to read `02 | Canva Feed` from the live Sheet. Its own
   first row says what it is. If the read works, leave `Canva reader email` on `_Engine`
   blank: that is the good outcome, because every share is a standing grant nobody reviews.
   Only if the DLSU account cannot read it: share the Sheet as `Viewer` to the address the
   connector can read from, by hand in `Share`, and record that address in
   `Canva reader email (Drive connector fallback)` on `_Engine`. Nothing else ever shares the
   file; the script never calls Drive.

3. **Connect the Canva connector** to the account that can edit the design.

4. **Build your own claude.ai project.** Paste `canva/CANVA_RUN.md` in as its instructions.
   The outgoing president's project stays with their account; nothing in it is needed beyond
   that file. Do a dry run on a copy of the design before the first live Sunday.

## Part F. Turning the mail on

Only the new owner does this, and only after reading what would go out.

1. `IS9 Deliverables > Emails > Preflight check`. It sends nothing. Read the top lines:
   `Test mode: ON, every email goes to` your address; `Sender:`; `Sign-off for this week: set`;
   `Rows without an ID: 0`. Then read every rendering below them exactly as Gmail will show it.
   The renderings name real officers from the directory, which is how you confirm step B4
   landed.

2. **One test send.** `IS9 Deliverables > Emails > Send Ethan's brief now`. The label names the
   previous president; it means the Sunday brief to the address in `Your own email address`.
   The dialog says where it is going before it goes. Confirm it arrives in your inbox and reads
   right on a phone.

3. **Turn test mode off.** `IS9 Deliverables > Emails > Test mode: ON  (click to turn OFF)`.
   The dialog counts the directory rows with an address and lists exactly who gets mail on the
   next run. Read that list against the directory. Confirm, and the next scheduled Monday
   list, evening digest and Sunday brief go to the real addresses.

## Final verification

Run all four. If any fails, test mode goes back on until it passes.

- [ ] `IS9 Deliverables > Checks > Run self test` reports no failure. The summary is also
      written to `Last self test result` on `_Engine` and shown on `00 | Dashboard`.
- [ ] `IS9 Deliverables > Emails > Preflight check` shows test mode as you left it, your
      address as the sender's reply-to, this week's sign-off set, and zero rows without an ID.
- [ ] The admin link from `IS9 Deliverables > Open the app (admin)` opens on your phone, lists
      every officer, and shows this week's sign-off as set.
- [ ] One test send arrived: the Sunday brief to your own address from Part F step 2, and, if
      it is a Monday or evening, one officer email while test mode was on.

Then, one week later, look at `00 | Dashboard` on a Sunday: the last run is under two hours
old, no job shows a failed status, and `Ready for Canva` reads YES with this week's sign-off.

## Where each thing lives

| Thing | Where |
|---|---|
| The `/exec` address | `01 \| Configuration`, `Web address the page talks to`; and the repo variable `IS9WD_ENDPOINT` |
| The officers' page address | `01 \| Configuration`, `Web address of the officers' page`; shown at repo `Settings > Pages` |
| The logo in every email's header and on the page | `app/mail/band.jpg` and `app/mail/logo.png` in the repo, published with the page; the emails read them at the page address above |
| Your address | `01 \| Configuration`, `Your own email address` |
| Reply-to, sender name, reader address, automation owner | `_Engine`, under `MAIL AND APP PLUMBING` |
| The fourteen tokens | Script Properties in the editor, `Project Settings`. Never a cell |
| The script id | The editor's `Project Settings`. Not in the repo |
| The Canva design id | SPEC.md section 1 and `canva/CANVA_RUN.md` |
| The deployment settings as last checked | `_Engine`, `Live deployment access last checked` |
| Every action anyone took | `07 \| Log`, hidden; `IS9 Deliverables > Emails > Show the log` |
