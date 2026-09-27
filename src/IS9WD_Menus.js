/**
 * =============================================================================
 *  IS9 · WEEKLY DELIVERABLES TRACKER · THE ONE MENU
 *  IS9WD_Menus.js, the only place the menu bar is built
 * =============================================================================
 *  Owner : Ethan Gabriel, President, Investors' Society (IS9), DLSU
 *  Spec  : docs/BUILD-REFERENCE.md 9 (the menu, item for item), 2.5 (function
 *          visibility, the UI guard, one onOpen), 5.6 (guards), 13.2 (seeding).
 *
 *  ONE onOpen, ONE menu. Apps Script allows a single onOpen per project, and a
 *  second createMenu with the same title produces a second menu rather than
 *  merging into the first. Every command in the project is therefore added here
 *  and nowhere else.
 *
 *  WHY THE UI GUARD IS THE LOAD BEARING LINE  ** READ BEFORE EDITING **
 *  google.script.run exposes server globals, not only the function you meant to
 *  expose, so 2.5 gives every function in the project a trailing underscore and
 *  then puts a second layer under the handlers that cannot have one: every
 *  handler's FIRST statement is IS9WD_assertUiContext_(), which throws unless a
 *  document UI is attached. A web app context has none, so an anonymous caller
 *  who guesses a handler name gets a refusal rather than a write. Keep that line
 *  first in every handler added below, before the lock, before the read, before
 *  anything.
 *
 *  WHY A SIMPLE TRIGGER, AND WHAT IT CANNOT DO
 *  onOpen here is a simple trigger: it needs no installation and it fires on
 *  every open. What a simple trigger may be refused is PropertiesService, so any
 *  label that reflects a toggle goes through IS9WD_toggleLabel_(), which returns
 *  a static label rather than throwing. Losing the whole menu bar over a
 *  cosmetic string is the failure that pattern exists to prevent. This is the
 *  EBEXECOM IS9_Menus.js pattern.
 *
 *  WHY THE ACTIONS ARE A TABLE OF NAMES
 *  Phase 3 builds the workbook; Setup, Feed, Items, Api, Emails, Automation and
 *  Archive land in later phases. A handler that called a function that does not
 *  exist yet would throw a ReferenceError at Ethan, so each action names the
 *  function that owns it and the file it will live in, and a missing one reports
 *  itself in a dialog. IS9WD_ACTION is also the naming contract: when a module
 *  lands, it either matches the name here or this table is the one edit.
 *
 *  Nothing personal is in this file and nothing personal ever will be. The
 *  endpoint URL, the app URL and the roster are read from 00 | Configuration at
 *  run time, because the repo is public (2.6).
 * =============================================================================
 */

var IS9WD_MENU_TITLE = 'IS9 Deliverables';

