/**
 * CycleSync — marks every day of the next year in Google Calendar with a small
 * icon for its menstrual cycle phase, in a dedicated "🌸 Cycle Tracker" calendar.
 *
 * 28-day cycle:
 *   🔴 Menstrual  days 1–5
 *   🌱 Follicular days 6–14
 *   🦋 Ovulatory  days 15–18
 *   🌙 Luteal     days 19–28
 *
 * Dates travel as 'yyyy-mm-dd' strings. The browser always sends its own
 * "today", so phases follow the user's time zone, not the script's.
 */

// ─── Configuration ───────────────────────────────────────────────
var APP_URL        = 'https://jahody.github.io/cycle/';
var CALENDAR_NAME  = '🌸 Cycle Tracker';
var CALENDAR_COLOR = '#ffffff'; // white: each day shows just its icon, like a weather calendar
var NUM_CYCLES     = 14;        // cycles filled in from the current one (~1 year)
var MAX_PAST_DAYS  = 365;       // oldest start date accepted
var LEGACY_TAG     = '[CycleSync]'; // marks events made by versions before November 2026

// Icons are red / green / blue / yellow so neighbouring phases are easy to tell
// apart. The text fields fill the app's "Today" card and each day's event description.
var PHASES = [
  { id:'menstrual',  name:'Menstrual Phase',  emoji:'🔴', days:5,  desc:'Rest & recovery',
    hormones:'Estrogen and progesterone are at their lowest; the uterine lining sheds.',
    energy:  'Low. You may feel tired, inward and more sensitive.',
    body:    'Cramps, lower back pain, bloating or headaches are common.',
    move:    'Gentle: walking, yoga, stretching. Rest when you need it.',
    food:    'Iron-rich foods (leafy greens, legumes, meat), warm meals, magnesium, plenty of water.',
    focus:   'Reflect, review and plan. Keep the schedule light.' },
  { id:'follicular', name:'Follicular Phase', emoji:'🌱', days:9,  desc:'Rising energy',
    hormones:'Estrogen rises as follicles mature in the ovaries.',
    energy:  'Rising. Mood, motivation and curiosity pick up.',
    body:    'Workouts feel easier and recovery is quicker.',
    move:    'Build intensity: cardio, strength training, try something new.',
    food:    'Fresh, light meals, lean protein, fermented foods.',
    focus:   'Start projects, brainstorm, learn new things.' },
  { id:'ovulatory',  name:'Ovulatory Phase',  emoji:'🦋', days:4,  desc:'Peak energy & fertility window',
    hormones:'Estrogen peaks and a surge of LH releases an egg.',
    energy:  'Peak. Confident, social and talkative.',
    body:    'Possible one-sided twinges, higher libido, more cervical fluid.',
    move:    'Go hard: HIIT, sprints, personal bests.',
    food:    'Fibre, vegetables and antioxidants; stay hydrated.',
    focus:   'Presentations, important conversations, meeting people.',
    note:    'Ovulation usually falls around here; the fertile window starts about 5 days earlier. ' +
             'These dates are estimates, not a reliable method of contraception.' },
  { id:'luteal',     name:'Luteal Phase',     emoji:'🌙', days:10, desc:'Winding down',
    hormones:'Progesterone rises, then both hormones drop before your period.',
    energy:  'Steady at first, then lower; PMS may show up in the last days.',
    body:    'Cravings, bloating, breast tenderness or mood swings are common late in the phase.',
    move:    'Moderate: pilates, lighter strength training, walks.',
    food:    'Complex carbs, magnesium (nuts, dark chocolate); go easy on salt, caffeine and alcohol.',
    focus:   'Finish tasks, organise, detail work and admin.' }
];
var CYCLE_LEN = PHASES.reduce(function(s, p) { return s + p.days; }, 0); // 28

// ─── Web app ─────────────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('CycleSync')
    .setFaviconUrl(APP_URL + 'icon-192.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .addMetaTag('mobile-web-app-capable', 'yes');
}

// ─── Dates and cycle maths ───────────────────────────────────────
var DAY_MS = 86400000;

