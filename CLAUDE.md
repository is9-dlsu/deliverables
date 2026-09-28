# IS9 Weekly Deliverables Tracker (Apps Script sistema)

Owner: Ethan Gabriel, President, Investors' Society 9th Administration (IS9), DLSU.

Spec: @SPEC.md
Build detail: `docs/BUILD-REFERENCE.md`. Read it when implementing. It is not auto-loaded, because it is 200,000 characters.

## Working rules

* Plan first. Ask before creating anything in Google Drive, before pushing code, before deploying a new web app version, and before any email leaves TEST mode.
* Settings live in the `00 | Configuration` tab, never hardcoded. Code and formulas read them through named ranges, never by cell address.
* Every URL is a Configuration setting, never a constant and never only in an old email.
* Tokens live in Script Properties, never in a Sheet cell. The Canva reader account can read every cell.
* The repo is public. No name, no address, no token, no `/exec` or Pages URL is ever committed. The pre-commit scan in the reference's section 13.3 enforces it.
* Setup must be idempotent and must never wipe Ethan-entered items, tokens, archive rows or log rows.
* Nothing keys on a status label. Statuses live in the Configuration status list, and code reads the derived `Active` flag.
* The `01 | Canva Feed` string formats in SPEC.md section 4 are a contract. Do not change them without Ethan's approval, because a weekly Canva update depends on them. Proposed changes go in the reference's Appendix A2 with an interim behaviour, never applied silently.
* Every function ends in `_` except `doGet`, `doPost`, `onOpen`, `onEdit`, the trigger handler `IS9WD_hourlyDispatch`, the RPC entry point and the menu handlers, because `google.script.run` exposes everything else and Apps Script calls those by name.
* No change to `appsscript.json` oauthScopes without re-authorizing from the editor, then cutting a new version and repointing the deployment. An anonymous caller can never answer an authorization prompt.
* Push with `clasp --user dlsu push -f` and confirm the pushed file count. A non-TTY shell silently skips a push when the manifest changed.
* No em dashes in any user-facing text.
* Replies to Ethan: terse, lead with risks or gaps, give a confidence rating, and name anything untested.