// { fn, from, label, lock, confirm }. `lock` marks a writer, which takes the
// document lock: a double click on Archive this week is otherwise two concurrent
// writers over one range and the second one wins silently (9). `confirm` is asked
// before anything that rewrites or removes in bulk.
var IS9WD_ACTION = {
  BUILD: {
    fn: 'IS9WD_buildOrRepair_', from: 'IS9WD_Setup.js', lock: true,
    label: 'Build or repair workbook',
    confirm: 'This rewrites every formula, format, validation and named range. ' +
      'It never touches an item, a token, an archive row or a log row.\n\n' +
      'On a workbook that already holds real items, name a version first: ' +
      'File > Version history > Name current version.\n\nRun it now?'
  },
  GUARDS: {
    fn: 'IS9WD_applyGuards_', from: 'IS9WD_Setup.js', lock: true,
    label: 'Apply sheet guards'
  },
  // IS9WD_linkFor_(key) is the reference's own name for the one link builder, and
  // the President's row returns the admin link rather than a member one (4.8).
  APP_URL: {
    fn: 'IS9WD_linkFor_', from: 'IS9WD_Api.js',
    label: 'Open the app (admin)'
  },
  LINKS: {
    fn: 'IS9WD_linksReport_', from: 'IS9WD_Api.js',
    label: 'Show the links'
  },
  ARCHIVE_WEEK: {
    fn: 'IS9WD_archiveWeek_', from: 'IS9WD_Archive.js', lock: true,
    label: 'Archive this week'
  },
  RETIRE: {
    fn: 'IS9WD_retireAccomplished_', from: 'IS9WD_Archive.js', lock: true,
    label: 'Retire accomplished items',
    confirm: 'This moves accomplished items off the data tab and into ' +
      'the archive tab. Name a version first: File > Version history > ' +
      'Name current version.\n\nRun it now?'
  },
  MAIL_PREFLIGHT: {
    fn: 'IS9WD_mailPreflight_', from: 'IS9WD_Emails.js',
    label: 'Preflight check'
  },
  MAIL_MONDAY: {
    fn: 'IS9WD_sendMondayAssignments_', from: 'IS9WD_Emails.js', lock: true,
    label: "Send this week's assignment emails now"
  },
  MAIL_DIGEST: {
    fn: 'IS9WD_sendDailyDigest_', from: 'IS9WD_Emails.js', lock: true,
    label: "Send today's digest now"
  },
  MAIL_BRIEF: {
    fn: 'IS9WD_sendSundayBrief_', from: 'IS9WD_Emails.js', lock: true,
    label: "Send Ethan's brief now"
  },
  AUTO_INSTALL: {
    fn: 'IS9WD_installAutomations_', from: 'IS9WD_Automation.js', lock: true,
    label: 'Install automations'
  },
  AUTO_REMOVE: {
    fn: 'IS9WD_removeAutomations_', from: 'IS9WD_Automation.js', lock: true,
    label: 'Remove automations',
    confirm: 'This removes the hourly trigger, so no email and no scheduled job ' +
      'runs until automations are installed again.\n\nRemove them now?'
  },
  AUTO_STATUS: {
    fn: 'IS9WD_automationStatus_', from: 'IS9WD_Automation.js',
    label: 'Show automation status'
  },
  DISPATCH: {
    fn: 'IS9WD_dispatch_', from: 'IS9WD_Automation.js', lock: true,
    label: 'Run the dispatcher now'
  },
  ROTATE_ONE: {
    fn: 'IS9WD_rotateToken_', from: 'IS9WD_Api.js', lock: true,
    label: 'Rotate a link'
  },
  ROTATE_ALL: {
    fn: 'IS9WD_rotateAllTokens_', from: 'IS9WD_Api.js', lock: true,
    label: 'Rotate every link',
    confirm: 'Every officer link stops working until each person is sent the new ' +
      'one. Thirteen links plus the admin link.\n\nRotate them all now?'
  },
  REVOKE_ONE: {
    fn: 'IS9WD_revokeToken_', from: 'IS9WD_Api.js', lock: true,
    label: 'Revoke a link'
  },
  SEED: {
    fn: 'IS9WD_seedSample_', from: 'IS9WD_Setup.js', lock: true,
    label: 'Seed sample data'
  },
  SEED_OVERFLOW: {
    fn: 'IS9WD_seedSample_', from: 'IS9WD_Setup.js', lock: true,
    label: 'Seed sample data (overflow test)'
  },
  SEED_CLEAR: {
    fn: 'IS9WD_clearSample_', from: 'IS9WD_Setup.js', lock: true,
    label: 'Clear sample data',
    confirm: 'This removes only the rows the seeder recorded, and skips any whose ' +
      'content has changed since it was seeded. It also clears the Today ' +
      'override.\n\nClear the sample data now?'
  },
  SELFTEST: {
    fn: 'IS9WD_selfTest_', from: 'IS9WD_SelfTest.js',
    label: 'Run self test'
  },
  TERMS: {
    fn: 'IS9WD_checkTerms_', from: 'IS9WD_SelfTest.js',
    label: 'Check the term calendar'
  },
  PROTECTIONS: {
    fn: 'IS9WD_listProtections_', from: 'IS9WD_Setup.js',
    label: 'List every protection'
  }
};


// ============================================================================
//  THE TWO GUARDS  (2.5: the underscore is the first layer, this is the second)
// ============================================================================

// Returns the Ui so a handler needs one call rather than two. It throws on a
// google.script.run or trigger context, which is the whole point: SpreadsheetApp
// .getUi() throwing with no document UI attached is documented behaviour and is
// already relied on in Ethan's EBEXECOM IS9_Menus.js.
function IS9WD_assertUiContext_() {
  var ui = null;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (err) {
    ui = null;
  }
  if (!ui) {
    throw new Error('This action runs from the ' + IS9WD_MENU_TITLE +
      ' menu inside the spreadsheet. It is not available to the app or to a ' +
      'scheduled job.');
  }
  return ui;
}