/** 'yyyy-mm-dd' → whole days since 1970-01-01. Throws on anything else. */
function dayNum(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  var n = m && Date.UTC(+m[1], m[2] - 1, +m[3]) / DAY_MS;
  if (!m || dayStr(n) !== s) throw new Error('Invalid date: ' + s);
  return n;
}

/** Whole days since 1970-01-01 → 'yyyy-mm-dd'. */
function dayStr(n) { return new Date(n * DAY_MS).toISOString().slice(0, 10); }

/** First day of the cycle that contains `today`, for cycles starting on `start`. */
function cycleStart(start, today) {
  return start + Math.floor(Math.max(0, today - start) / CYCLE_LEN) * CYCLE_LEN;
}

/** Phase index and 1-based day within that phase, for cycle day 1..CYCLE_LEN. */
function phaseOf(cycleDay) {
  for (var p = 0, first = 1; p < PHASES.length; first += PHASES[p].days, p++) {
    if (cycleDay < first + PHASES[p].days) return { index: p, day: cycleDay - first + 1 };
  }
}

/** What follows day `day` of phase `p`: the next phase, or the next period after the last one. */
function upNext(p, day) {
  var next = PHASES[(p + 1) % PHASES.length];
  var inDays = PHASES[p].days - day + 1;
  return {
    emoji: next.emoji,
    text:  (p === PHASES.length - 1 ? 'Next period ' : next.name + ' starts ') +
           (inDays === 1 ? 'tomorrow' : 'in ' + inDays + ' days')
  };
}

// ─── Calendar ────────────────────────────────────────────────────
function calendarExists(id) {
  try {
    Calendar.CalendarList.get(id);
    return true;
  } catch (e) {
    if (/not found/i.test(e.message)) return false;
    throw e;
  }
}

/** ID of the user's CycleSync calendar, or null if there is none. */
function findCalendar(props) {
  var id = props.getProperty('CALENDAR_ID');
  if (id && calendarExists(id)) return id;
  var byName = (Calendar.CalendarList.list({ minAccessRole: 'owner', maxResults: 250 }).items || [])
    .filter(function(c) { return c.summary === CALENDAR_NAME; })[0]; // made before IDs were saved
  return byName ? byName.id : null;
}

/** ID of the user's CycleSync calendar, creating it on first use. */
function calendarId(props) {
  var id = findCalendar(props);
  if (!id) {
    id = Calendar.Calendars.insert({
      summary: CALENDAR_NAME,
      description: 'Daily menstrual cycle phase icons from CycleSync: ' + APP_URL
    }).id;
    Calendar.CalendarList.patch({ backgroundColor: CALENDAR_COLOR, foregroundColor: '#000000' },
                                id, { colorRgbFormat: true });
  }
  props.setProperty('CALENDAR_ID', id);
  return id;
}

/** All events in the calendar, as series rather than their occurrences. */
function listEvents(calId) {
  var items = [], token;
  do {
    var args = { singleEvents: false, maxResults: 2500 };
    if (token) args.pageToken = token;
    var page = Calendar.Events.list(calId, args);
    items = items.concat(page.items || []);
    token = page.nextPageToken;
  } while (token);
  return items;
}

/** Event description for a cycle day. All occurrences share it, so it holds no dates. */
function dayDescription(cycleDay) {
  var pos = phaseOf(cycleDay), ph = PHASES[pos.index], next = upNext(pos.index, pos.day);
  var lines = [
    ph.emoji + ' ' + ph.name + ' · day ' + pos.day + ' of ' + ph.days + ' · ' + ph.desc,
    'Cycle day ' + cycleDay + ' of ' + CYCLE_LEN + ' · ' + next.emoji + ' ' + next.text,
    '',
    '🧬 Hormones: ' + ph.hormones,
    '🔋 Energy: '   + ph.energy,
    '🩺 Body: '     + ph.body,
    '🏃 Movement: ' + ph.move,
    '🥗 Food: '     + ph.food,
    '🎯 Focus: '    + ph.focus
  ];
  if (ph.note) lines.push('', 'ℹ️ ' + ph.note);
  lines.push('', 'From CycleSync · ' + APP_URL);
  return lines.join('\n');
}

