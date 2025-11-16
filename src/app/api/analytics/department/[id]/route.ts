import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { faculty, timetable, salaryRates } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

interface FacultyAnalytics {
  id: number;
  name: string;
  email: string;
  hours: number;
  classes: number;
  salary: number;
  workloadLevel: string;
  utilizationRate: number;
}

interface ClassTypeDistribution {
  type: string;
  count: number;
  hours: number;
  percentage: number;
}

function parseTimeToDecimal(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

function calculateDuration(startTime: string, endTime: string): number {
  const start = parseTimeToDecimal(startTime);
  const end = parseTimeToDecimal(endTime);
  return end - start;
}

function getWorkloadLevel(hours: number): string {
  if (hours > 30) return 'overloaded';
  if (hours >= 20) return 'high';
  if (hours >= 10) return 'medium';
  return 'low';
}

function calculateUtilizationRate(actualHours: number): number {
  const expectedHours = 15;
  return Math.round((actualHours / expectedHours) * 100);
}

function getPeriodDates(period: string, startDate?: string, endDate?: string): { start: string; end: string } {
  const now = new Date();
  
  if (startDate && endDate) {
    return { start: startDate, end: endDate };
  }

  if (period === 'week') {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  }

  // Month
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    start: firstDay.toISOString().split('T')[0],
    end: lastDay.toISOString().split('T')[0]
  };
}

function getDayOfWeekNumber(date: string): number {
  return new Date(date).getDay();
}

