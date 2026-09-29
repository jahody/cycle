/**
 * CycleSync — Menstrual Cycle Google Calendar Integration
 * Google Apps Script Backend (v2)
 *
 * 4 phases (28-day cycle):
 *   🔴 Menstrual  (Days 1–5)    ~5 days
 *   🌸 Follicular (Days 6–14)   ~9 days
 *   ⚡ Ovulatory  (Days 15–18)  ~4 days
 *   🌙 Luteal     (Days 19–28)  ~10 days
 */

// ─── Configuration ───────────────────────────────────────────────
var CALENDAR_NAME = '🌸 Cycle Tracker';
var NUM_CYCLES    = 14;   // ~1 year of projections
var TAG           = '[CycleSync]';

var PHASES = [
  { id:'menstrual',  name:'Menstrual Phase',  emoji:'🔴', days:5,  color:'11', desc:'Rest & recovery' },
  { id:'follicular', name:'Follicular Phase', emoji:'🌸', days:9,  color:'4',  desc:'Rising energy' },
  { id:'ovulatory',  name:'Ovulatory Phase',  emoji:'⚡', days:4,  color:'10', desc:'Peak energy & fertility window' },
  { id:'luteal',     name:'Luteal Phase',     emoji:'🌙', days:10, color:'3',  desc:'Winding down' }
];
var CYCLE_LEN = PHASES.reduce(function(s,p){ return s+p.days; }, 0); // 28

