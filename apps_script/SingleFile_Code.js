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
  { id:'menstrual',  name:'Menstrual Phase',  emoji:'🔴', days:5,  desc:'Rest & recovery' },
  { id:'follicular', name:'Follicular Phase', emoji:'🌸', days:9,  desc:'Rising energy' },
  { id:'ovulatory',  name:'Ovulatory Phase',  emoji:'⚡', days:4,  desc:'Peak energy & fertility window' },
  { id:'luteal',     name:'Luteal Phase',     emoji:'🌙', days:10, desc:'Winding down' }
];
var CYCLE_LEN = PHASES.reduce(function(s,p){ return s+p.days; }, 0); // 28
var CAL_COLOR = '#FFFFFF'; // white calendar: each day shows just its icon, no coloured bar

// ─── Web App entry ───────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutput(getHtmlDashboard())
    .setTitle('CycleSync')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getHtmlDashboard() {
  return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">\n  <title>CycleSync</title>\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n  <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap\" rel=\"stylesheet\">\n  <style>\n    body { font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }\n    .glow-red    { box-shadow: 0 8px 24px -8px rgba(239,68,68,0.3); }\n    .glow-pink   { box-shadow: 0 8px 24px -8px rgba(236,72,153,0.3); }\n    .glow-green  { box-shadow: 0 8px 24px -8px rgba(34,197,94,0.3); }\n    .glow-purple { box-shadow: 0 8px 24px -8px rgba(168,85,247,0.3); }\n  </style>\n</head>\n<body class=\"bg-gray-50 text-gray-900 min-h-screen antialiased\">\n\n  <!-- Header -->\n  <header class=\"bg-white border-b border-gray-100 sticky top-0 z-30\">\n    <div class=\"max-w-lg mx-auto px-4 py-3 flex items-center justify-between\">\n      <div class=\"flex items-center space-x-2\">\n        <span class=\"text-xl\">🌸</span>\n        <h1 class=\"text-base font-bold text-gray-900\">CycleSync</h1>\n      </div>\n      <div class=\"flex items-center space-x-1\">\n        <a href=\"https://calendar.google.com\" target=\"_blank\" class=\"p-2 text-gray-400 hover:text-gray-700 rounded-lg text-xs\">📅</a>\n        <button onclick=\"showSettings()\" class=\"p-2 text-gray-400 hover:text-gray-700 rounded-lg\">⚙️</button>\n      </div>\n    </div>\n  </header>\n\n  <main class=\"max-w-lg mx-auto px-4 py-5 space-y-4\">\n\n    <!-- Loading -->\n    <div id=\"loading\" class=\"animate-pulse space-y-3\">\n      <div class=\"h-44 bg-gray-200 rounded-2xl\"></div>\n      <div class=\"h-24 bg-gray-200 rounded-2xl\"></div>\n    </div>\n\n    <!-- ═══════════════════════════════════════════════════════════ -->\n    <!-- START SCREEN: no cycle logged yet                          -->\n    <!-- ═══════════════════════════════════════════════════════════ -->\n    <div id=\"startScreen\" class=\"hidden\">\n      <div class=\"bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-5\">\n        <div class=\"text-4xl\">🌸</div>\n        <h2 class=\"text-xl font-bold\">When did your last period start?</h2>\n        <p class=\"text-sm text-gray-500\">Pick the date and we'll fill your Google Calendar with all 4 cycle phases for the next year.</p>\n\n        <div class=\"space-y-3 text-left\">\n          <input type=\"date\" id=\"startDateInput\"\n                 class=\"w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-rose-500\">\n\n          <div class=\"flex flex-wrap gap-2\">\n            <button onclick=\"setPreset(0)\"  class=\"px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium\">Today</button>\n            <button onclick=\"setPreset(-1)\" class=\"px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium\">Yesterday</button>\n            <button onclick=\"setPreset(-2)\" class=\"px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium\">2 days ago</button>\n            <button onclick=\"setPreset(-3)\" class=\"px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium\">3 days ago</button>\n            <button onclick=\"setPreset(-7)\" class=\"px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium\">1 week ago</button>\n          </div>\n\n          <button onclick=\"submitStart()\" id=\"btnSubmit\"\n                  class=\"w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl text-sm transition active:scale-[0.98]\">\n            Set Start Date & Sync Calendar\n          </button>\n        </div>\n      </div>\n    </div>\n\n    <!-- ═══════════════════════════════════════════════════════════ -->\n    <!-- DASHBOARD: active cycle                                    -->\n    <!-- ═══════════════════════════════════════════════════════════ -->\n    <div id=\"dashboard\" class=\"hidden space-y-4\">\n\n      <!-- Current Phase Hero -->\n      <div id=\"heroCard\" class=\"bg-white rounded-2xl border border-gray-100 p-5\">\n        <div class=\"flex items-start justify-between\">\n          <div>\n            <div id=\"phaseBadge\" class=\"inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide mb-1.5\">\n              <span id=\"phaseEmoji\"></span>\n              <span id=\"phaseName\"></span>\n            </div>\n            <h2 class=\"text-2xl font-extrabold\" id=\"dayTitle\"></h2>\n            <p class=\"text-xs text-gray-500 mt-0.5\" id=\"cycleInfo\"></p>\n          </div>\n          <div class=\"text-right\">\n            <span class=\"text-[10px] font-semibold uppercase text-gray-400\">Next phase</span>\n            <div class=\"text-sm font-bold text-gray-700\" id=\"countdown\"></div>\n          </div>\n        </div>\n\n        <!-- Progress -->\n        <div class=\"mt-4 grid grid-cols-4 gap-1 h-2 rounded-full overflow-hidden bg-gray-100\">\n          <div id=\"bar0\" class=\"h-full rounded-full transition-all\"></div>\n          <div id=\"bar1\" class=\"h-full rounded-full transition-all\"></div>\n          <div id=\"bar2\" class=\"h-full rounded-full transition-all\"></div>\n          <div id=\"bar3\" class=\"h-full rounded-full transition-all\"></div>\n        </div>\n        <div class=\"mt-1 grid grid-cols-4 text-[10px] text-gray-400 font-medium text-center\">\n          <span>🔴 Menstrual</span>\n          <span>🌸 Follicular</span>\n          <span>⚡ Ovulatory</span>\n          <span>🌙 Luteal</span>\n        </div>\n      </div>\n\n      <!-- Update Cycle -->\n      <div class=\"bg-rose-500 rounded-2xl p-4 text-white\">\n        <h3 class=\"text-sm font-bold mb-1\">Period started?</h3>\n        <p class=\"text-xs text-rose-100 mb-3\">Recalculates all phases for the next year.</p>\n        <div class=\"flex gap-2\">\n          <button onclick=\"logToday()\" class=\"flex-1 py-2.5 bg-white text-rose-600 font-bold rounded-xl text-xs active:scale-[0.98]\">\n            🌸 Started Today\n          </button>\n          <button onclick=\"showDatePicker()\" class=\"flex-1 py-2.5 bg-rose-600/60 hover:bg-rose-600 text-white font-semibold rounded-xl text-xs border border-rose-400/30\">\n            📅 Pick Date\n          </button>\n        </div>\n      </div>\n\n      <!-- Current Cycle Phases -->\n      <div class=\"bg-white rounded-2xl border border-gray-100 p-4\">\n        <h3 class=\"text-xs font-bold text-gray-900 uppercase tracking-wider mb-3\">This Cycle</h3>\n        <div id=\"phaseList\" class=\"space-y-2\"></div>\n      </div>\n\n      <!-- Upcoming Cycles -->\n      <div class=\"bg-white rounded-2xl border border-gray-100 p-4\">\n        <h3 class=\"text-xs font-bold text-gray-900 uppercase tracking-wider mb-3\">Upcoming Cycles</h3>\n        <div id=\"upcomingList\" class=\"space-y-1.5\"></div>\n      </div>\n    </div>\n  </main>\n\n  <!-- Date Picker Modal -->\n  <div id=\"dateModal\" class=\"fixed inset-0 z-50 bg-black/40 hidden flex items-center justify-center p-4\">\n    <div class=\"bg-white rounded-2xl max-w-sm w-full p-5 space-y-4\">\n      <div class=\"flex justify-between items-center\">\n        <h3 class=\"font-bold\">Set Cycle Start Date</h3>\n        <button onclick=\"hideDatePicker()\" class=\"text-gray-400 hover:text-gray-600\">✕</button>\n      </div>\n      <div class=\"flex flex-wrap gap-1.5\">\n        <button onclick=\"setModalPreset(0)\"  class=\"px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs\">Today</button>\n        <button onclick=\"setModalPreset(-1)\" class=\"px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs\">Yesterday</button>\n        <button onclick=\"setModalPreset(-2)\" class=\"px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs\">2 days ago</button>\n        <button onclick=\"setModalPreset(-3)\" class=\"px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs\">3 days ago</button>\n      </div>\n      <input type=\"date\" id=\"modalDateInput\" class=\"w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500\">\n      <div class=\"flex gap-2\">\n        <button onclick=\"hideDatePicker()\" class=\"flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs\">Cancel</button>\n        <button onclick=\"submitModal()\" class=\"flex-1 py-2.5 bg-rose-500 text-white font-semibold rounded-xl text-xs\">Save & Sync</button>\n      </div>\n    </div>\n  </div>\n\n  <!-- Settings Modal -->\n  <div id=\"settingsModal\" class=\"fixed inset-0 z-50 bg-black/40 hidden flex items-center justify-center p-4\">\n    <div class=\"bg-white rounded-2xl max-w-sm w-full p-5 space-y-4\">\n      <div class=\"flex justify-between items-center\">\n        <h3 class=\"font-bold\">Settings</h3>\n        <button onclick=\"hideSettings()\" class=\"text-gray-400 hover:text-gray-600\">✕</button>\n      </div>\n      <div class=\"text-xs space-y-3\">\n        <p class=\"text-gray-500\">Cycle data is stored privately in your Google account.</p>\n        <button onclick=\"doReset()\" class=\"w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl text-xs\">\n          Clear Calendar & Reset Data\n        </button>\n      </div>\n    </div>\n  </div>\n\n  <!-- Toast -->\n  <div id=\"toast\" class=\"fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 translate-y-20 opacity-0 transition-all duration-300 pointer-events-none\">\n    <div class=\"bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-medium flex items-center space-x-2\">\n      <span id=\"toastIcon\">🌸</span>\n      <span id=\"toastMsg\" class=\"flex-1\"></span>\n    </div>\n  </div>\n\n  <script>\n    var state = null;\n    var COLORS = {\n      menstrual:  { badge:'bg-red-50 text-red-600',    glow:'glow-red',    bar:'bg-red-500' },\n      follicular: { badge:'bg-pink-50 text-pink-600',  glow:'glow-pink',   bar:'bg-pink-500' },\n      ovulatory:  { badge:'bg-green-50 text-green-600',glow:'glow-green',  bar:'bg-green-500' },\n      luteal:     { badge:'bg-purple-50 text-purple-600',glow:'glow-purple',bar:'bg-purple-500' }\n    };\n\n    // ── Init ──────────────────────────────────────────────────────\n    window.addEventListener('DOMContentLoaded', function() {\n      var d = new Date();\n      document.getElementById('startDateInput').value = fmtLocal(d);\n      document.getElementById('modalDateInput').value = fmtLocal(d);\n      fetchStatus();\n    });\n\n    function fmtLocal(d) {\n      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');\n    }\n\n    function toast(msg, icon) {\n      var t = document.getElementById('toast');\n      document.getElementById('toastMsg').textContent = msg;\n      document.getElementById('toastIcon').textContent = icon || '🌸';\n      t.classList.remove('translate-y-20','opacity-0','pointer-events-none');\n      setTimeout(function(){ t.classList.add('translate-y-20','opacity-0','pointer-events-none'); }, 3500);\n    }\n\n    // ── API calls ────────────────────────────────────────────────\n    function fetchStatus() {\n      google.script.run.withSuccessHandler(onStatus).withFailureHandler(onErr).getCycleStatus();\n    }\n\n    function onStatus(s) {\n      state = s;\n      document.getElementById('loading').classList.add('hidden');\n\n      if (!s || !s.hasActiveCycle) {\n        document.getElementById('startScreen').classList.remove('hidden');\n        document.getElementById('dashboard').classList.add('hidden');\n      } else {\n        document.getElementById('startScreen').classList.add('hidden');\n        document.getElementById('dashboard').classList.remove('hidden');\n        render(s);\n      }\n    }\n\n    function onErr(e) {\n      toast('Error: ' + (e.message || e), '⚠️');\n      document.getElementById('loading').classList.add('hidden');\n      document.getElementById('startScreen').classList.remove('hidden');\n    }\n\n    // ── Render dashboard ─────────────────────────────────────────\n    function render(s) {\n      var ph = s.phase;\n      var c = COLORS[ph.id] || COLORS.menstrual;\n\n      // Hero card\n      var hero = document.getElementById('heroCard');\n      hero.className = 'bg-white rounded-2xl border border-gray-100 p-5 ' + c.glow;\n\n      var badge = document.getElementById('phaseBadge');\n      badge.className = 'inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide mb-1.5 ' + c.badge;\n      document.getElementById('phaseEmoji').textContent = ph.emoji;\n      document.getElementById('phaseName').textContent  = ph.name;\n      document.getElementById('dayTitle').innerHTML = 'Day ' + s.phaseDay + ' <span class=\"text-gray-400 font-normal text-base\">/ ' + ph.days + '</span>';\n      document.getElementById('cycleInfo').textContent = 'Cycle Day ' + s.cycleDay + ' of ' + (s.cycleLen||28) + ' · Cycle #' + s.cycleNumber;\n      document.getElementById('countdown').textContent = s.phaseDaysLeft === 0 ? 'Tomorrow' : 'in ' + s.phaseDaysLeft + ' day' + (s.phaseDaysLeft>1?'s':'');\n\n      // Progress bars\n      var ids = ['menstrual','follicular','ovulatory','luteal'];\n      for (var i=0; i<4; i++) {\n        var bar = document.getElementById('bar'+i);\n        bar.className = 'h-full rounded-full transition-all ' + (i <= s.phaseIdx ? COLORS[ids[i]].bar : 'bg-gray-200');\n      }\n\n      // Phase list\n      var list = document.getElementById('phaseList');\n      list.innerHTML = '';\n      if (s.phases) {\n        for (var j=0; j<s.phases.length; j++) {\n          var p = s.phases[j];\n          var label = p.isCurrent ? '<span class=\"px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white\">Now</span>'\n                    : p.isPast    ? '<span class=\"text-gray-400 text-[10px]\">Done</span>'\n                    :               '<span class=\"text-gray-500 text-[10px]\">Upcoming</span>';\n          var border = p.isCurrent ? 'border-rose-200 bg-rose-50/40' : 'border-gray-100 bg-gray-50/50';\n          var div = document.createElement('div');\n          div.className = 'p-2.5 rounded-xl border ' + border + ' flex items-center justify-between';\n          div.innerHTML = '<div class=\"flex items-center space-x-2\"><span class=\"text-lg\">' + p.emoji + '</span><div><div class=\"text-xs font-bold text-gray-800\">' + p.name + '</div><div class=\"text-[10px] text-gray-500\">' + p.startDate + ' → ' + p.endDate + '</div></div></div>' + label;\n          list.appendChild(div);\n        }\n      }\n\n      // Upcoming cycles\n      var up = document.getElementById('upcomingList');\n      up.innerHTML = '';\n      var next = new Date(s.nextCycleDate + 'T00:00:00');\n      for (var k=1; k<=3; k++) {\n        var cn = s.cycleNumber + k;\n        var ds = next.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });\n        var row = document.createElement('div');\n        row.className = 'flex justify-between p-2 bg-gray-50 rounded-lg text-xs';\n        row.innerHTML = '<span class=\"font-semibold\">Cycle #' + cn + '</span><span class=\"text-gray-500\">' + ds + '</span>';\n        up.appendChild(row);\n        next.setDate(next.getDate() + (s.cycleLen||28));\n      }\n    }\n\n    // ── Actions ──────────────────────────────────────────────────\n    function setPreset(off) {\n      var d = new Date(); d.setDate(d.getDate()+off);\n      document.getElementById('startDateInput').value = fmtLocal(d);\n    }\n\n    function submitStart() {\n      var v = document.getElementById('startDateInput').value;\n      if (!v) { toast('Pick a date first','⚠️'); return; }\n      doLog(v);\n    }\n\n    function logToday() { doLog(fmtLocal(new Date())); }\n\n    function showDatePicker() { document.getElementById('dateModal').classList.remove('hidden'); document.getElementById('modalDateInput').value = fmtLocal(new Date()); }\n    function hideDatePicker() { document.getElementById('dateModal').classList.add('hidden'); }\n    function setModalPreset(off) { var d=new Date(); d.setDate(d.getDate()+off); document.getElementById('modalDateInput').value=fmtLocal(d); }\n    function submitModal() {\n      var v = document.getElementById('modalDateInput').value;\n      if (!v) { toast('Pick a date','⚠️'); return; }\n      hideDatePicker();\n      doLog(v);\n    }\n\n    function doLog(dateStr) {\n      toast('Syncing calendar… this may take a moment.','⏳');\n      google.script.run.withSuccessHandler(function(res) {\n        toast(res.message || 'Done!', '✅');\n        if (res.status) onStatus(res.status); else fetchStatus();\n      }).withFailureHandler(onErr).logCycleStart(dateStr);\n    }\n\n    function showSettings() { document.getElementById('settingsModal').classList.remove('hidden'); }\n    function hideSettings() { document.getElementById('settingsModal').classList.add('hidden'); }\n    function doReset() {\n      if (!confirm('Delete all cycle events from Google Calendar and reset?')) return;\n      hideSettings();\n      toast('Clearing…','⏳');\n      google.script.run.withSuccessHandler(function(res) {\n        toast(res.message,'🗑️');\n        onStatus(res.status);\n      }).withFailureHandler(onErr).resetCycleData();\n    }\n  </script>\n</body>\n</html>\n";
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

/** Delete all CycleSync events (single events and whole series) from the calendar */
function clearAllEvents() {
  var cal = getCal();
  var from = addD(new Date(), -90);
  var to   = addD(new Date(), 420); // ~14 months ahead
  var evts = cal.getEvents(from, to);
  var seen = {};
  var count = 0;
  for (var i=0; i<evts.length; i++) {
    var d = evts[i].getDescription() || '';
    if (d.indexOf(TAG) === -1) continue;
    if (evts[i].isRecurringEvent()) {
      var id = evts[i].getId(); // shared by every occurrence of a series
      if (seen[id]) continue;
      seen[id] = true;
      evts[i].getEventSeries().deleteEventSeries();
    } else {
      evts[i].deleteEvent();
    }
    count++;
  }
  return count;
}

/**
 * Mark every day of NUM_CYCLES cycles starting from startStr with a one-day
 * all-day event titled with just the phase emoji. Each cycle day is a series
 * repeating every CYCLE_LEN days, so a year of days takes CYCLE_LEN calls.
 */
function createEvents(startStr) {
  var cal = getCal();
  cal.setColor(CAL_COLOR);
  var start = parse(startStr);
  var created = 0;
  var cycleDay = 1;

  for (var p = 0; p < PHASES.length; p++) {
    var ph = PHASES[p];
    for (var d = 1; d <= ph.days; d++, cycleDay++) {
      var desc = TAG + '\n' + ph.name + ' (day ' + d + ' of ' + ph.days + ')\n' +
                 ph.desc + '\nCycle day ' + cycleDay + ' of ' + CYCLE_LEN;
      var rec = CalendarApp.newRecurrence().addDailyRule().interval(CYCLE_LEN).times(NUM_CYCLES);

      try {
        cal.createAllDayEventSeries(ph.emoji, addD(start, cycleDay - 1), rec, { description: desc });
        created += NUM_CYCLES;
      } catch(err) {
        Logger.log('Event error: ' + err);
      }
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
    message: 'Calendar updated! ' + created + ' days marked with phase icons for ~1 year.',
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
