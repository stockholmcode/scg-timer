const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzN_N87CFV22ZVy79iPggXGq9QBbIzIC_kccx4lyFM32WcArW6v0Pzq4mJVvgGmmyfz/exec';
const KLEER_BASE = 'https://my.kleer.se/web2/time-reporting';
const KLEER_DATA_WEEK = 'routes/_secure._app+/time-reporting+/week.($year).($weekNumber)';
const KLEER_DATA_DAY = 'routes/_secure._app+/time-reporting+/day.($year).($month).($day)';
const KLEER_DATA_LAYOUT = 'routes/_secure._app+/_layout';
const API_TOKEN = 'scg-kleer-sync-2026';
const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

let pendingWeeks = [];

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('sync-btn').addEventListener('click', doSync);
  init();
});

async function init() {
  try {
    setStatus('Loading...');
    const [checkpointResp, projects, accumulator] = await Promise.all([
      fetchScg('getSyncCheckpoint'),
      fetchScg('getProjectsWithKleerIds'),
      fetchScg('getAccumulator')
    ]);

    const checkpoint = checkpointResp.checkpoint || null;
    const today = formatDate(new Date());
    const yesterday = addDays(new Date(), -1);
    const yesterdayStr = formatDate(yesterday);

    const startDate = checkpoint ? addDays(parseDate(checkpoint), 1) : null;

    if (!startDate) {
      document.getElementById('week-info').textContent = 'First-time setup';
      setStatus('');
      showSetup();
      return;
    }

    if (formatDate(startDate) >= today) {
      document.getElementById('week-info').textContent = 'Synced through ' + checkpoint;
      setStatus('All caught up! Nothing to sync.', 'success');
      return;
    }

    const weeks = getWeeksBetween(startDate, yesterday);
    document.getElementById('week-info').textContent =
      weeks.length + ' week(s) to sync: ' + weeks.map(w => 'W' + w.num).join(', ');

    setStatus('Loading week data...');
    const kleerLayout = await fetchKleerLayout(weeks[0].year, weeks[0].num);
    const activityMeta = buildActivityMeta(kleerLayout);

    let runningAccumulator = Object.assign({}, accumulator);
    let totalActions = 0;

    for (const week of weeks) {
      setStatus('Loading W' + week.num + '...');
      const syncableDates = week.dates.filter(d => d >= formatDate(startDate) && d < today);
      if (syncableDates.length === 0) continue;

      const [scgWeek, kleerWeek] = await Promise.all([
        fetchScg('getWeekEntries', { dateStr: week.dates[0] }),
        fetchKleerWeek(week.year, week.num)
      ]);

      const plan = calculateSyncPlan(scgWeek, projects, runningAccumulator, kleerWeek, activityMeta, syncableDates);
      runningAccumulator = plan.accumulator;
      totalActions += plan.actions.length;

      pendingWeeks.push({ week, plan, syncableDates });
    }

    renderAllWeeks(pendingWeeks);

    if (totalActions > 0) {
      document.getElementById('sync-btn').disabled = false;
      setStatus(totalActions + ' change(s) across ' + pendingWeeks.length + ' week(s).');
    } else {
      setStatus('Nothing to sync — Kleer is already up to date.', 'success');
    }
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
    console.error(err);
  }
}

// --- Data fetching ---

async function fetchScg(action, params) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('token', API_TOKEN);
  url.searchParams.set('_t', Date.now());
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v);
    }
  }
  const resp = await fetch(url.toString(), { redirect: 'follow', credentials: 'include' });
  if (!resp.ok) throw new Error('SCG Timer API error: ' + resp.status);
  let data;
  try {
    data = await resp.json();
  } catch (e) {
    throw new Error('SCG Timer returned non-JSON. Are you logged into Google?');
  }
  if (data && data.error) throw new Error('SCG Timer: ' + data.error);
  return data;
}

async function fetchKleerWeek(year, weekNum) {
  const url = KLEER_BASE + '/week/' + year + '/' + weekNum + '?_data=' + encodeURIComponent(KLEER_DATA_WEEK);
  const resp = await fetch(url, { credentials: 'include' });
  if (!resp.ok) throw new Error('Kleer API error: ' + resp.status + '. Are you logged in?');
  return parseRemixResponse(resp);
}

async function fetchKleerLayout(year, weekNum) {
  const url = KLEER_BASE + '/week/' + year + '/' + weekNum + '?_data=' + encodeURIComponent(KLEER_DATA_LAYOUT);
  const resp = await fetch(url, { credentials: 'include' });
  if (!resp.ok) throw new Error('Failed to load Kleer activity data (' + resp.status + '). Are you logged in?');
  return parseRemixResponse(resp);
}