// ─── Web App entry ───────────────────────────────────────────────
function doGet() {
  try {
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('CycleSync')
      .addMetaTag('viewport','width=device-width,initial-scale=1,maximum-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch(e1) {
    try {
      return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .setTitle('CycleSync')
        .addMetaTag('viewport','width=device-width,initial-scale=1,maximum-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch(e2) {
      return HtmlService.createHtmlOutput(
        '<h2>CycleSync: Missing index.html</h2>' +
        '<p>Add an HTML file named <b>index</b> to this Apps Script project.</p>'
      );
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────
function fmt(d)   { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function parse(s) { var p=s.split('-'); return new Date(+p[0], p[1]-1, +p[2], 0,0,0,0); }
function addD(d,n){ var r=new Date(d); r.setDate(r.getDate()+n); return r; }
function daysBetween(a,b) {
  var d1=new Date(a.getFullYear(),a.getMonth(),a.getDate());
  var d2=new Date(b.getFullYear(),b.getMonth(),b.getDate());
  return Math.round((d2-d1)/86400000);
}

// ─── Calendar ────────────────────────────────────────────────────
function getCal() {
  var cals = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  if (cals.length > 0) return cals[0];
  try {
    return CalendarApp.createCalendar(CALENDAR_NAME);
  } catch(e) {
    return CalendarApp.getDefaultCalendar();
  }
}

/** Delete all CycleSync events from the calendar */
function clearAllEvents() {
  var cal = getCal();
  var from = addD(new Date(), -90);
  var to   = addD(new Date(), 420); // ~14 months ahead
  var evts = cal.getEvents(from, to);
  var count = 0;
  for (var i=0; i<evts.length; i++) {
    var d = evts[i].getDescription() || '';
    if (d.indexOf(TAG) !== -1) {
      evts[i].deleteEvent();
      count++;
    }
  }
  return count;
}

/** Create phase events for NUM_CYCLES cycles starting from startStr */
function createEvents(startStr) {
  var cal = getCal();
  var start = parse(startStr);
  var created = 0;

  for (var c = 0; c < NUM_CYCLES; c++) {
    var cycleStart = addD(start, c * CYCLE_LEN);
    var dayOffset = 0;

    for (var p = 0; p < PHASES.length; p++) {
      var ph = PHASES[p];
      var evtStart = addD(cycleStart, dayOffset);
      var evtEnd   = addD(cycleStart, dayOffset + ph.days); // exclusive end

      var title = ph.emoji + ' ' + ph.name;
      var desc  = TAG + '\n' + ph.desc + '\nCycle #' + (c+1);

      try {
        var ev = cal.createAllDayEvent(title, evtStart, evtEnd, { description: desc });
        ev.setColor(ph.color);
        created++;
      } catch(err) {
        Logger.log('Event error: ' + err);
      }

      dayOffset += ph.days;
    }
  }
  return created;
}

// ─── API for frontend ────────────────────────────────────────────

/** Get current cycle status */
function getCycleStatus() {
  var props = PropertiesService.getUserProperties();
  var startStr = props.getProperty('LAST_START_DATE');
  var today = new Date();

  if (!startStr) {
    return { hasActiveCycle: false, todayDate: fmt(today) };
  }

  var start = parse(startStr);
  var diff  = daysBetween(start, today);
  if (diff < 0) diff = 0;

  var cycleIdx  = Math.floor(diff / CYCLE_LEN);
  var cycleDay  = (diff % CYCLE_LEN) + 1;  // 1..CYCLE_LEN

  // find current phase
  var acc = 0, phaseIdx = 0, phaseDay = 1;
  for (var i = 0; i < PHASES.length; i++) {
    if (cycleDay > acc && cycleDay <= acc + PHASES[i].days) {
      phaseIdx = i;
      phaseDay = cycleDay - acc;
      break;
    }
    acc += PHASES[i].days;
  }

  var cycleStart = addD(start, cycleIdx * CYCLE_LEN);
  var nextCycleStart = addD(cycleStart, CYCLE_LEN);

  // build phase date ranges for current cycle
  var phases = [];
  var pStart = new Date(cycleStart);
  for (var j = 0; j < PHASES.length; j++) {
    var pEnd = addD(pStart, PHASES[j].days);
    phases.push({
      id:        PHASES[j].id,
      name:      PHASES[j].name,
      emoji:     PHASES[j].emoji,
      desc:      PHASES[j].desc,
      days:      PHASES[j].days,
      startDate: fmt(pStart),
      endDate:   fmt(addD(pEnd, -1)),
      isCurrent: j === phaseIdx,
      isPast:    j < phaseIdx,
      isUpcoming:j > phaseIdx
    });
    pStart = pEnd;
  }

  return {
    hasActiveCycle: true,
    todayDate:      fmt(today),
    lastStartDate:  startStr,
    cycleNumber:    cycleIdx + 1,
    cycleDay:       cycleDay,
    cycleLen:       CYCLE_LEN,
    phase:          PHASES[phaseIdx],
    phaseIdx:       phaseIdx,
    phaseDay:       phaseDay,
    phaseDaysLeft:  PHASES[phaseIdx].days - phaseDay,
    nextCycleDate:  fmt(nextCycleStart),
    phases:         phases
  };
}

/** Log a new cycle start date, clear old events, create new ones */
function logCycleStart(startDateStr) {
  var props = PropertiesService.getUserProperties();
  var startDate = startDateStr || fmt(new Date());

  props.setProperty('LAST_START_DATE', startDate);

  // save to history
  var histJson = props.getProperty('CYCLE_HISTORY') || '[]';
  var hist = [];
  try { hist = JSON.parse(histJson); } catch(e) {}
  hist.unshift({ date: startDate, logged: new Date().toISOString() });
  if (hist.length > 24) hist = hist.slice(0, 24);
  props.setProperty('CYCLE_HISTORY', JSON.stringify(hist));

  // clear & recreate
  var deleted = clearAllEvents();
  var created = createEvents(startDate);

  return {
    success: true,
    message: 'Calendar updated! ' + created + ' phase events created for ~1 year.',
    deleted: deleted,
    created: created,
    status:  getCycleStatus()
  };
}

/** Reset everything */
function resetCycleData() {
  var props = PropertiesService.getUserProperties();
  var deleted = clearAllEvents();
  props.deleteProperty('LAST_START_DATE');
  props.deleteProperty('CYCLE_HISTORY');
  return {
    success: true,
    message: 'Cleared ' + deleted + ' events. Cycle data reset.',
    status: getCycleStatus()
  };
}
