/**
 * Lead Round-Robin Automation for Google Sheets
 * Author: Ali Raza (github.com/ali-raza-ppc)
 *
 * Assigns new leads (from Meta Lead Ads, Google Ads lead forms, website forms
 * or a CRM sync) to sales reps in strict rotation, skipping reps marked
 * inactive, flagging duplicates and optionally emailing the assigned rep.
 *
 * Sheets expected:
 *   "Leads" : header row with at least  Timestamp | Name | Phone | Email | Source | Assigned To | Assigned At | Status
 *   "Reps"  : header row               Rep Name | Email | Active (TRUE/FALSE)
 *
 * Setup: Extensions > Apps Script, paste this file, run setup() once.
 */

const CONFIG = {
  LEADS_SHEET: 'Leads',
  REPS_SHEET: 'Reps',
  NOTIFY_REPS: true,          // email the rep when a lead is assigned
  DEDUPE_BY: 'Phone',         // column used to detect duplicate leads ('' to disable)
  TRIGGER_MINUTES: 5          // how often the time-driven trigger runs
};

/** Run once: creates the time-driven trigger. */
function setup() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'assignNewLeads')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('assignNewLeads').timeBased().everyMinutes(CONFIG.TRIGGER_MINUTES).create();
  // Also run on Google Form submits if the sheet is linked to a form.
  try {
    ScriptApp.newTrigger('assignNewLeads').forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create();
  } catch (e) { /* no linked form: ignore */ }
}

/** Assigns every unassigned lead to the next active rep. */
function assignNewLeads() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // another run is in progress
  try {
    const ss = SpreadsheetApp.getActive();
    const leadsSheet = ss.getSheetByName(CONFIG.LEADS_SHEET);
    const reps = getActiveReps_(ss.getSheetByName(CONFIG.REPS_SHEET));
    if (!leadsSheet || reps.length === 0) return;

    const data = leadsSheet.getDataRange().getValues();
    const header = data[0];
    const col = name => {
      const i = header.indexOf(name);
      if (i === -1) throw new Error('Missing column in Leads sheet: ' + name);
      return i;
    };
    const cAssigned = col('Assigned To'), cAssignedAt = col('Assigned At'), cStatus = col('Status');
    const cDedupe = CONFIG.DEDUPE_BY ? col(CONFIG.DEDUPE_BY) : -1;

    const props = PropertiesService.getScriptProperties();
    let pointer = Number(props.getProperty('RR_POINTER') || 0);
    const seen = new Set();

    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      const key = cDedupe >= 0 ? normalise_(row[cDedupe]) : '';
      const isEmpty = row.every(v => v === '' || v === null);
      if (isEmpty) continue;

      if (row[cAssigned]) { if (key) seen.add(key); continue; }

      if (key && seen.has(key)) {
        leadsSheet.getRange(r + 1, cStatus + 1).setValue('Duplicate');
        leadsSheet.getRange(r + 1, cAssigned + 1).setValue('-');
        continue;
      }

      const rep = reps[pointer % reps.length];
      pointer = (pointer + 1) % reps.length;
      leadsSheet.getRange(r + 1, cAssigned + 1).setValue(rep.name);
      leadsSheet.getRange(r + 1, cAssignedAt + 1).setValue(new Date());
      if (!row[cStatus]) leadsSheet.getRange(r + 1, cStatus + 1).setValue('New');
      if (key) seen.add(key);

      if (CONFIG.NOTIFY_REPS && rep.email) notifyRep_(rep, header, row);
    }
    props.setProperty('RR_POINTER', String(pointer));
  } finally {
    lock.releaseLock();
  }
}

/** Returns [{name, email}] for reps marked Active. */
function getActiveReps_(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues().slice(1);
  return rows
    .filter(r => r[0] && String(r[2]).toUpperCase() === 'TRUE')
    .map(r => ({ name: String(r[0]).trim(), email: String(r[1]).trim() }));
}

function notifyRep_(rep, header, row) {
  const lines = header.map((h, i) => h && row[i] !== '' ? h + ': ' + row[i] : null).filter(Boolean);
  MailApp.sendEmail({
    to: rep.email,
    subject: 'New lead assigned to you',
    body: 'Hi ' + rep.name + ',\n\nA new lead has been assigned to you:\n\n' + lines.join('\n') +
          '\n\nPlease contact them as soon as possible.'
  });
}

/** Phone numbers: digits only, last 10 digits; emails: lower-case. */
function normalise_(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s.includes('@')) return s;
  const digits = s.replace(/\D/g, '');
  return digits.slice(-10);
}

/** Optional: reset the rotation so the first active rep is next. */
function resetRotation() {
  PropertiesService.getScriptProperties().setProperty('RR_POINTER', '0');
}
