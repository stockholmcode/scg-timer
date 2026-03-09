var SHEET_NAME = 'SCG Timer';
var TAB_ENTRIES = 'Entries';
var TAB_ACTIVE = 'Active';
var TAB_PROJECTS = 'Projects';
var TAB_ACCUMULATOR = 'Accumulator';
var TAB_SETTINGS = 'Settings';

var DEFAULT_PROJECTS = [
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Holiday', true, 2335606, '019cb481-c032-7740-bb95-630a51ab81ec', 'Discovery Dplay Entertainment Limited', '4', true],
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Time off', true, 2335606, '019cb481-d88d-79c0-a131-a1c4594e54a7', 'Discovery Dplay Entertainment Limited', '4', true],
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Weekday', true, 2335606, '019cb480-61db-7668-98a6-490dfe9ca3d7', 'Discovery Dplay Entertainment Limited', '4', true],
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Weekend', true, 2335606, '019cb481-468b-74c1-92dd-3a09817e327a', 'Discovery Dplay Entertainment Limited', '4', true],
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Work, Rate 1', true, 2335606, '019cb47e-8629-785a-be42-b0a5367d78e6', 'Discovery Dplay Entertainment Limited', '4', true],
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Work, Rate 2', true, 2335606, '019cb47f-3848-70b7-b5bc-3299f659b6a2', 'Discovery Dplay Entertainment Limited', '4', true],
  ['4 - Discoveryplus (Peter Borg)', 'Overtime, Rate 1', true, 2335606, '019cb481-f3c9-7731-addc-89316adb6f9b', 'Discovery Dplay Entertainment Limited', '4', true],
  ['4 - Discoveryplus (Peter Borg)', 'Overtime, Rate 2', true, 2335606, '019cb482-5497-7bdb-a1d3-17e56fd5ea33', 'Discovery Dplay Entertainment Limited', '4', true],
  ['4 - Discoveryplus (Peter Borg)', 'System development', true, 2335606, '019c7556-8e53-7043-b87c-ae8293462146', 'Discovery Dplay Entertainment Limited', '4', true],
  ['4 - Discoveryplus (Peter Borg)', 'Travel time', true, 2335606, '019c8b64-06e7-731c-aadd-8d9e112dc6b7', 'Discovery Dplay Entertainment Limited', '4', true],
  ['13 - SCG Internrapportering', 'Ω All other internal time', true, 2335692, '019c7554-3f92-7c2f-886d-65a53f477dbd', '', '13', false],
  ['13 - SCG Internrapportering', 'Ω Conference / Kick-off – internal', true, 2335692, '019c7554-f1ac-79bf-b724-0f0548bda3c3', '', '13', false],
  ['13 - SCG Internrapportering', 'Ω Employee Coaching / Check-in', true, 2335692, '019c7555-a603-7bd3-b221-fead3e15681c', '', '13', false],
  ['13 - SCG Internrapportering', 'Ω Internal meeting – planned', true, 2335692, '019c7554-c727-73b8-8944-7e0ca18cd339', '', '13', false],
  ['13 - SCG Internrapportering', 'Ω Recruitment', true, 2335692, '019c7556-1a9f-7991-a18b-f9c81bcd9237', '', '13', false],
  ['13 - SCG Internrapportering', 'Ω Sales work / Client meetings', true, 2335692, '019c7554-41e8-773c-8111-39889519c8bd', '', '13', false],
  ['13 - SCG Internrapportering', 'Ω Training – planned', true, 2335692, '019c7557-1b4e-70ce-b3ae-e1e988295acb', '', '13', false]
];

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e.parameter);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SCG Timer')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  var params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid JSON' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return handleApiRequest(params);
}

var API_TOKEN = 'scg-kleer-sync-2026';

function handleApiRequest(params) {
  if (params.token !== API_TOKEN) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var result;
  try {
    switch (params.action) {
      case 'getWeekEntries':
        result = getWeekEntries(params.dateStr);
        break;
      case 'getProjectsWithKleerIds':
        result = getProjectsWithKleerIds();
        break;
      case 'getAccumulator':
        result = getAccumulator();
        break;
      case 'updateAccumulator':
        result = updateAccumulator(typeof params.data === 'string' ? JSON.parse(params.data) : params.data);
        break;
      case 'getSyncCheckpoint':
        result = { checkpoint: getSyncCheckpoint() };
        break;
      case 'setSyncCheckpoint':
        result = setSyncCheckpoint(params.dateStr);
        break;
      default:
        result = { error: 'Unknown action: ' + params.action };
    }
  } catch (err) {
    result = { error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAccumulator() {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ACCUMULATOR);
  var data = sheet.getDataRange().getValues();
  var result = {};
  for (var i = 1; i < data.length; i++) {
    var key = data[i][0] + '|||' + data[i][1];
    result[key] = data[i][2] || 0;
  }
  return result;
}

function updateAccumulator(entries) {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ACCUMULATOR);
  if (entries.length > 0) {
    var values = entries.map(function(e) { return [e.project, e.activity, e.remainder_minutes]; });
    sheet.getRange(2, 1, values.length, 3).setValues(values);
  }
  var lastRow = sheet.getLastRow();
  if (lastRow > entries.length + 1) {
    sheet.deleteRows(entries.length + 2, lastRow - entries.length - 1);
  }
  return { success: true };
}

function getSetting(key) {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_SETTINGS);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function setSetting(key, value) {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_SETTINGS);
    sheet.appendRow(['key', 'value']);
    sheet.setFrozenRows(1);
  }
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function getSyncCheckpoint() {
  var val = getSetting('sync_checkpoint_date');
  return val ? toDateStr(val) : null;
}