/**
 * Make the calendar show NUM_CYCLES cycles from day `first`: one all-day "Free"
 * event per cycle day, repeating every CYCLE_LEN days. Existing CycleSync
 * series are moved rather than recreated; strays and old-version events go.
 */
function fillCalendar(calId, first) {
  var current = {};
  listEvents(calId).forEach(function(ev) {
    var day = ev.extendedProperties && ev.extendedProperties.private && ev.extendedProperties.private.cycleDay;
    if (day && !current[day]) current[day] = ev.id;
    else if (day || (ev.description || '').indexOf(LEGACY_TAG) !== -1) Calendar.Events.remove(calId, ev.id);
  });

  for (var d = 1; d <= CYCLE_LEN; d++) {
    var date = first + d - 1;
    var ev = {
      summary:      PHASES[phaseOf(d).index].emoji,
      description:  dayDescription(d),
      start:        { date: dayStr(date) },
      end:          { date: dayStr(date + 1) },
      recurrence:   ['RRULE:FREQ=DAILY;INTERVAL=' + CYCLE_LEN + ';COUNT=' + NUM_CYCLES],
      transparency: 'transparent',
      reminders:    { useDefault: false },
      extendedProperties: { private: { cycleDay: String(d) } }
    };
    if (current[d]) Calendar.Events.update(ev, calId, current[d]);
    else Calendar.Events.insert(ev, calId);
  }
}

/** Run `fn` while holding this user's lock, so two syncs can't interleave. */
function withUserLock(fn) {
  var lock = LockService.getUserLock();
  lock.waitLock(60000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ─── API for the page ────────────────────────────────────────────

/** Everything the page shows, for the browser's local date `todayStr`. */
function getStatus(todayStr) {
  var auth = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  if (auth.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
    return { authUrl: auth.getAuthorizationUrl() };
  }

  var props = PropertiesService.getUserProperties();
  var startStr = props.getProperty('LAST_START_DATE');
  if (!startStr) return { active: false };

  var today = dayNum(todayStr), start = dayNum(startStr);
  var first = cycleStart(start, today);
  var cycleDay = Math.max(0, today - first) + 1;
  var pos = phaseOf(cycleDay);

  var phases = [], from = first;
  PHASES.forEach(function(ph) {
    phases.push({ id: ph.id, name: ph.name, emoji: ph.emoji, from: dayStr(from), to: dayStr(from + ph.days - 1) });
    from += ph.days;
  });

  return {
    active:      true,
    startDate:   startStr,
    filledUntil: props.getProperty('FILLED_UNTIL'),
    cycleDay:    cycleDay,
    phaseIndex:  pos.index,
    phaseDay:    pos.day,
    phase:       PHASES[pos.index],
    next:        upNext(pos.index, pos.day),
    phases:      phases,
    nextPeriods: [1, 2, 3].map(function(k) { return dayStr(first + k * CYCLE_LEN); })
  };
}

/** Save the day the last period started and fill the calendar from it. */
function setStartDate(startStr, todayStr) {
  var start = dayNum(startStr), today = dayNum(todayStr);
  if (start > today) throw new Error('The start date can’t be in the future.');
  if (today - start > MAX_PAST_DAYS) throw new Error('Pick a start date within the last year.');

  withUserLock(function() {
    var props = PropertiesService.getUserProperties();
    var first = cycleStart(start, today);
    fillCalendar(calendarId(props), first);
    props.setProperties({
      LAST_START_DATE: startStr,
      FILLED_UNTIL:    dayStr(first + NUM_CYCLES * CYCLE_LEN - 1)
    });
  });
  return getStatus(todayStr);
}

/** Delete the CycleSync calendar and everything saved for this user. */
function removeEverything() {
  withUserLock(function() {
    var props = PropertiesService.getUserProperties();
    var id = findCalendar(props);
    if (id) Calendar.Calendars.remove(id);
    props.deleteAllProperties();
  });
  return { active: false };
}