function isDateInRange(dayOfWeek: string, startDate: string, endDate: string): boolean {
  const dayMap: { [key: string]: number } = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };
  
  const targetDay = dayMap[dayOfWeek];
  if (targetDay === undefined) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === targetDay) {
      return true;
    }
  }
  
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const departmentName = decodeURIComponent(params.id);
    
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') ?? 'week';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (period !== 'week' && period !== 'month') {
      return NextResponse.json({ 
        error: "Invalid period. Must be 'week' or 'month'",
        code: "INVALID_PERIOD" 
      }, { status: 400 });
    }

    const { start: startDate, end: endDate } = getPeriodDates(period, startDateParam ?? undefined, endDateParam ?? undefined);

    const departmentFaculty = await db.select()
      .from(faculty)
      .where(eq(faculty.department, departmentName));

    if (departmentFaculty.length === 0) {
      return NextResponse.json({ 
        error: 'Department not found or has no faculty',
        code: "DEPARTMENT_NOT_FOUND" 
      }, { status: 404 });
    }

    const facultyIds = departmentFaculty.map(f => f.id);

    const allTimetableEntries = await db.select()
      .from(timetable);

    const filteredTimetableEntries = allTimetableEntries.filter(entry => 
      facultyIds.includes(entry.facultyId) && 
      isDateInRange(entry.dayOfWeek, startDate, endDate)
    );

    const allSalaryRates = await db.select()
      .from(salaryRates);

    const salaryRatesMap = new Map(
      allSalaryRates.map(rate => [rate.facultyId, rate])
    );

    const facultyAnalyticsMap = new Map<number, FacultyAnalytics>();
    
    departmentFaculty.forEach(f => {
      facultyAnalyticsMap.set(f.id, {
        id: f.id,
        name: f.name,
        email: f.email,
        hours: 0,
        classes: 0,
        salary: 0,
        workloadLevel: 'low',
        utilizationRate: 0
      });
    });

    const classTypeStats = {
      lecture: { count: 0, hours: 0 },
      practical: { count: 0, hours: 0 },
      tutorial: { count: 0, hours: 0 }
    };

    filteredTimetableEntries.forEach(entry => {
      const analytics = facultyAnalyticsMap.get(entry.facultyId);
      if (!analytics) return;

      const duration = calculateDuration(entry.startTime, entry.endTime);
      analytics.hours += duration;
      analytics.classes += 1;

      const salaryRate = salaryRatesMap.get(entry.facultyId);
      if (salaryRate) {
        let hourlyRate = 0;
        
        if (entry.classType === 'lecture') {
          hourlyRate = salaryRate.lectureRatePerHour;
          classTypeStats.lecture.count += 1;
          classTypeStats.lecture.hours += duration;
        } else if (entry.classType === 'practical') {
          hourlyRate = salaryRate.practicalRatePerHour;
          classTypeStats.practical.count += 1;
          classTypeStats.practical.hours += duration;
        } else if (entry.classType === 'tutorial') {
          hourlyRate = salaryRate.tutorialRatePerHour;
          classTypeStats.tutorial.count += 1;
          classTypeStats.tutorial.hours += duration;
        }

        let classSalary = hourlyRate * duration;

        if (entry.isExtraClass) {
          classSalary += (classSalary * salaryRate.extraClassBonus) / 100;
        }

        if (entry.isMakeupClass) {
          classSalary += (classSalary * salaryRate.makeupClassBonus) / 100;
        }

        analytics.salary += classSalary;
      }
    });

    facultyAnalyticsMap.forEach((analytics) => {
      analytics.hours = Math.round(analytics.hours * 100) / 100;
      analytics.salary = Math.round(analytics.salary);
      analytics.workloadLevel = getWorkloadLevel(analytics.hours);
      analytics.utilizationRate = calculateUtilizationRate(analytics.hours);
    });

    const facultyList = Array.from(facultyAnalyticsMap.values());

    const totalClasses = facultyList.reduce((sum, f) => sum + f.classes, 0);
    const totalHours = facultyList.reduce((sum, f) => sum + f.hours, 0);
    const totalSalaryBudget = facultyList.reduce((sum, f) => sum + f.salary, 0);
    const avgHoursPerFaculty = facultyList.length > 0 
      ? Math.round((totalHours / facultyList.length) * 100) / 100 
      : 0;

    const classTypeDistribution: ClassTypeDistribution[] = [
      {
        type: 'lecture',
        count: classTypeStats.lecture.count,
        hours: Math.round(classTypeStats.lecture.hours * 100) / 100,
        percentage: totalClasses > 0 
          ? Math.round((classTypeStats.lecture.count / totalClasses) * 100 * 100) / 100 
          : 0
      },
      {
        type: 'practical',
        count: classTypeStats.practical.count,
        hours: Math.round(classTypeStats.practical.hours * 100) / 100,
        percentage: totalClasses > 0 
          ? Math.round((classTypeStats.practical.count / totalClasses) * 100 * 100) / 100 
          : 0
      },
      {
        type: 'tutorial',
        count: classTypeStats.tutorial.count,
        hours: Math.round(classTypeStats.tutorial.hours * 100) / 100,
        percentage: totalClasses > 0 
          ? Math.round((classTypeStats.tutorial.count / totalClasses) * 100 * 100) / 100 
          : 0
      }
    ];

    const topPerformers = facultyList
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
      .map(f => ({ id: f.id, name: f.name, hours: f.hours }));

    const underPerformers = facultyList
      .filter(f => f.hours < 10)
      .sort((a, b) => a.hours - b.hours)
      .slice(0, 5)
      .map(f => ({ id: f.id, name: f.name, hours: f.hours }));

    const totalUtilization = facultyList.reduce((sum, f) => sum + f.utilizationRate, 0);
    const avgUtilization = facultyList.length > 0 
      ? Math.round(totalUtilization / facultyList.length) 
      : 0;
    
    const overloadedCount = facultyList.filter(f => f.utilizationRate > 133).length;
    const underutilizedCount = facultyList.filter(f => f.utilizationRate < 50).length;

    return NextResponse.json({
      department: {
        name: departmentName,
        facultyCount: departmentFaculty.length
      },
      period: {
        type: period,
        startDate,
        endDate
      },
      summary: {
        totalClasses,
        totalHours: Math.round(totalHours * 100) / 100,
        avgHoursPerFaculty,
        totalSalaryBudget
      },
      classTypeDistribution,
      facultyList,
      topPerformers,
      underPerformers,
      utilizationAnalysis: {
        avgUtilization,
        overloadedCount,
        underutilizedCount
      }
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}