// A label that reflects a setting, or a static one when the read is refused.
// Returning a usable label beats throwing and losing the entire menu bar over a
// cosmetic string (2.5).
function IS9WD_toggleLabel_(read, onLabel, offLabel, fallback) {
  try {
    return read() ? onLabel : offLabel;
  } catch (err) {
    return fallback;
  }
}


// ============================================================================
//  ENTRY POINT  (a simple trigger: no installation, fires on every open)
// ============================================================================

function onOpen() {
  IS9WD_buildMenu_();
}

// Also runnable from the editor, where there is no menu bar to build onto. It
// says so rather than throwing, because running it from the editor is a normal
// thing to do while checking a label.
function IS9WD_buildMenu_() {
  var ui;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (err) {
    console.log('No document UI in this context, so no menu was built. That is ' +
      'expected from the editor: the menu appears when the spreadsheet is opened.');
    return;
  }

  var emails = ui.createMenu('Emails')
    .addItem('Preflight check', 'IS9WD_menuMailPreflight')
    .addItem("Send this week's assignment emails now", 'IS9WD_menuSendMonday')
    .addItem("Send today's digest now", 'IS9WD_menuSendDigest')
    .addItem("Send Ethan's brief now", 'IS9WD_menuSendBrief')
    .addSeparator()
    .addItem(IS9WD_testModeLabel_(), 'IS9WD_menuToggleTestMode')
    .addItem('Show the log', 'IS9WD_menuShowLog');

  var automation = ui.createMenu('Automation')
    .addItem('Install automations', 'IS9WD_menuInstallAutomations')
    .addItem('Remove automations', 'IS9WD_menuRemoveAutomations')
    .addItem('Show automation status', 'IS9WD_menuAutomationStatus')
    .addItem('Run the dispatcher now', 'IS9WD_menuRunDispatcher');

  var links = ui.createMenu('Links')
    .addItem('Rotate a link', 'IS9WD_menuRotateOne')
    .addItem('Rotate every link', 'IS9WD_menuRotateAll')
    .addItem('Revoke a link', 'IS9WD_menuRevokeOne');

  var sample = ui.createMenu('Sample data')
    .addItem('Seed sample data', 'IS9WD_menuSeed')
    .addItem('Seed sample data (overflow test)', 'IS9WD_menuSeedOverflow')
    .addItem('Clear sample data', 'IS9WD_menuClearSeed');

  var checks = ui.createMenu('Checks')
    .addItem('Run self test', 'IS9WD_menuSelfTest')
    .addItem('Check the term calendar', 'IS9WD_menuCheckTerms')
    .addItem('List every protection', 'IS9WD_menuListProtections')
    .addItem('Record the live deployment settings', 'IS9WD_menuRecordDeployment');

  ui.createMenu(IS9WD_MENU_TITLE)
    .addItem('Build or repair workbook', 'IS9WD_menuBuildOrRepair')
    .addItem('Apply sheet guards', 'IS9WD_menuApplyGuards')
    .addSeparator()
    .addItem('Open the app (admin)', 'IS9WD_menuOpenApp')
    .addItem('Show the links', 'IS9WD_menuShowLinks')
    .addItem('Copy the endpoint URL', 'IS9WD_menuCopyEndpoint')
    .addSeparator()
    .addItem('Archive this week', 'IS9WD_menuArchiveWeek')
    .addItem('Retire accomplished items', 'IS9WD_menuRetire')
    .addSeparator()
    .addSubMenu(emails)
    .addSubMenu(automation)
    .addSubMenu(links)
    .addSubMenu(sample)
    .addSubMenu(checks)
    .addSeparator()
    .addItem('About', 'IS9WD_menuAbout')
    .addToUi();
}

// The one dynamic label in the bar. Test mode lives in a Configuration cell
// rather than a property, so the read usually succeeds even in a simple trigger,
// but it goes through the fallback anyway: a workbook that has never been built
// has no named range to read, and that must not cost the menu (2.5).
function IS9WD_testModeLabel_() {
  return IS9WD_toggleLabel_(
    function () { return IS9WD_bool_(IS9WD_named_('IS9WD_TEST_MODE').getValue()); },
    'Test mode: ON  (click to turn OFF)',
    'Test mode: OFF (click to turn ON)',
    'Test mode (click to toggle)');
}