async function parseRemixResponse(resp) {
  const text = await resp.text();
  const firstLine = text.split('\n')[0];
  return JSON.parse(firstLine);
}

function buildActivityMeta(layout) {
  const meta = {};
  if (!layout || !layout.activityPickerItems) return meta;
  for (const a of layout.activityPickerItems) {
    meta[a.id] = { name: a.name, billable: a.billable, requiredFields: a.requiredFields || [] };
  }
  return meta;
}

// --- Sync plan ---

function calculateSyncPlan(scgWeek, projects, accumulator, kleerWeek, activityMeta, syncableDates) {
  const projectMap = {};
  for (const p of projects) {
    projectMap[p.project + '|||' + p.activity] = p;
  }

  const kleerMap = buildKleerMap(kleerWeek);
  const remainders = Object.assign({}, accumulator);
  const rows = [];
  const actions = [];
  const warnings = [];

  const grouped = {};
  for (const e of scgWeek.entries) {
    const key = e.project + '|||' + e.activity;
    if (!grouped[key]) grouped[key] = {};
    grouped[key][e.date] = e.seconds;
  }

  for (const key of Object.keys(grouped)) {
    const mapping = projectMap[key];
    if (!mapping || !mapping.kleerProjectId || !mapping.kleerActivityId) {
      const parts = key.split('|||');
      warnings.push('No Kleer mapping for: ' + parts[0] + ' / ' + parts[1]);
      continue;
    }

    const row = { project: mapping.project, activity: mapping.activity, days: {} };
    let remainder = remainders[key] || 0;

    for (const date of syncableDates) {
      const seconds = grouped[key][date] || 0;
      const actualMinutes = seconds / 60;
      const available = actualMinutes + remainder;
      const rounded = roundToNearest15(available);
      remainder = available - rounded;

      const kleerKey = mapping.kleerProjectId + '_' + mapping.kleerActivityId + '_' + date;
      const kleerEntry = kleerMap[kleerKey];
      const roundedHours = rounded / 60;

      let action = null;
      if (rounded === 0 && !kleerEntry) {
        row.days[date] = { rounded: 0, actual: actualMinutes, action: 'skip' };
      } else if (!kleerEntry && rounded > 0) {
        action = { type: 'create', date, mapping, hours: roundedHours, minutes: rounded, activityMeta: activityMeta[mapping.kleerActivityId] };
        row.days[date] = { rounded, actual: actualMinutes, action: 'create' };
      } else if (kleerEntry) {
        if (kleerEntry.events.length > 1) {
          warnings.push(mapping.project + ' / ' + mapping.activity + ' on ' + date + ': multiple Kleer events, skipping.');
          row.days[date] = { rounded, actual: actualMinutes, action: 'skip', kleerHours: kleerEntry.totalHours };
        } else if (Math.abs(kleerEntry.totalHours - roundedHours) < 0.01) {
          row.days[date] = { rounded, actual: actualMinutes, action: 'match', kleerHours: kleerEntry.totalHours };
        } else {
          action = { type: 'update', date, eventId: kleerEntry.events[0].id, hours: roundedHours, minutes: rounded };
          row.days[date] = { rounded, actual: actualMinutes, action: 'update', kleerHours: kleerEntry.totalHours };
        }
      }

      if (action) actions.push(action);
    }

    remainders[key] = remainder;
    rows.push(row);
  }

  return { actions, rows, syncableDates, accumulator: remainders, warnings };
}

function buildKleerMap(kleerWeek) {
  const map = {};
  if (!kleerWeek || !kleerWeek.data) return map;
  for (const row of kleerWeek.data) {
    const projectId = row.column2 && row.column2.id;
    const activityId = row.column4 && row.column4.id;
    if (!projectId || !activityId) continue;
    if (row.days) {
      for (const [date, dayData] of Object.entries(row.days)) {
        map[projectId + '_' + activityId + '_' + date] = dayData;
      }
    }
  }
  return map;
}

function roundToNearest15(minutes) {
  return Math.round(minutes / 15) * 15;
}

// --- Rendering ---

