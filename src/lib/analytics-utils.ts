/**
 * Analytics Utility Functions
 * Shared helpers for workload, salary, syllabus, and attendance calculations
 */

/**
 * Parse time string (HH:MM) to decimal hours
 * @param timeString - Time in format "HH:MM"
 * @returns Decimal hours (e.g., "14:30" => 14.5)
 */
export function parseTimeToDecimal(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + (minutes / 60);
}

/**
 * Calculate duration between two time strings
 * @param startTime - Start time in format "HH:MM"
 * @param endTime - End time in format "HH:MM"
 * @returns Duration in hours
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = parseTimeToDecimal(startTime);
  const end = parseTimeToDecimal(endTime);
  return end > start ? end - start : 0;
}

/**
 * Get week start date (Monday)
 * @param date - Reference date
 * @returns ISO date string (YYYY-MM-DD)
 */
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

/**
 * Get week end date (Sunday)
 * @param date - Reference date
 * @returns ISO date string (YYYY-MM-DD)
 */
export function getWeekEnd(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d.toISOString().split('T')[0];
}

/**
 * Get month start date
 * @param date - Reference date
 * @returns ISO date string (YYYY-MM-DD)
 */
export function getMonthStart(date: Date): string {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

/**
 * Get month end date
 * @param date - Reference date
 * @returns ISO date string (YYYY-MM-DD)
 */
export function getMonthEnd(date: Date): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d.toISOString().split('T')[0];
}

/**
 * Check if a day of week falls within a date range
 * @param dayOfWeek - Day name (e.g., "Monday")
 * @param startDate - Range start (YYYY-MM-DD)
 * @param endDate - Range end (YYYY-MM-DD)
 * @returns True if day occurs in range
 */