// ============================================================================
//  THE HANDLERS  (section 9's list, in section 9's order)
// ============================================================================

// Each one's first statement is the guard. Everything after it is one call into
// the module that owns the work.

function IS9WD_menuBuildOrRepair() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.BUILD);
}

function IS9WD_menuApplyGuards() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.GUARDS);
}

// Shows the link rather than opening it: Apps Script cannot navigate the browser
// for you, and a selectable box is what makes a long token usable.
function IS9WD_menuOpenApp() {
  var ui = IS9WD_assertUiContext_();
  var url = IS9WD_do_(ui, IS9WD_ACTION.APP_URL,
    [IS9WD_CFG.DIRECTORY.adminKey], { quiet: true });
  if (IS9WD_blank_(url)) return;
  IS9WD_showLink_(ui, IS9WD_ACTION.APP_URL.label, IS9WD_txt_(url),
    'This is the admin link. It carries the admin token, so treat it the way ' +
    'you would treat a password.');
}

function IS9WD_menuShowLinks() {
  var ui = IS9WD_assertUiContext_();
  var report = IS9WD_do_(ui, IS9WD_ACTION.LINKS, [], { quiet: true });
  if (report === null) return;
  IS9WD_showReport_(ui, IS9WD_ACTION.LINKS.label, IS9WD_lines_(report),
    'The only place a whole token is shown. Anyone holding a link can tick that ' +
    "officer's items, so send each one to its own person only.");
}

// Reads the URL from Configuration, never from a constant: the deployment can be
// repointed and every email reads the same setting (2.6, 12.3).
function IS9WD_menuCopyEndpoint() {
  var ui = IS9WD_assertUiContext_();
  var url = '';
  try {
    url = IS9WD_trim_(IS9WD_named_('IS9WD_ENDPOINT_URL').getValue());
  } catch (err) {
    ui.alert('Copy the endpoint URL', IS9WD_errText_(err), ui.ButtonSet.OK);
    return;
  }
  if (url === '') {
    ui.alert('Copy the endpoint URL',
      'The endpoint URL is blank. Deploy the web app, then paste its /exec URL ' +
      'into 00 | Configuration.', ui.ButtonSet.OK);
    return;
  }
  IS9WD_showLink_(ui, 'Copy the endpoint URL', url,
    'Confirm this URL in Manage deployments after every new version.');
}

function IS9WD_menuArchiveWeek() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.ARCHIVE_WEEK);
}

function IS9WD_menuRetire() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.RETIRE);
}

function IS9WD_menuMailPreflight() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.MAIL_PREFLIGHT);
}

function IS9WD_menuSendMonday() {
  var ui = IS9WD_assertUiContext_();
  if (!IS9WD_confirmSend_(ui, IS9WD_ACTION.MAIL_MONDAY.label)) return;
  IS9WD_do_(ui, IS9WD_ACTION.MAIL_MONDAY);
}

function IS9WD_menuSendDigest() {
  var ui = IS9WD_assertUiContext_();
  if (!IS9WD_confirmSend_(ui, IS9WD_ACTION.MAIL_DIGEST.label)) return;
  IS9WD_do_(ui, IS9WD_ACTION.MAIL_DIGEST);
}

function IS9WD_menuSendBrief() {
  var ui = IS9WD_assertUiContext_();
  if (!IS9WD_confirmSend_(ui, IS9WD_ACTION.MAIL_BRIEF.label)) return;
  IS9WD_do_(ui, IS9WD_ACTION.MAIL_BRIEF);
}