function renderAllWeeks(weekPlans) {
  const container = document.getElementById('content');
  container.innerHTML = '';

  for (const { week, plan, syncableDates } of weekPlans) {
    let html = '<div style="margin-bottom:12px;">';
    html += '<div style="color:#f5a623;font-weight:600;margin-bottom:4px;">Week ' + week.num + ' (' + syncableDates[0] + ' \u2013 ' + syncableDates[syncableDates.length - 1] + ')</div>';

    if (plan.warnings.length > 0) {
      html += '<div style="color:#ff9800;font-size:11px;">';
      for (const w of plan.warnings) html += escapeHtml(w) + '<br>';
      html += '</div>';
    }

    if (plan.rows.length === 0) {
      html += '<div style="color:#666;font-size:12px;">No entries.</div>';
    } else {
      html += '<table><thead><tr><th></th>';
      for (const d of syncableDates) {
        const dt = new Date(d + 'T12:00:00');
        const dayIdx = dt.getDay() === 0 ? 7 : dt.getDay();
        html += '<th>' + DAY_NAMES[dayIdx] + ' ' + dt.getDate() + '</th>';
      }
      html += '</tr></thead><tbody>';

      let currentProject = '';
      for (const row of plan.rows) {
        if (row.project !== currentProject) {
          currentProject = row.project;
          html += '<tr class="project-row"><td colspan="' + (syncableDates.length + 1) + '">' + escapeHtml(currentProject) + '</td></tr>';
        }
        html += '<tr><td>' + escapeHtml(row.activity) + '</td>';
        for (const d of syncableDates) {
          const cell = row.days[d];
          if (!cell || cell.action === 'skip') {
            html += '<td class="cell-skip">' + (cell && cell.rounded > 0 ? minutesToHHMM(cell.rounded) : '') + '</td>';
          } else {
            html += '<td class="cell-' + cell.action + '" title="Actual: ' + cell.actual.toFixed(0) + 'm">' + minutesToHHMM(cell.rounded) + '</td>';
          }
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
    }
    html += '</div>';
    container.innerHTML += html;
  }

  container.innerHTML += '<div class="legend"><span class="l-create">Create</span><span class="l-update">Update</span><span class="l-match">Unchanged</span></div>';
}

// --- Sync execution ---

async function doSync() {
  if (pendingWeeks.length === 0) return;
  const btn = document.getElementById('sync-btn');
  btn.disabled = true;
  btn.textContent = 'Syncing...';

  let totalDone = 0;
  let totalErrors = 0;
  const totalWeeks = pendingWeeks.length;

  while (pendingWeeks.length > 0) {
    const { week, plan, syncableDates } = pendingWeeks[0];
    const weekLabel = 'W' + week.num;

    for (let i = 0; i < plan.actions.length; i++) {
      const action = plan.actions[i];
      setStatus(weekLabel + ': syncing ' + (i + 1) + '/' + plan.actions.length + '...');
      try {
        if (action.type === 'create') {
          await kleerCreateEvent(action.date, action.mapping, action.hours, action.minutes, action.activityMeta);
        } else if (action.type === 'update') {
          await kleerUpdateEvent(action.date, action.eventId, action.hours, action.minutes);
        }
        totalDone++;
      } catch (err) {
        totalErrors++;
        console.error('Sync error for', action, err);
        setStatus(weekLabel + ': error on ' + action.date + ' \u2014 ' + err.message + '. Stopping.', 'error');
        btn.textContent = 'Retry';
        btn.disabled = false;
        return;
      }
    }

    try {
      const accEntries = [];
      for (const [key, val] of Object.entries(plan.accumulator)) {
        const parts = key.split('|||');
        accEntries.push({ project: parts[0], activity: parts[1], remainder_minutes: val });
      }
      await fetchScg('updateAccumulator', { data: accEntries });

      const lastDate = syncableDates[syncableDates.length - 1];
      await fetchScg('setSyncCheckpoint', { dateStr: lastDate });
      setStatus(weekLabel + ' done. Checkpoint: ' + lastDate);
    } catch (err) {
      console.error('Failed to save checkpoint for', weekLabel, err);
      setStatus(weekLabel + ': synced but failed to save checkpoint \u2014 ' + err.message, 'error');
      btn.textContent = 'Retry';
      btn.disabled = false;
      return;
    }

    pendingWeeks.shift();
  }

  btn.textContent = 'Sync to Kleer';
  if (totalErrors === 0) {
    setStatus('Synced ' + totalDone + ' change(s) across ' + totalWeeks + ' week(s).', 'success');
  }
}

// --- Kleer API ---

async function kleerCreateEvent(date, mapping, hours, minutes, activityMeta) {
  const [year, month, day] = date.split('-').map(Number);
  const url = KLEER_BASE + '/day/' + year + '/' + month + '/' + day + '?_data=' + encodeURIComponent(KLEER_DATA_DAY);

  const kleerProjectName = mapping.project.replace(/^\d+\s*-\s*/, '');
  const body = new URLSearchParams();
  body.set('_data', KLEER_DATA_DAY);
  body.set('intent', 'createEvents');
  body.set('pickerIsValid', 'true');
  body.set('project.id', String(mapping.kleerProjectId));
  body.set('project.name', kleerProjectName);
  body.set('project.number', mapping.kleerProjectNumber);
  body.set('project.clientName', mapping.kleerClientName || '');
  body.set('activityId', mapping.kleerActivityId);
  body.set('activity.name', activityMeta ? activityMeta.name : mapping.activity);
  body.set('activity.billable', String(mapping.kleerBillable));
  body.set('externalComment', '');

  if (activityMeta && activityMeta.requiredFields && activityMeta.requiredFields.length > 0) {
    for (let i = 0; i < activityMeta.requiredFields.length; i++) {
      body.set('requiredFields[' + i + ']', activityMeta.requiredFields[i]);
    }
    if (activityMeta.requiredFields.includes('InternalComment')) {
      body.set('internalComment', 'SCG Timer sync');
    } else {
      body.set('internalComment', '');
    }
  } else {
    body.set('internalComment', '');
  }

  body.set('days[0].date', date);
  body.set('days[0].hours.HH:MM', minutesToHHMM(minutes));
  body.set('days[0].hours.decimal', String(hours));
  body.set('days[0].hours.input', minutesToHHMM(minutes));

  const resp = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: body.toString()
  });
  if (!resp.ok) throw new Error('Kleer create failed: ' + resp.status);
  return resp.json();
}