export function isDayInDateRange(dayOfWeek: string, startDate: string, endDate: string): boolean {
  const daysMap: Record<string, number> = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6
  };
  
  const targetDay = daysMap[dayOfWeek.toLowerCase()];
  if (targetDay === undefined) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);
  
  while (current <= end) {
    if (current.getDay() === targetDay) {
      return true;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return false;
}

/**
 * Round number to 2 decimal places
 */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate workload percentage based on hours
 * @param actualHours - Actual hours worked
 * @param targetHours - Target hours (default: 20)
 * @returns Workload percentage
 */
export function calculateWorkloadPercentage(actualHours: number, targetHours: number = 20): number {
  if (targetHours === 0) return 0;
  return round((actualHours / targetHours) * 100);
}

/**
 * Determine workload status based on hours
 * @param hours - Total hours worked
 * @returns Status: 'underutilized' | 'optimal' | 'high' | 'overloaded'
 */
export function getWorkloadStatus(hours: number): 'underutilized' | 'optimal' | 'high' | 'overloaded' {
  if (hours < 10) return 'underutilized';
  if (hours <= 20) return 'optimal';
  if (hours <= 30) return 'high';
  return 'overloaded';
}

/**
 * Calculate salary components
 * @param hours - Hours by type
 * @param rates - Rates by type
 * @param bonusRates - Bonus percentages
 * @returns Salary breakdown
 */
export function calculateSalarySlip(
  hours: {
    lecture: number;
    practical: number;
    tutorial: number;
    extra: number;
    makeup: number;
  },
  rates: {
    lectureRatePerHour: number;
    practicalRatePerHour: number;
    tutorialRatePerHour: number;
    extraClassBonus: number;
    makeupClassBonus: number;
  }
) {
  const lectureAmount = hours.lecture * rates.lectureRatePerHour;
  const practicalAmount = hours.practical * rates.practicalRatePerHour;
  const tutorialAmount = hours.tutorial * rates.tutorialRatePerHour;
  const baseAmount = lectureAmount + practicalAmount + tutorialAmount;
  
  const avgRate = (rates.lectureRatePerHour + rates.practicalRatePerHour + rates.tutorialRatePerHour) / 3;
  const extraBonus = (hours.extra * avgRate) * (rates.extraClassBonus / 100);
  const makeupBonus = (hours.makeup * avgRate) * (rates.makeupClassBonus / 100);
  
  const totalAmount = baseAmount + extraBonus + makeupBonus;
  const totalHours = hours.lecture + hours.practical + hours.tutorial;
  const overtimeHours = totalHours > 40 ? totalHours - 40 : 0;
  
  return {
    baseAmount: round(baseAmount),
    lectureAmount: round(lectureAmount),
    practicalAmount: round(practicalAmount),
    tutorialAmount: round(tutorialAmount),
    extraBonus: round(extraBonus),
    makeupBonus: round(makeupBonus),
    totalAmount: round(totalAmount),
    totalHours: round(totalHours),
    overtimeHours: round(overtimeHours),
    avgPerHour: totalHours > 0 ? round(totalAmount / totalHours) : 0,
    currency: 'INR'
  };
}

/**
 * Calculate syllabus progress
 * @param completed - Completed hours by type
 * @param required - Required hours by type
 * @returns Progress details with percentage and status
 */
export function calculateSyllabusProgress(
  completed: { lecture: number; practical: number; tutorial: number },
  required: { lecture: number; practical: number; tutorial: number }
) {
  const totalRequired = required.lecture + required.practical + required.tutorial;
  const totalCompleted = completed.lecture + completed.practical + completed.tutorial;
  
  if (totalRequired === 0) {
    return {
      totalRequired: 0,
      totalCompleted: round(totalCompleted),
      percentage: 0,
      remaining: 0,
      status: 'no_requirements' as const,
      breakdown: {
        lecture: { required: 0, completed: round(completed.lecture), percentage: 0 },
        practical: { required: 0, completed: round(completed.practical), percentage: 0 },
        tutorial: { required: 0, completed: round(completed.tutorial), percentage: 0 },
      }
    };
  }
  
  const percentage = round((totalCompleted / totalRequired) * 100);
  const remaining = round(Math.max(0, totalRequired - totalCompleted));
  
  let status: 'ahead' | 'on_track' | 'behind' | 'completed' = 'on_track';
  if (percentage >= 100) status = 'completed';
  else if (percentage > 110) status = 'ahead';
  else if (percentage < 70) status = 'behind';
  
  const breakdown = {
    lecture: {
      required: required.lecture,
      completed: round(completed.lecture),
      percentage: required.lecture > 0 ? round((completed.lecture / required.lecture) * 100) : 0
    },
    practical: {
      required: required.practical,
      completed: round(completed.practical),
      percentage: required.practical > 0 ? round((completed.practical / required.practical) * 100) : 0
    },
    tutorial: {
      required: required.tutorial,
      completed: round(completed.tutorial),
      percentage: required.tutorial > 0 ? round((completed.tutorial / required.tutorial) * 100) : 0
    }
  };
  
  return {
    totalRequired,
    totalCompleted: round(totalCompleted),
    percentage,
    remaining,
    status,
    breakdown
  };
}

/**
 * Calculate attendance insights
 * @param attendanceData - Array of attendance records
 * @param totalWorkingDays - Total working days in period
 * @returns Attendance metrics and insights
 */
export function calculateAttendanceInsights(
  attendanceData: Array<{ date: string; present: boolean; leaveType?: string }>,
  totalWorkingDays: number
) {
  const presentDays = attendanceData.filter(a => a.present).length;
  const absentDays = attendanceData.filter(a => !a.present).length;
  const attendancePercentage = totalWorkingDays > 0 ? round((presentDays / totalWorkingDays) * 100) : 0;
  
  // Group by leave types
  const leaveBreakdown: Record<string, number> = {};
  attendanceData.forEach(record => {
    if (!record.present && record.leaveType) {
      leaveBreakdown[record.leaveType] = (leaveBreakdown[record.leaveType] || 0) + 1;
    }
  });
  
  // Identify patterns (high absence days)
  const dayOfWeekAbsences: Record<string, number> = {};
  attendanceData.forEach(record => {
    if (!record.present) {
      const date = new Date(record.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      dayOfWeekAbsences[dayName] = (dayOfWeekAbsences[dayName] || 0) + 1;
    }
  });
  
  const highAbsenceDays = Object.entries(dayOfWeekAbsences)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([day, count]) => ({ day, count }));
  
  // Generate AI insights
  const insights: string[] = [];
  
  if (attendancePercentage >= 95) {
    insights.push("Excellent attendance record! Faculty maintains consistent presence.");
  } else if (attendancePercentage >= 85) {
    insights.push("Good attendance. Minor absences noted but within acceptable range.");
  } else if (attendancePercentage >= 75) {
    insights.push("Attendance needs improvement. Consider discussing workload or health concerns.");
  } else {
    insights.push("Critical attendance issue. Immediate intervention recommended.");
  }
  
  if (highAbsenceDays.length > 0 && highAbsenceDays[0].count > 2) {
    insights.push(`Pattern detected: Higher absences on ${highAbsenceDays[0].day}s. Investigate scheduling conflicts.`);
  }
  
  const sickLeaves = leaveBreakdown['sick'] || 0;
  if (sickLeaves > 3) {
    insights.push(`High sick leave count (${sickLeaves} days). Recommend wellness program or workload adjustment.`);
  }
  
  return {
    totalWorkingDays,
    presentDays,
    absentDays,
    attendancePercentage,
    leaveBreakdown,
    highAbsenceDays,
    insights,
    status: attendancePercentage >= 90 ? 'excellent' : attendancePercentage >= 80 ? 'good' : attendancePercentage >= 70 ? 'fair' : 'poor'
  };
}

/**
 * Predict finish date based on current progress
 * @param startDate - Course start date
 * @param totalWeeks - Total weeks available
 * @param completedPercentage - Current completion percentage
 * @returns Predicted finish date and delay information
 */
export function predictFinishDate(
  startDate: string,
  totalWeeks: number,
  completedPercentage: number
): { predictedDate: string; weeksRemaining: number; status: 'on_schedule' | 'ahead' | 'delayed' } {
  const start = new Date(startDate);
  const expectedEnd = new Date(start);
  expectedEnd.setDate(start.getDate() + (totalWeeks * 7));
  
  if (completedPercentage === 0) {
    return {
      predictedDate: expectedEnd.toISOString().split('T')[0],
      weeksRemaining: totalWeeks,
      status: 'on_schedule'
    };
  }
  
  const now = new Date();
  const weeksElapsed = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const expectedProgress = (weeksElapsed / totalWeeks) * 100;
  
  let status: 'on_schedule' | 'ahead' | 'delayed' = 'on_schedule';
  if (completedPercentage > expectedProgress + 10) status = 'ahead';
  else if (completedPercentage < expectedProgress - 10) status = 'delayed';
  
  const projectedTotalWeeks = completedPercentage > 0 ? (weeksElapsed / completedPercentage) * 100 : totalWeeks;
  const predictedEnd = new Date(start);
  predictedEnd.setDate(start.getDate() + (projectedTotalWeeks * 7));
  
  const weeksRemaining = Math.max(0, Math.ceil((predictedEnd.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  
  return {
    predictedDate: predictedEnd.toISOString().split('T')[0],
    weeksRemaining,
    status
  };
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Validate period type
 */
export function isValidPeriod(period: string): period is 'day' | 'week' | 'month' {
  return ['day', 'week', 'month'].includes(period);
}
