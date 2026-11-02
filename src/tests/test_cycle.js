// Tests for the live Apps Script code (apps_script/Code.js). It runs in Node
// against fake Google services (CalendarApp, PropertiesService, ...), so no
// Google account is needed and the real calendar is never touched.
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

const pad = n => String(n).padStart(2, '0');
const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDate = dateKey => new Date(dateKey + 'T00:00:00');
const plusDays = (dateKey, n) => { const d = toDate(dateKey); d.setDate(d.getDate() + n); return key(d); };

/**
 * Load Code.js with fake Google services. `app.setToday('yyyy-mm-dd')` fixes
 * what `new Date()` returns inside the script.
 */
function loadApp() {
  let now = Date.now();
  class FakeDate extends Date {
    constructor(...args) { if (args.length) super(...args); else super(now); }
    static now() { return now; }
  }

  // Calendar items: series (from the app) or single events (seeded by tests).
  const calendar = { color: null, items: [], nextId: 1 };
  const occurrences = item => Array.from({ length: item.times }, (_, i) => plusDays(item.start, i * item.every));
  const cal = {
    setColor: c => { calendar.color = c; },
    createAllDayEventSeries: (title, start, rec, opts) => {
      calendar.items.push({ id: 'series' + calendar.nextId++, title, start: key(start),
                            every: rec.rule.every, times: rec.rule.times, recurring: true,
                            description: opts.description });
    },
    getEvents: (from, to) => {
      const out = [];
      for (const item of calendar.items.filter(i => !i.deleted)) {
        for (const day of occurrences(item)) {
          const t = toDate(day).getTime();
          if (t < from.getTime() || t >= to.getTime()) continue;
          out.push({
            getDescription: () => item.description,
            isRecurringEvent: () => item.recurring,
            getId: () => item.id,
            getEventSeries: () => ({ deleteEventSeries: () => { item.deleted = true; } }),
            deleteEvent: () => { item.deleted = true; },
          });
        }
      }
      return out;
    },
  };
  const newRecurrence = () => {
    const rule = {};
    const builder = { rule, addDailyRule: () => builder,
                      interval: n => { rule.every = n; return builder; },
                      times: n => { rule.times = n; return builder; } };
    return builder;
  };
  const store = {};
  const props = {
    getProperty: k => (k in store ? store[k] : null),
    setProperty: (k, v) => { store[k] = String(v); },
    deleteProperty: k => { delete store[k]; },
  };
  const logs = [];

  const ctx = vm.createContext({
    Date: FakeDate,
    CalendarApp: { getCalendarsByName: () => [cal], newRecurrence },
    PropertiesService: { getUserProperties: () => props },
    Utilities: { formatDate: d => key(d) },
    Session: { getScriptTimeZone: () => 'Europe/Prague' },
    Logger: { log: m => logs.push(String(m)) },
    HtmlService: {},
  });
  vm.runInContext(fs.readFileSync(CODE_PATH, 'utf8'), ctx);

  return {
    ctx, calendar, props, logs,
    setToday: dateKey => { now = new Date(dateKey + 'T12:00:00').getTime(); },
    /** Map of 'yyyy-mm-dd' → titles of the app's live events on that day. */
    iconsByDay: () => {
      const map = {};
      for (const item of calendar.items.filter(i => !i.deleted)) {
        for (const day of occurrences(item)) (map[day] = map[day] || []).push(item.title);
      }
      return map;
    },
    liveSeries: () => calendar.items.filter(i => i.recurring && !i.deleted),
  };
}

const expectedIcon = cycleDay => cycleDay <= 5 ? '🔴' : cycleDay <= 14 ? '🌱' : cycleDay <= 18 ? '🦋' : '🌙';

console.log('--- Testing apps_script/Code.js (5 / 9 / 4 / 10 day phases) ---');

// Test 1: Phase configuration
{
  const { ctx } = loadApp();
  assert(ctx.CYCLE_LEN === 28, `Total cycle length is 28 (got ${ctx.CYCLE_LEN})`);
  assert(ctx.PHASES.map(p => p.days).join(',') === '5,9,4,10', 'Phase durations are 5, 9, 4, 10');
  assert(ctx.PHASES.map(p => p.emoji).join(' ') === '🔴 🌱 🦋 🌙', 'Phase icons are 🔴 🌱 🦋 🌙');
}

// Test 2: Cycle status progression (start = 2026-08-01 = Cycle Day 1)
{
  const app = loadApp();
  app.setToday('2026-08-01');
  assert(app.ctx.getCycleStatus().hasActiveCycle === false, 'No start date saved → no active cycle');

  app.props.setProperty('LAST_START_DATE', '2026-08-01');
  const cases = [
    ['2026-08-01', 'menstrual', 1, 1, 1], ['2026-08-05', 'menstrual', 5, 5, 1],
    ['2026-08-06', 'follicular', 1, 6, 1], ['2026-08-14', 'follicular', 9, 14, 1],
    ['2026-08-15', 'ovulatory', 1, 15, 1], ['2026-08-18', 'ovulatory', 4, 18, 1],
    ['2026-08-19', 'luteal', 1, 19, 1], ['2026-08-28', 'luteal', 10, 28, 1],
    ['2026-08-29', 'menstrual', 1, 1, 2],
  ];
  for (const [today, phase, phaseDay, cycleDay, cycleNumber] of cases) {
    app.setToday(today);
    const s = app.ctx.getCycleStatus();
    assert(s.phase.id === phase && s.phaseDay === phaseDay && s.cycleDay === cycleDay && s.cycleNumber === cycleNumber,
           `${today} is ${phase} day ${phaseDay} (cycle day ${cycleDay}, cycle #${cycleNumber})`);
  }

  app.setToday('2026-08-10');
  const s = app.ctx.getCycleStatus();
  assert(s.phases[1].startDate === '2026-08-06' && s.phases[1].endDate === '2026-08-14', 'Follicular phase runs Aug 6 → Aug 14');
  assert(s.nextCycleDate === '2026-08-29', `Next cycle starts Aug 29 (got ${s.nextCycleDate})`);
}