async function kleerUpdateEvent(date, eventId, hours, minutes) {
  const [year, month, day] = date.split('-').map(Number);
  const url = KLEER_BASE + '/day/' + year + '/' + month + '/' + day + '?_data=' + encodeURIComponent(KLEER_DATA_DAY);

  const body = new URLSearchParams();
  body.set('_data', KLEER_DATA_DAY);
  body.set('intent', 'updateEventHours');
  body.set('id', String(eventId));
  body.set('hours.HH:MM', minutesToHHMM(minutes));
  body.set('hours.decimal', String(hours));
  body.set('hours.input', minutesToHHMM(minutes));

  const resp = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: body.toString()
  });
  if (!resp.ok) throw new Error('Kleer update failed: ' + resp.status);
  return resp.json();
}

// --- Week calculation ---

function getWeeksBetween(startDate, endDate) {
  const weeks = [];
  const seen = new Set();
  const d = new Date(startDate);
  while (d <= endDate) {
    const year = getISOWeekYear(d);
    const num = getISOWeekNumber(d);
    const key = year + '-' + num;
    if (!seen.has(key)) {
      seen.add(key);
      const monday = getMondayOfISOWeek(year, num);
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const dd = new Date(monday);
        dd.setDate(monday.getDate() + i);
        dates.push(formatDate(dd));
      }
      weeks.push({ year, num, dates });
    }
    d.setDate(d.getDate() + 1);
  }
  return weeks;
}

function getMondayOfISOWeek(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

function getISOWeekNumber(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getISOWeekYear(d) {
  const date = new Date(d.getTime());
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  return date.getFullYear();
}

// --- Setup ---

function showSetup() {
  const container = document.getElementById('content');
  container.innerHTML =
    '<div class="setup">' +
    '<label>Sync entries starting from the day after this date:</label>' +
    '<input type="date" id="setup-date">' +
    '<br><button id="setup-btn">Set checkpoint &amp; load</button>' +
    '</div>';
  document.getElementById('sync-btn').style.display = 'none';
  document.getElementById('setup-btn').addEventListener('click', async function() {
    const dateStr = document.getElementById('setup-date').value;
    if (!dateStr) { setStatus('Pick a date.', 'error'); return; }
    try {
      setStatus('Setting checkpoint...');
      await fetchScg('setSyncCheckpoint', { dateStr: dateStr });
      setStatus('Reloading...');
      pendingWeeks = [];
      document.getElementById('sync-btn').style.display = '';
      await init();
    } catch (err) {
      setStatus('Error: ' + err.message, 'error');
    }
  });
}

// --- Helpers ---

function formatDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n) {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function minutesToHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h + ':' + String(m).padStart(2, '0');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function setStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status' + (type ? ' ' + type : '');
}