// The toggle is one Configuration checkbox, so it lives here rather than waiting
// on a module. The label in the bar is rebuilt on the next open.
function IS9WD_menuToggleTestMode() {
  var ui = IS9WD_assertUiContext_();
  try {
    var now = IS9WD_lockedRun_(function () {
      var cell = IS9WD_named_('IS9WD_TEST_MODE');
      var next = !IS9WD_bool_(cell.getValue());
      cell.setValue(next);
      IS9WD_configReset_();
      return next;
    });
    ui.alert('Test mode',
      now
        ? 'Test mode is ON. Every email goes to the admin address instead of to ' +
          'the officers.\n\nThe menu label updates the next time this ' +
          'spreadsheet is opened.'
        : 'Test mode is OFF. Emails go to the real addresses in the ' +
          'directory.\n\nThe menu label updates the next time this ' +
          'spreadsheet is opened.',
      ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Test mode', IS9WD_errText_(err), ui.ButtonSet.OK);
  }
}

// The log tab is hidden because nobody types into it, not as a security boundary:
// the Canva reader can read every cell of every tab, which is why no token is
// ever in one (2.5). Unhiding it is therefore safe, and the next repair re-hides
// it.
function IS9WD_menuShowLog() {
  var ui = IS9WD_assertUiContext_();
  try {
    var sheet = IS9WD_sheet_('LOG');
    if (sheet.isSheetHidden()) sheet.showSheet();
    sheet.activate();
    var last = Math.max(sheet.getLastRow(), IS9WD_LOG.firstRow);
    sheet.setActiveRange(sheet.getRange(last, 1));
  } catch (err) {
    ui.alert('Show the log', IS9WD_errText_(err), ui.ButtonSet.OK);
  }
}

function IS9WD_menuInstallAutomations() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.AUTO_INSTALL);
}

function IS9WD_menuRemoveAutomations() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.AUTO_REMOVE);
}

function IS9WD_menuAutomationStatus() {
  var ui = IS9WD_assertUiContext_();
  var report = IS9WD_do_(ui, IS9WD_ACTION.AUTO_STATUS, [], { quiet: true });
  if (report === null) return;
  IS9WD_showReport_(ui, IS9WD_ACTION.AUTO_STATUS.label, IS9WD_lines_(report), '');
}

function IS9WD_menuRunDispatcher() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.DISPATCH);
}

function IS9WD_menuRotateOne() {
  var ui = IS9WD_assertUiContext_();
  var key = IS9WD_askDirKey_(ui, 'Rotate a link',
    'Rotating replaces that officer link. The old one stops working the moment ' +
    'this finishes, so send the new one straight away.');
  if (key === null) return;
  IS9WD_do_(ui, IS9WD_ACTION.ROTATE_ONE, [key]);
}

function IS9WD_menuRotateAll() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.ROTATE_ALL);
}

function IS9WD_menuRevokeOne() {
  var ui = IS9WD_assertUiContext_();
  var key = IS9WD_askDirKey_(ui, 'Revoke a link',
    'Revoking blocks that link without issuing a new one. The officer cannot ' +
    'tick anything until the link is rotated.');
  if (key === null) return;
  IS9WD_do_(ui, IS9WD_ACTION.REVOKE_ONE, [key]);
}

function IS9WD_menuSeed() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.SEED, [false]);
}

function IS9WD_menuSeedOverflow() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.SEED_OVERFLOW, [true]);
}

function IS9WD_menuClearSeed() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_do_(ui, IS9WD_ACTION.SEED_CLEAR);
}

function IS9WD_menuSelfTest() {
  var ui = IS9WD_assertUiContext_();
  var report = IS9WD_do_(ui, IS9WD_ACTION.SELFTEST, [], { quiet: true });
  if (report === null) return;
  IS9WD_showReport_(ui, IS9WD_ACTION.SELFTEST.label, IS9WD_lines_(report),
    'Every line is also in ' + IS9WD_TAB.LOG + ', and the summary is in ' +
    'Configuration under Last self test result.');
}

function IS9WD_menuCheckTerms() {
  var ui = IS9WD_assertUiContext_();
  var report = IS9WD_do_(ui, IS9WD_ACTION.TERMS, [], { quiet: true });
  if (report === null) return;
  IS9WD_showReport_(ui, IS9WD_ACTION.TERMS.label, IS9WD_lines_(report),
    'A blank End date pauses every job for the rest of the trimester.');
}

function IS9WD_menuListProtections() {
  var ui = IS9WD_assertUiContext_();
  var report = IS9WD_do_(ui, IS9WD_ACTION.PROTECTIONS, [], { quiet: true });
  if (report === null) return;
  IS9WD_showReport_(ui, IS9WD_ACTION.PROTECTIONS.label, IS9WD_lines_(report), '');
}