function setSyncCheckpoint(dateStr) {
  setSetting('sync_checkpoint_date', dateStr);
  var verify = getSyncCheckpoint();
  if (verify !== dateStr) {
    throw new Error('Failed to save checkpoint. Expected ' + dateStr + ', got ' + verify);
  }
  return { success: true, checkpoint: verify };
}

function getOrCreateSheet() {
  var files = DriveApp.getFilesByName(SHEET_NAME);
  while (files.hasNext()) {
    var file = files.next();
    var ss = SpreadsheetApp.open(file);
    if (ss.getSheetByName(TAB_ENTRIES)) {
      return ss;
    }
  }
  return createSheet();
}

function createSheet() {
  var ss = SpreadsheetApp.create(SHEET_NAME);

  var entriesSheet = ss.getSheets()[0];
  entriesSheet.setName(TAB_ENTRIES);
  entriesSheet.appendRow(['date', 'project', 'activity', 'seconds']);
  entriesSheet.setFrozenRows(1);

  var activeSheet = ss.insertSheet(TAB_ACTIVE);
  activeSheet.appendRow(['project', 'activity', 'start_time']);
  activeSheet.setFrozenRows(1);

  var projectsSheet = ss.insertSheet(TAB_PROJECTS);
  projectsSheet.appendRow(['project', 'activity', 'enabled', 'kleer_project_id', 'kleer_activity_id', 'kleer_client_name', 'kleer_project_number', 'kleer_billable']);
  projectsSheet.setFrozenRows(1);
  for (var i = 0; i < DEFAULT_PROJECTS.length; i++) {
    projectsSheet.appendRow(DEFAULT_PROJECTS[i]);
  }

  var accSheet = ss.insertSheet(TAB_ACCUMULATOR);
  accSheet.appendRow(['project', 'activity', 'remainder_minutes']);
  accSheet.setFrozenRows(1);

  var settingsSheet = ss.insertSheet(TAB_SETTINGS);
  settingsSheet.appendRow(['key', 'value']);
  settingsSheet.setFrozenRows(1);

  return ss;
}

function getInitData() {
  var projects = getProjects();
  var active = getActive();
  var entries = getEntries(null);
  var syncCheckpoint = getSyncCheckpoint();
  return {
    projects: projects,
    active: active,
    entries: entries,
    syncCheckpoint: syncCheckpoint
  };
}

function getProjects() {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_PROJECTS);
  var data = sheet.getDataRange().getValues();
  var projects = {};

  for (var i = 1; i < data.length; i++) {
    var project = data[i][0];
    var activity = data[i][1];
    var enabled = data[i][2];
    if (enabled !== true && enabled !== 'TRUE' && enabled !== 'true') continue;
    if (!projects[project]) {
      projects[project] = [];
    }
    projects[project].push(activity);
  }

  return projects;
}

function getProjectsWithKleerIds() {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_PROJECTS);
  var data = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var enabled = data[i][2];
    if (enabled !== true && enabled !== 'TRUE' && enabled !== 'true') continue;
    result.push({
      project: data[i][0],
      activity: data[i][1],
      kleerProjectId: data[i][3],
      kleerActivityId: data[i][4],
      kleerClientName: data[i][5],
      kleerProjectNumber: String(data[i][6]),
      kleerBillable: data[i][7] === true || data[i][7] === 'TRUE' || data[i][7] === 'true'
    });
  }

  return result;
}

function getActive() {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ACTIVE);
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return null;
  }

  var row = data[1];
  if (!row[0]) return null;

  return {
    project: row[0],
    activity: row[1],
    start_time: row[2] instanceof Date ? row[2].getTime() : Number(row[2])
  };
}

function getEntries(dateStr) {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ENTRIES);
  var data = sheet.getDataRange().getValues();

  if (!dateStr) {
    dateStr = formatDate(new Date());
  }

  var entries = [];
  for (var i = 1; i < data.length; i++) {
    if (toDateStr(data[i][0]) === dateStr) {
      entries.push({
        row: i + 1,
        project: data[i][1],
        activity: data[i][2],
        seconds: data[i][3] || 0
      });
    }
  }

  return entries;
}

