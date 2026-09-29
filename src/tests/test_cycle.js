const {
  DEFAULT_PHASES,
  formatDateKey,
  parseDateKey,
  addDays,
  diffInDays,
  getTotalCycleLength,
  getCycleStatusForDate,
  generateCycleEvents
} = require('../cycle_logic');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('--- Testing Cycle Calculation Logic (5 / 9 / 4 / 10 day phases) ---');

// Test 1: Phase durations sum to 28
const totalDays = getTotalCycleLength(DEFAULT_PHASES);
assert(totalDays === 28, `Total cycle length is 28 (got ${totalDays})`);
assert(
  DEFAULT_PHASES.map(p => p.defaultDays).join(',') === '5,9,4,10',
  `Phase durations are 5, 9, 4, 10 (got ${DEFAULT_PHASES.map(p => p.defaultDays).join(', ')})`
);

// Test 2: Cycle phase progression (start = 2026-08-01 = Cycle Day 1)
const startDate = '2026-08-01';

// Menstrual: Days 1–5
let s1 = getCycleStatusForDate(startDate, '2026-08-01');
assert(s1.phase.id === 'menstrual' && s1.phaseDay === 1 && s1.cycleDay === 1, 'Aug 1 is Menstrual Day 1 (Cycle Day 1)');

let s5 = getCycleStatusForDate(startDate, '2026-08-05');
assert(s5.phase.id === 'menstrual' && s5.phaseDay === 5 && s5.cycleDay === 5, 'Aug 5 is Menstrual Day 5 (Cycle Day 5)');

// Follicular: Days 6–14
let s6 = getCycleStatusForDate(startDate, '2026-08-06');
assert(s6.phase.id === 'follicular' && s6.phaseDay === 1 && s6.cycleDay === 6, 'Aug 6 is Follicular Day 1 (Cycle Day 6)');

let s14 = getCycleStatusForDate(startDate, '2026-08-14');
assert(s14.phase.id === 'follicular' && s14.phaseDay === 9 && s14.cycleDay === 14, 'Aug 14 is Follicular Day 9 (Cycle Day 14)');

// Ovulatory: Days 15–18
let s15 = getCycleStatusForDate(startDate, '2026-08-15');
assert(s15.phase.id === 'ovulatory' && s15.phaseDay === 1 && s15.cycleDay === 15, 'Aug 15 is Ovulatory Day 1 (Cycle Day 15)');

let s18 = getCycleStatusForDate(startDate, '2026-08-18');
assert(s18.phase.id === 'ovulatory' && s18.phaseDay === 4 && s18.cycleDay === 18, 'Aug 18 is Ovulatory Day 4 (Cycle Day 18)');

// Luteal: Days 19–28
let s19 = getCycleStatusForDate(startDate, '2026-08-19');
assert(s19.phase.id === 'luteal' && s19.phaseDay === 1 && s19.cycleDay === 19, 'Aug 19 is Luteal Day 1 (Cycle Day 19)');

let s28 = getCycleStatusForDate(startDate, '2026-08-28');
assert(s28.phase.id === 'luteal' && s28.phaseDay === 10 && s28.cycleDay === 28, 'Aug 28 is Luteal Day 10 (Cycle Day 28)');

// Day 29: next cycle rolls over
let s29 = getCycleStatusForDate(startDate, '2026-08-29');
assert(s29.phase.id === 'menstrual' && s29.phaseDay === 1 && s29.cycleDay === 1 && s29.cycleIndex === 2, 'Aug 29 is Cycle #2 Menstrual Day 1');

// Test 3: Recalibration — picking a new start date immediately makes that day Menstrual Day 1
let earlyStatus = getCycleStatusForDate('2026-08-24', '2026-08-24');
assert(earlyStatus.phase.id === 'menstrual' && earlyStatus.phaseDay === 1, 'Early reset to Aug 24 makes Aug 24 Menstrual Day 1');

let lateStatus = getCycleStatusForDate('2026-09-02', '2026-09-02');
assert(lateStatus.phase.id === 'menstrual' && lateStatus.phaseDay === 1, 'Late reset to Sep 2 makes Sep 2 Menstrual Day 1');

// Test 4: Event generation for 3 cycles (12 events: 3 cycles * 4 phases)
const events = generateCycleEvents('2026-08-01', 3);
assert(events.length === 12, `Generated 12 phase events across 3 cycles (got ${events.length})`);
assert(events[0].phaseId === 'menstrual' && events[0].startDate === '2026-08-01' && events[0].endDate === '2026-08-06', 'Menstrual event is Aug 1 → Aug 6 (5 days, exclusive end)');
assert(events[1].phaseId === 'follicular' && events[1].startDate === '2026-08-06' && events[1].endDate === '2026-08-15', 'Follicular event is Aug 6 → Aug 15 (9 days)');
assert(events[2].phaseId === 'ovulatory' && events[2].startDate === '2026-08-15' && events[2].endDate === '2026-08-19', 'Ovulatory event is Aug 15 → Aug 19 (4 days)');
assert(events[3].phaseId === 'luteal' && events[3].startDate === '2026-08-19' && events[3].endDate === '2026-08-29', 'Luteal event is Aug 19 → Aug 29 (10 days)');
assert(events[4].cycleNumber === 2 && events[4].phaseId === 'menstrual' && events[4].startDate === '2026-08-29', 'Cycle #2 starts on Aug 29');

// Test 5: Full 1-year projection = 14 cycles * 4 phases = 56 events, contiguous
const yearEvents = generateCycleEvents('2026-08-01', 14);
assert(yearEvents.length === 56, `Full-year projection generates 56 events (got ${yearEvents.length})`);
assert(yearEvents[55].cycleNumber === 14 && yearEvents[55].phaseId === 'luteal', 'Last event is Cycle #14 Luteal Phase');

let contiguous = true;
for (let i = 1; i < yearEvents.length; i++) {
  if (yearEvents[i].startDate !== yearEvents[i - 1].endDate) { contiguous = false; break; }
}
assert(contiguous, 'All 56 events are back-to-back (each phase starts the day the previous one ends)');

const projectedSpanDays = diffInDays(parseDateKey(yearEvents[0].startDate), parseDateKey(yearEvents[55].endDate));
assert(projectedSpanDays === 14 * 28, `Projection spans 14 cycles = ${14 * 28} days (got ${projectedSpanDays})`);

console.log('--- All Tests Completed ---');