// The two most consequential settings in the build are chosen in a dialog no
// script can read, so Ethan reads them out of Manage deployments and they are
// recorded rather than assumed (9).
function IS9WD_menuRecordDeployment() {
  var ui = IS9WD_assertUiContext_();
  var access = IS9WD_ask_(ui, 'Record the live deployment settings',
    'In Manage deployments, copy the value of "Who has access" exactly as it ' +
    'is written there.');
  if (access === null) return;
  var executeAs = IS9WD_ask_(ui, 'Record the live deployment settings',
    'Now the value of "Execute as", exactly as it is written there.');
  if (executeAs === null) return;
  try {
    var line = 'access: ' + access + IS9WD_SEP + 'executeAs: ' + executeAs +
      IS9WD_SEP + 'recorded ' + IS9WD_stampText_(new Date());
    IS9WD_lockedRun_(function () {
      IS9WD_named_('IS9WD_DIAG_DEPLOYMENT').setValue(line);
      IS9WD_configReset_();
    });
    ui.alert('Record the live deployment settings',
      'Recorded in 00 | Configuration:\n\n' + line +
      '\n\nExecute as must read the owner, never the accessing user: the whole ' +
      'point of the token model is that the 14 people never hold Sheet access.',
      ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Record the live deployment settings', IS9WD_errText_(err), ui.ButtonSet.OK);
  }
}

function IS9WD_menuAbout() {
  var ui = IS9WD_assertUiContext_();
  IS9WD_showReport_(ui, 'About', IS9WD_aboutLines_(),
    'The full build reference is docs/BUILD-REFERENCE.md in the repo.');
}


// ============================================================================
//  CALLING THE MODULE THAT OWNS THE WORK
// ============================================================================

// Resolves a project global by name. Cannot throw: a name that is not there
// returns null and the caller reports a missing module, which is a visible
// failure rather than a silent one.
function IS9WD_impl_(name) {
  var fn = null;
  try {
    fn = (typeof globalThis === 'object' && globalThis) ? globalThis[name] : null;
  } catch (err) {
    fn = null;
  }
  return typeof fn === 'function' ? fn : null;
}

// One call per handler: confirm if asked, resolve the owner, take the document
// lock when the action writes, report what came back or what went wrong. Returns
// null when nothing ran, so a handler can tell a refusal from an empty result.
function IS9WD_do_(ui, action, args, opts) {
  var o = opts || {};
  var fn = IS9WD_impl_(action.fn);
  if (!fn) {
    ui.alert(action.label,
      'Not built yet. This action lives in ' + action.from + ', which ships in a ' +
      'later phase.\n\nNothing was changed.', ui.ButtonSet.OK);
    return null;
  }
  if (action.confirm && !IS9WD_confirm_(ui, action.label, action.confirm)) return null;

  var call = function () { return fn.apply(null, args || []); };
  var out;
  try {
    out = action.lock ? IS9WD_lockedRun_(call) : call();
  } catch (err) {
    ui.alert(action.label, IS9WD_errText_(err), ui.ButtonSet.OK);
    return null;
  }
  if (o.quiet) return out === undefined ? '' : out;
  ui.alert(action.label, IS9WD_resultText_(out), ui.ButtonSet.OK);
  return out === undefined ? '' : out;
}

// The lock, taken once per execution rather than once per nested caller.
//
// Section 9 puts the document lock on the menu handler, and a writer module will
// also take it on its own account, because the app reaches the same code without
// a menu. Whether LockService.getDocumentLock().tryLock() succeeds a second time
// inside one execution is NOT verified here, and if it fails the whole action
// reports "Someone else is saving right now" for no reason. hasLock() closes that
// from this side. Closing it from the other side is one line in
// IS9WD_withLock_: return fn() when the lock is already held. Until that line is
// there, a writer module called from this menu must not re-take the lock.
function IS9WD_lockedRun_(fn) {
  var lock = LockService.getDocumentLock();
  if (lock.hasLock()) return fn();
  return IS9WD_withLock_(fn);
}

// A module may hand back a string, a list of lines, or an object carrying either.
// Anything else is reported as done rather than as JSON nobody can read.
function IS9WD_lines_(out) {
  if (out === null || out === undefined) return [];
  if (typeof out === 'string') return out === '' ? [] : out.split('\n');
  if (typeof out.length === 'number') {
    var flat = [];
    for (var i = 0; i < out.length; i++) flat.push(IS9WD_txt_(out[i]));
    return flat;
  }
  if (out.lines) return IS9WD_lines_(out.lines);
  if (out.message) return IS9WD_lines_(out.message);
  if (out.report) return IS9WD_lines_(out.report);
  return [];
}

function IS9WD_resultText_(out) {
  var lines = IS9WD_lines_(out);
  return lines.length ? lines.join('\n') : 'Done.';
}

// The sentence Ethan can act on, not a stack trace. Config.js already throws in
// that shape, so most of these arrive ready to read.
function IS9WD_errText_(err) {
  var msg = err && err.message ? IS9WD_txt_(err.message) : IS9WD_txt_(err);
  return msg === '' ? 'It failed and said nothing. Check the execution log.' : msg;
}


// ============================================================================
//  DIALOGS  (Poppins and the palette, so a prompt looks like the workbook)
// ============================================================================

function IS9WD_confirm_(ui, title, question) {
  return ui.alert(title, question, ui.ButtonSet.YES_NO) === ui.Button.YES;
}

// Mail is the one action that cannot be undone, so it says where it is going
// before it goes. Test mode is read here rather than assumed.
function IS9WD_confirmSend_(ui, label) {
  var where = 'Test mode could not be read, so assume the real addresses.';
  try {
    where = IS9WD_bool_(IS9WD_named_('IS9WD_TEST_MODE').getValue())
      ? 'Test mode is ON, so every message goes to the admin address.'
      : 'Test mode is OFF, so messages go to the real addresses in the directory.';
  } catch (err) {
    // Fall through with the cautious wording rather than blocking the send.
  }
  return IS9WD_confirm_(ui, label, where + '\n\nSend now?');
}

// Returns the trimmed answer, or null when Ethan cancels or leaves it blank.
function IS9WD_ask_(ui, title, question) {
  var res = ui.prompt(title, question, ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return null;
  var text = IS9WD_trim_(res.getResponseText());
  return text === '' ? null : text;
}

// A directory key, validated against the directory before anything is rotated:
// a typo would otherwise write a token under a key nobody holds.
function IS9WD_askDirKey_(ui, title, warning) {
  var cfg;
  try {
    cfg = IS9WD_readConfig_(true);
  } catch (err) {
    ui.alert(title, IS9WD_errText_(err), ui.ButtonSet.OK);
    return null;
  }
  var menu = [];
  var order = cfg.directory.inHierarchy;
  for (var i = 0; i < order.length; i++) {
    var e = order[i];
    var who = e.fullName === '' ? '(no name yet)' : e.fullName;
    menu.push(e.key + '  ' + e.committee + IS9WD_SEP + who);
  }
  var key = IS9WD_ask_(ui, title,
    warning + '\n\nType the key of the person, for example K01.\n\n' + menu.join('\n'));
  if (key === null) return null;
  key = key.toUpperCase();
  if (!cfg.directory.byKey[key]) {
    ui.alert(title, 'There is no directory row with the key ' + key + '.', ui.ButtonSet.OK);
    return null;
  }
  return key;
}

// A modal rather than an alert, because a URL has to be selectable and a token is
// too long to retype. Nothing is placed on the clipboard: an Apps Script dialog
// cannot reach it, so the box selects itself and Ethan copies.
function IS9WD_showLink_(ui, title, url, note) {
  var html = IS9WD_dialogHead_() +
    '<div class="wrap">' +
    (note ? '<p class="note">' + IS9WD_esc_(note) + '</p>' : '') +
    '<input id="u" type="text" readonly value="' + IS9WD_esc_(url) + '">' +
    '<p class="hint">Selected for you. Copy it with the keyboard.</p>' +
    '</div>' +
    '<script>var f=document.getElementById("u");f.focus();f.select();</script>' +
    IS9WD_dialogFoot_();
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(560).setHeight(220), title);
}

function IS9WD_showReport_(ui, title, lines, note) {
  var body = [];
  for (var i = 0; i < lines.length; i++) {
    body.push('<div class="line">' + IS9WD_esc_(IS9WD_txt_(lines[i])) + '</div>');
  }
  if (!body.length) body.push('<div class="line">Nothing to report.</div>');
  var html = IS9WD_dialogHead_() +
    '<div class="wrap">' +
    (note ? '<p class="note">' + IS9WD_esc_(note) + '</p>' : '') +
    '<div class="box">' + body.join('') + '</div>' +
    '</div>' + IS9WD_dialogFoot_();
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(640).setHeight(520), title);
}