function getWeekEntries(dateStr) {
  if (!dateStr) {
    dateStr = formatDate(new Date());
  }

  var refDate = new Date(dateStr + 'T12:00:00');
  var day = refDate.getDay();
  var mondayOffset = day === 0 ? -6 : 1 - day;
  var monday = new Date(refDate);
  monday.setDate(refDate.getDate() + mondayOffset);

  var dates = [];
  for (var d = 0; d < 7; d++) {
    var dt = new Date(monday);
    dt.setDate(monday.getDate() + d);
    dates.push(formatDate(dt));
  }

  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ENTRIES);
  var data = sheet.getDataRange().getValues();

  var dateSet = {};
  for (var x = 0; x < dates.length; x++) {
    dateSet[dates[x]] = true;
  }

  var entries = [];
  for (var i = 1; i < data.length; i++) {
    var entryDate = toDateStr(data[i][0]);
    if (dateSet[entryDate]) {
      entries.push({
        row: i + 1,
        date: entryDate,
        project: data[i][1],
        activity: data[i][2],
        seconds: data[i][3] || 0
      });
    }
  }

  return { dates: dates, entries: entries };
}

function startTimer(project, activity) {
  var active = getActive();
  if (active) {
    throw new Error('A timer is already running. Stop it first.');
  }

  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ACTIVE);

  if (sheet.getLastRow() > 1) {
    sheet.deleteRow(2);
  }

  sheet.appendRow([project, activity, Date.now()]);

  return { project: project, activity: activity, start_time: Date.now() };
}

function stopTimer() {
  var ss = getOrCreateSheet();
  var activeSheet = ss.getSheetByName(TAB_ACTIVE);
  var activeData = activeSheet.getDataRange().getValues();

  if (activeData.length <= 1 || !activeData[1][0]) {
    throw new Error('No running timer.');
  }

  var project = activeData[1][0];
  var activity = activeData[1][1];
  var startTime = activeData[1][2] instanceof Date ? activeData[1][2].getTime() : Number(activeData[1][2]);
  var elapsed = Math.round((Date.now() - startTime) / 1000);

  var dateStr = formatDate(new Date());
  assertNotLocked(dateStr);

  activeSheet.deleteRow(2);
  var entriesSheet = ss.getSheetByName(TAB_ENTRIES);
  var entriesData = entriesSheet.getDataRange().getValues();

  var found = false;
  for (var i = 1; i < entriesData.length; i++) {
    if (toDateStr(entriesData[i][0]) === dateStr && entriesData[i][1] === project && entriesData[i][2] === activity) {
      var current = entriesData[i][3] || 0;
      entriesSheet.getRange(i + 1, 4).setValue(current + elapsed);
      found = true;
      break;
    }
  }

  if (!found) {
    entriesSheet.appendRow([dateStr, project, activity, elapsed]);
  }

  return getEntries(dateStr);
}

function addEntry(dateStr, project, activity, seconds) {
  assertNotLocked(dateStr);
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ENTRIES);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (toDateStr(data[i][0]) === dateStr && data[i][1] === project && data[i][2] === activity) {
      throw new Error('This activity already exists for this day.');
    }
  }

  var insertAfter = 0;
  for (var i = 1; i < data.length; i++) {
    var rowDate = toDateStr(data[i][0]);
    if (rowDate <= dateStr) {
      insertAfter = i;
    }
  }

  if (insertAfter === 0 && data.length > 1) {
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1, 1, 4).setValues([[dateStr, project, activity, seconds]]);
  } else if (insertAfter >= data.length - 1) {
    sheet.appendRow([dateStr, project, activity, seconds]);
  } else {
    sheet.insertRowAfter(insertAfter + 1);
    sheet.getRange(insertAfter + 2, 1, 1, 4).setValues([[dateStr, project, activity, seconds]]);
  }

  return getEntries(dateStr);
}

function updateEntry(row, seconds) {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ENTRIES);
  var dateStr = toDateStr(sheet.getRange(row, 1).getValue());
  assertNotLocked(dateStr);
  sheet.getRange(row, 4).setValue(seconds);
  return getEntries(dateStr);
}

function updateEntryFull(row, project, activity, seconds) {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ENTRIES);
  var dateStr = toDateStr(sheet.getRange(row, 1).getValue());
  assertNotLocked(dateStr);
  sheet.getRange(row, 2).setValue(project);
  sheet.getRange(row, 3).setValue(activity);
  sheet.getRange(row, 4).setValue(seconds);
  return getEntries(dateStr);
}

function deleteEntry(row) {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ENTRIES);
  var dateStr = toDateStr(sheet.getRange(row, 1).getValue());
  assertNotLocked(dateStr);
  sheet.deleteRow(row);
  return getEntries(dateStr);
}

function isDateLocked(dateStr) {
  var checkpoint = getSyncCheckpoint();
  if (!checkpoint) return false;
  return dateStr <= checkpoint;
}

function assertNotLocked(dateStr) {
  if (isDateLocked(dateStr)) {
    throw new Error('This date has been synced to Kleer and is locked.');
  }
}

function toDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) return formatDate(val);
  return String(val);
}

function formatDate(date) {
  var y = date.getFullYear();
  var m = ('0' + (date.getMonth() + 1)).slice(-2);
  var d = ('0' + date.getDate()).slice(-2);
  return y + '-' + m + '-' + d;
}
