var SHEET_NAME = 'SCG Timer';
var TAB_ENTRIES = 'Entries';
var TAB_ACTIVE = 'Active';
var TAB_PROJECTS = 'Projects';
var TAB_ACCUMULATOR = 'Accumulator';

var DEFAULT_PROJECTS = [
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Holiday', true],
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Time off', true],
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Weekday', true],
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Weekend', true],
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Work, Rate 1', true],
  ['4 - Discoveryplus (Peter Borg)', 'On-call, Work, Rate 2', true],
  ['4 - Discoveryplus (Peter Borg)', 'Overtime, Rate 1', true],
  ['4 - Discoveryplus (Peter Borg)', 'Overtime, Rate 2', true],
  ['4 - Discoveryplus (Peter Borg)', 'System development', true],
  ['4 - Discoveryplus (Peter Borg)', 'Travel time', true],
  ['13 - SCG Internrapportering', 'Ω All other internal time', true],
  ['13 - SCG Internrapportering', 'Ω Conference / Kick-off – internal', true],
  ['13 - SCG Internrapportering', 'Ω Employee Coaching / Check-in', true],
  ['13 - SCG Internrapportering', 'Ω Internal meeting – planned', true],
  ['13 - SCG Internrapportering', 'Ω Recruitment', true],
  ['13 - SCG Internrapportering', 'Ω Sales work / Client meetings', true],
  ['13 - SCG Internrapportering', 'Ω Training – planned', true]
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SCG Timer')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
  projectsSheet.appendRow(['project', 'activity', 'enabled']);
  projectsSheet.setFrozenRows(1);
  for (var i = 0; i < DEFAULT_PROJECTS.length; i++) {
    projectsSheet.appendRow(DEFAULT_PROJECTS[i]);
  }

  var accSheet = ss.insertSheet(TAB_ACCUMULATOR);
  accSheet.appendRow(['project', 'activity', 'remainder_minutes']);
  accSheet.setFrozenRows(1);

  return ss;
}

function getInitData() {
  var projects = getProjects();
  var active = getActive();
  var entries = getEntries(null);
  return {
    projects: projects,
    active: active,
    entries: entries
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

  activeSheet.deleteRow(2);

  var dateStr = formatDate(new Date());
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
  sheet.getRange(row, 4).setValue(seconds);
  var dateStr = toDateStr(sheet.getRange(row, 1).getValue());
  return getEntries(dateStr);
}

function updateEntryFull(row, project, activity, seconds) {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ENTRIES);
  sheet.getRange(row, 2).setValue(project);
  sheet.getRange(row, 3).setValue(activity);
  sheet.getRange(row, 4).setValue(seconds);
  var dateStr = toDateStr(sheet.getRange(row, 1).getValue());
  return getEntries(dateStr);
}

function deleteEntry(row) {
  var ss = getOrCreateSheet();
  var sheet = ss.getSheetByName(TAB_ENTRIES);
  var dateStr = toDateStr(sheet.getRange(row, 1).getValue());
  sheet.deleteRow(row);
  return getEntries(dateStr);
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