// The palette and the font the workbook uses, so a dialog does not look like a
// different tool. Colours come from IS9WD_ROLE, never from a hex typed here.
function IS9WD_dialogHead_() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<link href="https://fonts.googleapis.com/css2?family=' + IS9WD_FONT +
    ':wght@400;600&display=swap" rel="stylesheet">' +
    '<style>' +
    'html,body{margin:0;padding:0;background:' + IS9WD_ROLE.BODY_BG + ';}' +
    'body{font-family:"' + IS9WD_FONT + '",Segoe UI,Arial,sans-serif;' +
    'font-size:13px;color:' + IS9WD_ROLE.BODY_FG + ';}' +
    '.wrap{padding:18px 20px 20px 20px;}' +
    '.note{margin:0 0 14px 0;font-size:12px;line-height:1.5;color:' +
    IS9WD_ROLE.HINT_FG + ';}' +
    '.hint{margin:10px 0 0 0;font-size:11px;color:' + IS9WD_ROLE.HINT_FG + ';}' +
    'input{width:100%;box-sizing:border-box;padding:11px 12px;font-family:inherit;' +
    'font-size:13px;color:' + IS9WD_ROLE.BODY_FG + ';background:' +
    IS9WD_ROLE.BAND_ROW_B + ';border:1px solid ' + IS9WD_ROLE.HEAD_BG +
    ';border-radius:6px;}' +
    '.box{border:1px solid ' + IS9WD_ROLE.BAND_ROW_B + ';border-radius:8px;' +
    'padding:6px 0;max-height:380px;overflow:auto;}' +
    '.line{padding:5px 14px;line-height:1.5;white-space:pre-wrap;' +
    'word-break:break-word;}' +
    '.line:nth-child(even){background:' + IS9WD_ROLE.BAND_ROW_B + ';}' +
    '</style></head><body>';
}

