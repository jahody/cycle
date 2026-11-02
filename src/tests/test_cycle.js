// Tests for the live Apps Script code (apps_script/Code.js). It runs in Node
// against fake Google services (the Calendar API, PropertiesService, ...), so
// no Google account is needed and no real calendar is touched.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CODE_PATH = path.join(__dirname, '..', '..', 'apps_script', 'Code.js');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function throws(fn, pattern) {
  try { fn(); } catch (e) { return pattern.test(e.message); }
  return false;
}

const toDate = s => new Date(s + 'T00:00:00Z');
const plusDays = (s, n) => new Date(toDate(s).getTime() + n * 86400000).toISOString().slice(0, 10);

/** Load Code.js with fake Google services. */
function loadApp({ authorized = true } = {}) {
  const calendars = {};   // id → { id, summary, description, color, events: { id → event } }
  const calls = { insert: 0, update: 0, remove: 0 };
  let nextId = 1;
  const notFound = () => new Error('API call to calendar failed with error: Not Found');
  const cal = id => { if (!calendars[id]) throw notFound(); return calendars[id]; };
  const store = {};

  const Calendar = {
    CalendarList: {
      get: id => ({ id, summary: cal(id).summary }),
      list: () => ({ items: Object.values(calendars).map(c => ({ id: c.id, summary: c.summary })) }),
      patch: (res, id, args) => { cal(id).color = args.colorRgbFormat ? res.backgroundColor : null; },
    },
    Calendars: {
      insert: res => { const id = 'cal' + nextId++; calendars[id] = { id, ...res, events: {} }; return { id }; },
      remove: id => { cal(id); delete calendars[id]; },
    },
    Events: {
      list: id => ({ items: Object.values(cal(id).events).map(e => JSON.parse(JSON.stringify(e))) }),
      insert: (res, id) => { calls.insert++; const e = { ...res, id: 'ev' + nextId++ }; cal(id).events[e.id] = e; return e; },
      update: (res, id, evId) => { calls.update++; if (!cal(id).events[evId]) throw notFound(); cal(id).events[evId] = { ...res, id: evId }; },
      remove: (id, evId) => { calls.remove++; if (!cal(id).events[evId]) throw notFound(); delete cal(id).events[evId]; },
    },
  };

  const ctx = vm.createContext({
    Calendar,
    PropertiesService: { getUserProperties: () => ({
      getProperty: k => (k in store ? store[k] : null),
      setProperty: (k, v) => { store[k] = String(v); },
      setProperties: o => Object.assign(store, o),
      deleteAllProperties: () => Object.keys(store).forEach(k => delete store[k]),
    }) },
    LockService: { getUserLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ScriptApp: {
      AuthMode: { FULL: 'FULL' },
      AuthorizationStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED' },
      getAuthorizationInfo: () => ({
        getAuthorizationStatus: () => (authorized ? 'NOT_REQUIRED' : 'REQUIRED'),
        getAuthorizationUrl: () => 'https://script.google.com/authorize',
      }),
    },
    HtmlService: { createTemplateFromFile: file => {
      const page = { file, settings: {} };
      const output = new Proxy({}, { get: (_, name) => (...args) => { page.settings[name] = args; return output; } });
      page.evaluate = () => output;
      return page;
    } },
  });
  vm.runInContext(fs.readFileSync(CODE_PATH, 'utf8'), ctx);

  return {
    ctx, calendars, calls, store,
    theCalendar: () => Object.values(calendars).find(c => c.summary === '🌸 Cycle Tracker'),
    /** Map of 'yyyy-mm-dd' → titles of all CycleSync event occurrences on that day. */
    iconsByDay() {
      const map = {};
      for (const e of Object.values(this.theCalendar().events)) {
        const rule = /INTERVAL=(\d+);COUNT=(\d+)/.exec((e.recurrence || [''])[0]);
        const [every, times] = rule ? [+rule[1], +rule[2]] : [0, 1];
        for (let i = 0; i < times; i++) (map[plusDays(e.start.date, i * every)] ||= []).push(e.summary);
      }
      return map;
    },
  };
}

const expectedIcon = cycleDay => cycleDay <= 5 ? '🔴' : cycleDay <= 14 ? '🌱' : cycleDay <= 18 ? '🦋' : '🌙';

console.log('--- Testing apps_script/Code.js (5 / 9 / 4 / 10 day phases) ---');

// Test 1: Phase configuration and date handling
{
  const { ctx } = loadApp();
  assert(ctx.CYCLE_LEN === 28, `Total cycle length is 28 (got ${ctx.CYCLE_LEN})`);
  assert(ctx.PHASES.map(p => p.days).join(',') === '5,9,4,10', 'Phase durations are 5, 9, 4, 10');
  assert(ctx.PHASES.map(p => p.emoji).join(' ') === '🔴 🌱 🦋 🌙', 'Phase icons are 🔴 🌱 🦋 🌙');
  assert(ctx.dayStr(ctx.dayNum('2026-03-29')) === '2026-03-29', 'Dates round-trip across a daylight-saving change');
  assert(['2026-02-30', '26-01-01', '', null, '2026-1-5'].every(s => throws(() => ctx.dayNum(s), /Invalid date/)),
         'Malformed or impossible dates are rejected');
}

// Test 2: The web page
{
  const { ctx } = loadApp();
  const page = ctx.HtmlService.createTemplateFromFile('Index');
  ctx.HtmlService.createTemplateFromFile = () => page;
  ctx.doGet();
  assert(page.file === 'Index' && page.appUrl === 'https://jahody.github.io/cycle/', 'Serves Index.html with the site address filled in');
  assert(page.config === JSON.stringify({ cycleLen: 28, maxPastDays: 365 }), 'Gives the page the cycle length and oldest allowed start date');
  assert(page.settings.setFaviconUrl[0] === 'https://jahody.github.io/cycle/icon-192.png' && page.settings.setTitle[0] === 'CycleSync',
         'Sets the CycleSync title and tab icon');
  assert(page.settings.addMetaTag[0] === 'mobile-web-app-capable', 'Can be added to an Android home screen as an app');
}

// Test 3: Status before anything is set up
{
  assert(loadApp({ authorized: false }).ctx.getStatus('2026-08-01').authUrl === 'https://script.google.com/authorize',
         'Missing calendar permission → status carries the link to grant it');
  assert(loadApp().ctx.getStatus('2026-08-01').active === false, 'No start date saved → no active cycle');
}

// Test 4: Cycle status progression (start = 2026-08-01 = cycle day 1)
{
  const app = loadApp();
  app.store.LAST_START_DATE = '2026-08-01';
  const cases = [
    ['2026-08-01', 'menstrual', 1, 1, '🌱 Follicular Phase starts in 5 days'],
    ['2026-08-05', 'menstrual', 5, 5, '🌱 Follicular Phase starts tomorrow'],
    ['2026-08-06', 'follicular', 1, 6, '🦋 Ovulatory Phase starts in 9 days'],
    ['2026-08-15', 'ovulatory', 1, 15, '🌙 Luteal Phase starts in 4 days'],
    ['2026-08-19', 'luteal', 1, 19, '🔴 Next period in 10 days'],
    ['2026-08-28', 'luteal', 10, 28, '🔴 Next period tomorrow'],
    ['2026-08-29', 'menstrual', 1, 1, '🌱 Follicular Phase starts in 5 days'],
  ];
  for (const [today, phase, phaseDay, cycleDay, next] of cases) {
    const s = app.ctx.getStatus(today);
    const got = `${s.phase.id} day ${s.phaseDay}, cycle day ${s.cycleDay}, ${s.next.emoji} ${s.next.text}`;
    assert(got === `${phase} day ${phaseDay}, cycle day ${cycleDay}, ${next}`, `${today}: ${got}`);
  }
  const s = app.ctx.getStatus('2026-09-10');
  assert(s.phases[0].from === '2026-08-29' && s.phases[1].from === '2026-09-03' && s.phases[1].to === '2026-09-11',
         'This cycle’s phases run from the current cycle start (Aug 29, follicular Sep 3 → Sep 11)');
  assert(s.nextPeriods.join() === '2026-09-26,2026-10-24,2026-11-21', `Next periods follow every 28 days (got ${s.nextPeriods})`);
  assert(s.phase.food && s.phase.move, 'Status includes today’s phase tips');
}

// Test 5: First sync creates the calendar and one icon per day for 14 cycles
{
  const app = loadApp();
  const s = app.ctx.setStartDate('2026-08-01', '2026-08-01');
  const cal = app.theCalendar();
  const events = Object.values(cal.events);
  const icons = app.iconsByDay();

  assert(cal && cal.color === '#ffffff', 'Creates a white “🌸 Cycle Tracker” calendar');
  assert(app.store.CALENDAR_ID === cal.id, 'Remembers the calendar’s ID');
  assert(events.length === 28 && events.every(e => e.recurrence[0] === 'RRULE:FREQ=DAILY;INTERVAL=28;COUNT=14'),
         '28 series, each repeating every 28 days, 14 times');
  assert(events.every(e => e.transparency === 'transparent' && e.reminders.useDefault === false),
         'Every icon shows as Free and has no reminders');

  let allCorrect = true;
  for (let i = 0; i < 28 * 14; i++) {
    const day = plusDays('2026-08-01', i), got = icons[day] || [];
    if (got.length !== 1 || got[0] !== expectedIcon((i % 28) + 1)) { allCorrect = false; console.error(`   ${day}: ${got.join(' ') || 'nothing'}`); }
  }
  assert(allCorrect, 'All 392 days have exactly one icon, matching their phase');
  assert(!icons['2026-07-31'] && !icons[plusDays('2026-08-01', 392)], 'Nothing before the start or after the 14th cycle');
  assert(s.active && s.filledUntil === plusDays('2026-08-01', 391) && app.store.LAST_START_DATE === '2026-08-01',
         `Saves the start date and how far the calendar is filled (${s.filledUntil})`);

  const desc = day => events.find(e => e.extendedProperties.private.cycleDay === String(day)).description;
  assert(desc(3).startsWith('🔴 Menstrual Phase · day 3 of 5') && desc(3).includes('🌱 Follicular Phase starts in 3 days'),
         'Day 3 description: menstrual day 3 of 5, follicular in 3 days');
  assert(desc(28).includes('🔴 Next period tomorrow'), 'Day 28 description: next period tomorrow');
  assert([15, 16, 17, 18].every(d => desc(d).includes('not a reliable method of contraception')), 'Ovulatory days carry the contraception note');
  assert(events.every(e => e.description.includes('🧬 Hormones:') && e.description.endsWith('jahody.github.io/cycle/')),
         'Every description has the phase details and links back to the app');
}

// Test 6: A new start date moves the existing series instead of recreating them
{
  const app = loadApp();
  app.ctx.setStartDate('2026-08-01', '2026-08-01');
  const cal = app.theCalendar();
  cal.events.legacy = { id: 'legacy', summary: '🔴 Menstrual Phase', start: { date: '2026-08-20' }, description: '[CycleSync]\nRest & recovery' };
  cal.events.dupe   = { ...Object.values(cal.events)[0], id: 'dupe' };
  cal.events.yoga   = { id: 'yoga', summary: 'Joga', start: { date: '2026-08-21' }, description: 'Mine' };
  app.calls.insert = app.calls.update = app.calls.remove = 0;

  app.ctx.setStartDate('2026-08-24', '2026-08-24');
  const icons = app.iconsByDay();
  assert(app.calls.insert === 0 && app.calls.update === 28, `Re-sync updates the 28 series in place (${app.calls.update} updates, ${app.calls.insert} inserts)`);
  assert(app.calls.remove === 2 && !cal.events.legacy && !cal.events.dupe, 'Removes a duplicate and an event from an older version');
  assert(cal.events.yoga, 'Leaves the user’s own events alone');
  assert(icons['2026-08-24'].join() === '🔴' && !icons['2026-08-23'], 'Aug 24 is now day 1, with nothing before it');
}

// Test 7: An older start date fills from the current cycle, not from the past
{
  const app = loadApp();
  const s = app.ctx.setStartDate('2026-07-01', '2026-08-24');  // 54 days ago → cycle 2 started Jul 29
  const firstDay = Object.values(app.theCalendar().events).map(e => e.start.date).sort()[0];
  assert(firstDay === '2026-07-29' && s.filledUntil === plusDays('2026-07-29', 391), `Fills 14 cycles from Jul 29 (first icon ${firstDay})`);
  assert(s.cycleDay === 27 && s.phase.id === 'luteal', `Aug 24 is cycle day 27, luteal (got ${s.cycleDay}, ${s.phase.id})`);
}

// Test 8: Bad start dates are refused before touching the calendar
{
  const app = loadApp();
  assert(throws(() => app.ctx.setStartDate('2026-08-02', '2026-08-01'), /future/), 'A future start date is refused');
  assert(throws(() => app.ctx.setStartDate('2025-07-01', '2026-08-01'), /within the last year/), 'A start date over a year ago is refused');
  assert(throws(() => app.ctx.setStartDate('yesterday', '2026-08-01'), /Invalid date/), 'A malformed date is refused');
  assert(Object.keys(app.calendars).length === 0, 'No calendar was created by refused requests');
}

// Test 9: Finding the calendar
{
  const app = loadApp();
  const old = app.ctx.Calendar.Calendars.insert({ summary: '🌸 Cycle Tracker' }).id;  // from an earlier version
  app.ctx.setStartDate('2026-08-01', '2026-08-01');
  assert(Object.keys(app.calendars).length === 1 && app.store.CALENDAR_ID === old, 'Reuses a calendar made by an earlier version');

  app.ctx.Calendar.Calendars.remove(old);  // the user deleted it in Google Calendar
  app.ctx.setStartDate('2026-08-01', '2026-08-01');
  assert(app.store.CALENDAR_ID !== old && Object.keys(app.theCalendar().events).length === 28, 'Recreates the calendar if the user deleted it');
}

// Test 10: Removing everything
{
  const app = loadApp();
  app.ctx.setStartDate('2026-08-01', '2026-08-01');
  app.store.CYCLE_HISTORY = '[]';  // left by an earlier version
  const s = app.ctx.removeEverything();
  assert(!app.theCalendar() && Object.keys(app.store).length === 0 && s.active === false,
         'Deletes the CycleSync calendar and every saved setting');
  assert(app.ctx.removeEverything().active === false, 'Removing again when nothing is left is harmless');
}

console.log('--- All Tests Completed ---');
