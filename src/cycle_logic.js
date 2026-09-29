/**
 * Core Cycle Calculator & Phase Definitions
 *
 * Default 28-day cycle with 4 biologically accurate phases:
 * 1. Menstrual Phase  (Days 1–5)    5 days
 * 2. Follicular Phase (Days 6–14)   9 days
 * 3. Ovulatory Phase  (Days 15–18)  4 days
 * 4. Luteal Phase     (Days 19–28)  10 days
 */

const DEFAULT_PHASES = [
  {
    id: 'menstrual',
    name: 'Menstrual Phase',
    shortName: 'Menstrual',
    emoji: '🔴',
    defaultDays: 5,
    colorHex: '#E53E3E', // Red
    googleColorId: '11', // Tomato in Google Calendar
    summary: 'Rest, reset & self-care',
    description: 'Menstrual Phase (Days 1-5)\n\n• Energy: Low, restorative\n• Focus: Rest, reflection, hydration, gentle movement\n• Nutrition: Warm soups, iron-rich foods, magnesium'
  },
  {
    id: 'follicular',
    name: 'Follicular Phase',
    shortName: 'Follicular',
    emoji: '🌸',
    defaultDays: 9,
    colorHex: '#ED64A6', // Pink
    googleColorId: '4', // Flamingo in Google Calendar
    summary: 'Rising energy, creativity & new ideas',
    description: 'Follicular Phase (Days 6-14)\n\n• Energy: Rising, high stamina\n• Focus: Brainstorming, social activities, challenging workouts\n• Nutrition: Fresh salads, lean proteins, fermented foods'
  },
  {
    id: 'ovulatory',
    name: 'Ovulatory Phase',
    shortName: 'Ovulatory',
    emoji: '⚡',
    defaultDays: 4,
    colorHex: '#38A169', // Emerald/Green
    googleColorId: '10', // Basil / Green in Google Calendar
    summary: 'Peak stamina & fertile window',
    description: 'Ovulatory Phase (Days 15-18)\n\n• Energy: Peak, magnetic\n• Focus: Important presentations, negotiations, high-intensity workouts\n• Nutrition: Antioxidant-rich berries, light grains, leafy greens'
  },
  {
    id: 'luteal',
    name: 'Luteal Phase',
    shortName: 'Luteal',
    emoji: '🌙',
    defaultDays: 10,
    colorHex: '#805AD5', // Purple
    googleColorId: '3', // Grape / Purple in Google Calendar
    summary: 'Winding down, organization & focus',
    description: 'Luteal Phase (Days 19-28)\n\n• Energy: Gradual decrease, detail-oriented\n• Focus: Completing tasks, organizing, yoga, calming routines\n• Nutrition: Complex carbs, root vegetables, dark chocolate'
  }
];

/**
 * Format a Date object to YYYY-MM-DD (local date string)
 */
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD string into a local Date object (at midnight)
 */