function IS9WD_dialogFoot_() {
  return '</body></html>';
}

// Every value in a dialog is escaped, including ones that came from the Sheet: a
// committee name is Ethan's text, and text in HTML is markup until it is escaped.
function IS9WD_esc_(s) {
  return IS9WD_txt_(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Read from the workbook rather than restated, so the About box cannot drift from
// what the workbook is actually set to.
function IS9WD_aboutLines_() {
  var out = ['IS9 Weekly Deliverables Tracker' + IS9WD_SEP + 'Investors\' Society, DLSU', ''];
  var cfg = null;
  try {
    cfg = IS9WD_readConfig_(true);
  } catch (err) {
    out.push('The workbook has not been built yet: ' + IS9WD_errText_(err));
    return out;
  }
  var w = cfg.weeks;
  var s = cfg.switches;
  out.push('Week' + IS9WD_SEP +
    (w.weekNumber === null ? 'out of term' : 'week ' + IS9WD_two_(w.weekNumber)) +
    IS9WD_SEP + IS9WD_dateKey_(w.weekStart) + ' to ' + IS9WD_dateKey_(w.weekEnd));
  out.push('Trimester' + IS9WD_SEP + (w.termActive === '' ? 'none active' : w.termActive));
  out.push('Officers' + IS9WD_SEP + cfg.directory.rows.length + ' in the directory, ' +
    cfg.directory.publishingRows + ' publish to Canva');
  out.push('Carousel' + IS9WD_SEP + s.slotsPerPage + ' slots a page, up to ' +
    s.maxParts + ' pages a committee, ' + s.publishMax + ' items published a committee');
  out.push('Master pages required' + IS9WD_SEP + cfg.feed.masterPagesRequired);
  out.push('Automation' + IS9WD_SEP + (s.automationOn ? 'on' : 'off') + IS9WD_SEP +
    'test mode ' + (s.testMode ? 'on' : 'off') + IS9WD_SEP +
    'app ' + (s.appOn ? 'on' : 'off'));
  out.push('Sign-off this week' + IS9WD_SEP +
    (cfg.signoff.derivedSet ? 'set' : 'NOT set, so Ready for Canva reads NO'));
  out.push('');
  out.push('Ethan enters every deliverable. Each officer holds one private link ' +
    'and ticks items off. Nothing here keys on a status label: the derived ' +
    'Active flag is what the code reads, so a status can be renamed in ' +
    '00 | Configuration.');
  return out;
}