// Test 3: Syncing marks every day of 14 cycles with exactly one correct icon
{
  const app = loadApp();
  app.setToday('2026-08-01');
  const res = app.ctx.logCycleStart('2026-08-01');
  const series = app.liveSeries();
  const icons = app.iconsByDay();

  assert(res.success && res.created === 392, `Sync reports 392 marked days (got ${res.created})`);
  assert(series.length === 28 && series.every(s => s.every === 28 && s.times === 14),
         `28 series, each repeating every 28 days, 14 times (got ${series.length})`);
  assert(app.calendar.color === '#FFFFFF', 'Cycle calendar is set to white, like a weather calendar');

  let allCorrect = true;
  for (let i = 0; i < 28 * 14; i++) {
    const day = plusDays('2026-08-01', i);
    const got = icons[day] || [];
    if (got.length !== 1 || got[0] !== expectedIcon((i % 28) + 1)) { allCorrect = false; console.error(`   ${day}: ${got.join(' ') || 'nothing'}`); }
  }
  assert(allCorrect, 'All 392 days have exactly one icon, matching their phase');
  assert(!icons[plusDays('2026-08-01', 392)] && !icons['2026-07-31'], 'Nothing is added before the start or after the 14th cycle');
  assert(app.logs.length === 0, `No calendar errors were logged (got ${app.logs.length})`);
  assert(JSON.parse(app.props.getProperty('CYCLE_HISTORY'))[0].date === '2026-08-01', 'Start date is saved to history');
}

// Test 4: Event descriptions
{
  const app = loadApp();
  app.setToday('2026-08-01');
  app.ctx.logCycleStart('2026-08-01');
  const descFor = cycleDay => app.liveSeries().find(s => s.start === plusDays('2026-08-01', cycleDay - 1)).description;

  assert(descFor(3).startsWith('🔴 Menstrual Phase · day 3 of 5') && descFor(3).includes('🌱 Follicular Phase starts in 3 days'),
         'Day 3 says Menstrual day 3 of 5 and Follicular starts in 3 days');
  assert(descFor(5).includes('Follicular Phase starts tomorrow'), 'Last menstrual day says Follicular starts tomorrow');
  assert(descFor(24).includes('🔴 Next period in 5 days'), 'Luteal days count down to the next period');
  assert(descFor(28).includes('🔴 Next period tomorrow'), 'Day 28 says next period tomorrow');
  assert([15, 16, 17, 18].every(d => descFor(d).includes('not a reliable method of contraception')),
         'Ovulatory days carry the contraception note');
  assert(app.liveSeries().every(s => s.description.trim().endsWith('[CycleSync]') && s.description.includes('🧬 Hormones:')),
         'Every description has phase details and ends with the [CycleSync] tag');
}

// Test 5: Recalibration replaces the old projection and leaves other events alone
{
  const app = loadApp();
  app.setToday('2026-08-01');
  app.ctx.logCycleStart('2026-08-01');
  app.calendar.items.push({ id: 'legacy', title: '🔴 Menstrual Phase', start: '2026-08-20', every: 0, times: 1,
                            recurring: false, description: '[CycleSync]\nRest & recovery' });
  app.calendar.items.push({ id: 'yoga', title: 'Joga', start: '2026-08-21', every: 0, times: 1,
                            recurring: false, description: 'Not ours' });

  app.setToday('2026-08-24');
  const res = app.ctx.logCycleStart('2026-08-24');
  const icons = app.iconsByDay();
  assert(res.deleted === 29, `Re-sync deletes the 28 old series and 1 old-style event (got ${res.deleted})`);
  assert(app.liveSeries().length === 28 && app.liveSeries().every(s => s.start >= '2026-08-24'),
         'Only the 28 new series remain, all starting from Aug 24');
  assert(icons['2026-08-24'].join() === '🔴' && icons['2026-08-23'] === undefined, 'Aug 24 is now 🔴 and the old icons before it are gone');
  assert(!app.calendar.items.find(i => i.id === 'yoga').deleted, 'Unrelated events are not touched');
  assert(app.ctx.getCycleStatus().lastStartDate === '2026-08-24', 'New start date is saved');
}

// Test 6: Reset clears events and saved data
{
  const app = loadApp();
  app.setToday('2026-08-01');
  app.ctx.logCycleStart('2026-08-01');
  const res = app.ctx.resetCycleData();
  assert(res.success && app.liveSeries().length === 0, 'Reset deletes all cycle events');
  assert(!res.status.hasActiveCycle && app.props.getProperty('CYCLE_HISTORY') === null, 'Reset clears the saved start date and history');
}

console.log('--- All Tests Completed ---');
