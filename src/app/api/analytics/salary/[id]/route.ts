import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { faculty, timetable, salaryRates, subjects } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

interface TimeSlot {
  startTime: string;
  endTime: string;
  classType: string;
  isExtraClass: boolean;
  isMakeupClass: boolean;
}

interface SalaryBreakdownItem {
  type: string;
  hours?: number;
  rate?: number;
  amount: number;
  classes?: number;
  bonusAmount?: number;
}

interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, any>;
}

function parseTimeToDecimal(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
}

function calculateDuration(startTime: string, endTime: string): number {
  const start = parseTimeToDecimal(startTime);
  const end = parseTimeToDecimal(endTime);
  return end > start ? end - start : 0;
}

function getDefaultDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  
  if (period === 'week') {
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0]
    };
  }
  
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    startDate: firstDay.toISOString().split('T')[0],
    endDate: lastDay.toISOString().split('T')[0]
  };
}

function isDateInRange(dayOfWeek: string, startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const daysMap: Record<string, number> = {
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 0
  };
  
  const targetDay = daysMap[dayOfWeek.toLowerCase()];
  if (targetDay === undefined) return false;
  
  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() === targetDay) {
      return true;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: 'Valid faculty ID is required',
        code: 'INVALID_FACULTY_ID'
      }, { status: 400 });
    }
    
    const facultyId = parseInt(id);
    
    const period = searchParams.get('period') || 'month';
    if (!['week', 'month'].includes(period)) {
      return NextResponse.json({
        error: 'Period must be "week" or "month"',
        code: 'INVALID_PERIOD'
      }, { status: 400 });
    }
    
    const defaultRange = getDefaultDateRange(period);
    const startDate = searchParams.get('startDate') || defaultRange.startDate;
    const endDate = searchParams.get('endDate') || defaultRange.endDate;
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json({
        error: 'Dates must be in YYYY-MM-DD format',
        code: 'INVALID_DATE_FORMAT'
      }, { status: 400 });
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({
        error: 'Start date must be before end date',
        code: 'INVALID_DATE_RANGE'
      }, { status: 400 });
    }
    
    const facultyRecord = await db.select()
      .from(faculty)
      .where(eq(faculty.id, facultyId))
      .limit(1);
    
    if (facultyRecord.length === 0) {
      return NextResponse.json({
        error: 'Faculty not found',
        code: 'FACULTY_NOT_FOUND'
      }, { status: 404 });
    }
    
    const facultyData = facultyRecord[0];
    
    const salaryRatesRecord = await db.select()
      .from(salaryRates)
      .where(eq(salaryRates.facultyId, facultyId))
      .limit(1);
    
    if (salaryRatesRecord.length === 0) {
      return NextResponse.json({
        error: 'Salary rates not configured for this faculty',
        code: 'MISSING_SALARY_RATES'
      }, { status: 400 });
    }
    
    const rates = salaryRatesRecord[0];
    
    const timetableEntries = await db.select()
      .from(timetable)
      .where(eq(timetable.facultyId, facultyId));
    
    const filteredEntries = timetableEntries.filter(entry => 
      isDateInRange(entry.dayOfWeek, startDate, endDate)
    );
    
    let lectureHours = 0;
    let practicalHours = 0;
    let tutorialHours = 0;
    let extraClassCount = 0;
    let makeupClassCount = 0;
    
    let lectureEarnings = 0;
    let practicalEarnings = 0;
    let tutorialEarnings = 0;
    let extraBonus = 0;
    let makeupBonus = 0;
    
    filteredEntries.forEach(entry => {
      const duration = calculateDuration(entry.startTime, entry.endTime);
      
      if (duration <= 0) return;
      
      let baseRate = 0;
      
      if (entry.classType === 'lecture') {
        lectureHours += duration;
        baseRate = rates.lectureRatePerHour;
        lectureEarnings += duration * baseRate;
      } else if (entry.classType === 'practical') {
        practicalHours += duration;
        baseRate = rates.practicalRatePerHour;
        practicalEarnings += duration * baseRate;
      } else if (entry.classType === 'tutorial') {
        tutorialHours += duration;
        baseRate = rates.tutorialRatePerHour;
        tutorialEarnings += duration * baseRate;
      }
      
      if (entry.isExtraClass) {
        extraClassCount++;
        const baseAmount = duration * baseRate;
        const bonusAmount = baseAmount * (rates.extraClassBonus / 100);
        extraBonus += bonusAmount;
      }
      
      if (entry.isMakeupClass) {
        makeupClassCount++;
        const baseAmount = duration * baseRate;
        const bonusAmount = baseAmount * (rates.makeupClassBonus / 100);
        makeupBonus += bonusAmount;
      }
    });
    
    const totalHours = lectureHours + practicalHours + tutorialHours;
    const baseAmount = lectureEarnings + practicalEarnings + tutorialEarnings;
    const totalAmount = baseAmount + extraBonus + makeupBonus;
    const avgPerHour = totalHours > 0 ? totalAmount / totalHours : 0;
    
    const salaryBreakdown: SalaryBreakdownItem[] = [];
    
    if (lectureHours > 0) {
      salaryBreakdown.push({
        type: 'lecture',
        hours: Math.round(lectureHours * 100) / 100,
        rate: rates.lectureRatePerHour,
        amount: Math.round(lectureEarnings * 100) / 100
      });
    }
    
    if (practicalHours > 0) {
      salaryBreakdown.push({
        type: 'practical',
        hours: Math.round(practicalHours * 100) / 100,
        rate: rates.practicalRatePerHour,
        amount: Math.round(practicalEarnings * 100) / 100
      });
    }
    
    if (tutorialHours > 0) {
      salaryBreakdown.push({
        type: 'tutorial',
        hours: Math.round(tutorialHours * 100) / 100,
        rate: rates.tutorialRatePerHour,
        amount: Math.round(tutorialEarnings * 100) / 100
      });
    }
    
    if (extraClassCount > 0) {
      salaryBreakdown.push({
        type: 'extra_bonus',
        classes: extraClassCount,
        bonusAmount: Math.round(extraBonus * 100) / 100,
        amount: Math.round(extraBonus * 100) / 100
      });
    }
    
    if (makeupClassCount > 0) {
      salaryBreakdown.push({
        type: 'makeup_bonus',
        classes: makeupClassCount,
        bonusAmount: Math.round(makeupBonus * 100) / 100,
        amount: Math.round(makeupBonus * 100) / 100
      });
    }
    
    const distribution = [];
    if (baseAmount > 0) {
      if (lectureEarnings > 0) {
        distribution.push({
          type: 'lecture',
          percentage: Math.round((lectureEarnings / totalAmount) * 10000) / 100,
          amount: Math.round(lectureEarnings * 100) / 100
        });
      }
      if (practicalEarnings > 0) {
        distribution.push({
          type: 'practical',
          percentage: Math.round((practicalEarnings / totalAmount) * 10000) / 100,
          amount: Math.round(practicalEarnings * 100) / 100
        });
      }
      if (tutorialEarnings > 0) {
        distribution.push({
          type: 'tutorial',
          percentage: Math.round((tutorialEarnings / totalAmount) * 10000) / 100,
          amount: Math.round(tutorialEarnings * 100) / 100
        });
      }
      if (extraBonus > 0) {
        distribution.push({
          type: 'extra_bonus',
          percentage: Math.round((extraBonus / totalAmount) * 10000) / 100,
          amount: Math.round(extraBonus * 100) / 100
        });
      }
      if (makeupBonus > 0) {
        distribution.push({
          type: 'makeup_bonus',
          percentage: Math.round((makeupBonus / totalAmount) * 10000) / 100,
          amount: Math.round(makeupBonus * 100) / 100
        });
      }
    }
    
    const anomalies: Anomaly[] = [];
    
    if (avgPerHour < 400 && totalHours > 0) {
      anomalies.push({
        type: 'under_payment',
        severity: 'high',
        message: 'Average salary per hour is below minimum threshold (₹400)',
        details: {
          avgPerHour: Math.round(avgPerHour * 100) / 100,
          threshold: 400
        }
      });
    }
    
    if (avgPerHour > 1000 && totalHours > 0) {
      anomalies.push({
        type: 'over_payment',
        severity: 'medium',
        message: 'Average salary per hour exceeds maximum threshold (₹1000)',
        details: {
          avgPerHour: Math.round(avgPerHour * 100) / 100,
          threshold: 1000
        }
      });
    }
    
    const totalBonus = extraBonus + makeupBonus;
    if (baseAmount > 0 && totalBonus > baseAmount * 0.5) {
      anomalies.push({
        type: 'bonus_discrepancy',
        severity: 'medium',
        message: 'Bonus amount exceeds 50% of base salary',
        details: {
          bonusAmount: Math.round(totalBonus * 100) / 100,
          baseAmount: Math.round(baseAmount * 100) / 100,
          bonusPercentage: Math.round((totalBonus / baseAmount) * 10000) / 100
        }
      });
    }
    
    if (totalHours === 0) {
      anomalies.push({
        type: 'no_workload',
        severity: 'low',
        message: 'No classes scheduled for this period',
        details: {
          period,
          startDate,
          endDate
        }
      });
    }
    
    let paymentStatus: 'normal' | 'under_paid' | 'over_paid' | 'excellent' = 'normal';
    
    if (totalHours > 0) {
      if (avgPerHour < 450) {
        paymentStatus = 'under_paid';
      } else if (avgPerHour > 1000) {
        paymentStatus = 'over_paid';
      } else if (avgPerHour > 750) {
        paymentStatus = 'excellent';
      }
    }
    
    return NextResponse.json({
      faculty: {
        id: facultyData.id,
        name: facultyData.name,
        email: facultyData.email,
        department: facultyData.department
      },
      period: {
        type: period,
        startDate,
        endDate
      },
      salaryRates: {
        lecture: rates.lectureRatePerHour,
        practical: rates.practicalRatePerHour,
        tutorial: rates.tutorialRatePerHour,
        extraBonus: rates.extraClassBonus,
        makeupBonus: rates.makeupClassBonus
      },
      workloadSummary: {
        totalHours: Math.round(totalHours * 100) / 100,
        lectureHours: Math.round(lectureHours * 100) / 100,
        practicalHours: Math.round(practicalHours * 100) / 100,
        tutorialHours: Math.round(tutorialHours * 100) / 100,
        extraClasses: extraClassCount,
        makeupClasses: makeupClassCount
      },
      salaryBreakdown,
      summary: {
        baseAmount: Math.round(baseAmount * 100) / 100,
        extraBonus: Math.round(extraBonus * 100) / 100,
        makeupBonus: Math.round(makeupBonus * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        avgPerHour: Math.round(avgPerHour * 100) / 100,
        currency: 'INR'
      },
      distribution,
      anomalies,
      paymentStatus
    }, { status: 200 });
    
  } catch (error) {
    console.error('GET salary breakdown error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}