function parseDateKey(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Add days to a Date object without mutating original
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate difference in days between two Date objects (date2 - date1)
 */
function diffInDays(date1, date2) {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Compute the total cycle length given phase configurations
 */
function getTotalCycleLength(phaseConfigs = DEFAULT_PHASES) {
  return phaseConfigs.reduce((sum, phase) => sum + (phase.defaultDays || 7), 0);
}

/**
 * Given a cycle start date and a target date, compute:
 * - Current cycle number
 * - Cycle day index (1-based, e.g. 1 to 28)
 * - Current phase
 * - Day inside current phase (1 to 7)
 * - Phase days remaining
 */
function getCycleStatusForDate(cycleStartDate, targetDate = new Date(), phaseConfigs = DEFAULT_PHASES) {
  const start = typeof cycleStartDate === 'string' ? parseDateKey(cycleStartDate) : new Date(cycleStartDate);
  const target = typeof targetDate === 'string' ? parseDateKey(targetDate) : new Date(targetDate);
  
  const totalDays = getTotalCycleLength(phaseConfigs);
  const daysDiff = diffInDays(start, target);
  
  if (daysDiff < 0) {
    return {
      isBeforeStart: true,
      daysUntilStart: Math.abs(daysDiff),
      cycleDay: 0,
      phase: null,
      phaseDay: 0
    };
  }

  // Calculate cycle index and day within cycle (1..totalDays)
  const cycleIndex = Math.floor(daysDiff / totalDays);
  const rawCycleDay = (daysDiff % totalDays) + 1; // 1 to 28

  let accumulatedDays = 0;
  let currentPhase = phaseConfigs[0];
  let phaseDay = 1;
  let phaseDaysRemaining = 0;

  for (const phase of phaseConfigs) {
    const phaseLength = phase.defaultDays || 7;
    if (rawCycleDay > accumulatedDays && rawCycleDay <= accumulatedDays + phaseLength) {
      currentPhase = phase;
      phaseDay = rawCycleDay - accumulatedDays;
      phaseDaysRemaining = phaseLength - phaseDay;
      break;
    }
    accumulatedDays += phaseLength;
  }

  const currentCycleStart = addDays(start, cycleIndex * totalDays);
  const nextCycleStart = addDays(currentCycleStart, totalDays);
  const daysUntilNextCycle = diffInDays(target, nextCycleStart);

  return {
    isBeforeStart: false,
    cycleIndex: cycleIndex + 1,
    cycleDay: rawCycleDay,
    totalCycleLength: totalDays,
    phase: currentPhase,
    phaseDay: phaseDay,
    phaseLength: currentPhase.defaultDays || 7,
    phaseDaysRemaining: phaseDaysRemaining,
    currentCycleStartDate: formatDateKey(currentCycleStart),
    nextCycleStartDate: formatDateKey(nextCycleStart),
    daysUntilNextCycle: daysUntilNextCycle
  };
}

/**
 * Generate calendar events list for N cycles starting from a given date
 * @param {string|Date} startDate - Start date of the cycle
 * @param {number} numCycles - Number of cycles to project (default 14 ≈ 1 year)
 * @param {Array} phaseConfigs - Phase lengths & descriptions
 * @returns {Array} Array of event descriptors
 */
function generateCycleEvents(startDate, numCycles = 14, phaseConfigs = DEFAULT_PHASES) {
  const start = typeof startDate === 'string' ? parseDateKey(startDate) : new Date(startDate);
  const events = [];
  const totalCycleLength = getTotalCycleLength(phaseConfigs);

  let currentStart = new Date(start);

  for (let c = 0; c < numCycles; c++) {
    const cycleNum = c + 1;
    let phaseStart = new Date(currentStart);

    for (let p = 0; p < phaseConfigs.length; p++) {
      const phase = phaseConfigs[p];
      const phaseDays = phase.defaultDays || 7;
      const phaseEnd = addDays(phaseStart, phaseDays); // exclusive end for all-day events

      events.push({
        title: `${phase.emoji} ${phase.name}`,
        phaseId: phase.id,
        phaseName: phase.name,
        phaseShortName: phase.shortName,
        emoji: phase.emoji,
        startDate: formatDateKey(phaseStart),
        endDate: formatDateKey(phaseEnd), // Google Calendar all-day event end is exclusive
        durationDays: phaseDays,
        cycleNumber: cycleNum,
        colorHex: phase.colorHex,
        googleColorId: phase.googleColorId,
        summary: phase.summary,
        description: `${phase.description}\n\nCycle #${cycleNum} • Projected duration: ${phaseDays} days`
      });

      phaseStart = phaseEnd;
    }

    currentStart = addDays(currentStart, totalCycleLength);
  }

  return events;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_PHASES,
    formatDateKey,
    parseDateKey,
    addDays,
    diffInDays,
    getTotalCycleLength,
    getCycleStatusForDate,
    generateCycleEvents
  };
}
