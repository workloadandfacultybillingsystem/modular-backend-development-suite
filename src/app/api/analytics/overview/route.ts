import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timetable, faculty, subjects, classrooms } from '@/db/schema';
import { eq, sql, and, gte, lte, count, countDistinct } from 'drizzle-orm';

// Helper function to parse time string "HH:MM" to decimal hours
function timeToDecimal(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

// Helper function to calculate duration between two times
function calculateDuration(startTime: string, endTime: string): number {
  const start = timeToDecimal(startTime);
  const end = timeToDecimal(endTime);
  return end - start;
}

// Helper function to get week start and end dates
function getWeekDates(date: Date): { start: string; end: string } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(date.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  };
}

// Helper function to get month start and end dates
function getMonthDates(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

// Helper function to get past 4 weeks data
function getPast4Weeks(endDate: Date): Array<{ start: string; end: string }> {
  const weeks = [];
  const current = new Date(endDate);
  
  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(current);
    weekEnd.setDate(current.getDate() - (i * 7));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    
    weeks.unshift({
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    });
  }
  
  return weeks;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const periodType = searchParams.get('period') || 'week';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Validate period type
    if (periodType !== 'week' && periodType !== 'month') {
      return NextResponse.json({
        error: 'Invalid period type. Must be "week" or "month"',
        code: 'INVALID_PERIOD_TYPE'
      }, { status: 400 });
    }

    // Determine date range
    let startDate: string;
    let endDate: string;
    const now = new Date();

    if (startDateParam && endDateParam) {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDateParam) || !dateRegex.test(endDateParam)) {
        return NextResponse.json({
          error: 'Invalid date format. Use YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT'
        }, { status: 400 });
      }
      startDate = startDateParam;
      endDate = endDateParam;
    } else if (periodType === 'week') {
      const dates = getWeekDates(new Date(now));
      startDate = dates.start;
      endDate = dates.end;
    } else {
      const dates = getMonthDates(new Date(now));
      startDate = dates.start;
      endDate = dates.end;
    }

    // Fetch all timetable entries within the period
    const allClasses = await db.select({
      id: timetable.id,
      facultyId: timetable.facultyId,
      subjectId: timetable.subjectId,
      classroomId: timetable.classroomId,
      dayOfWeek: timetable.dayOfWeek,
      startTime: timetable.startTime,
      endTime: timetable.endTime,
      classType: timetable.classType,
      isExtraClass: timetable.isExtraClass,
      isMakeupClass: timetable.isMakeupClass,
      createdAt: timetable.createdAt
    })
    .from(timetable);

    // Fetch all faculty
    const allFaculty = await db.select().from(faculty);

    // Fetch all subjects
    const allSubjects = await db.select().from(subjects);

    // Fetch all classrooms
    const allClassrooms = await db.select().from(classrooms);

    // Calculate durations for each class
    const classesWithDuration = allClasses.map(cls => ({
      ...cls,
      duration: calculateDuration(cls.startTime, cls.endTime)
    }));

    // 1. Calculate system-wide statistics
    const totalClasses = classesWithDuration.length;
    const uniqueFacultyIds = new Set(classesWithDuration.map(c => c.facultyId));
    const uniqueSubjectIds = new Set(classesWithDuration.map(c => c.subjectId));
    const uniqueClassroomIds = new Set(classesWithDuration.map(c => c.classroomId));
    const totalHours = classesWithDuration.reduce((sum, cls) => sum + cls.duration, 0);
    const avgHoursPerFaculty = uniqueFacultyIds.size > 0 ? totalHours / uniqueFacultyIds.size : 0;
    const avgClassesPerFaculty = uniqueFacultyIds.size > 0 ? totalClasses / uniqueFacultyIds.size : 0;

    // 2. Faculty utilization metrics
    const facultyHours = new Map<number, number>();
    classesWithDuration.forEach(cls => {
      const current = facultyHours.get(cls.facultyId) || 0;
      facultyHours.set(cls.facultyId, current + cls.duration);
    });

    const activeFaculty = facultyHours.size;
    const inactiveFaculty = allFaculty.length - activeFaculty;
    const overloadedFaculty = Array.from(facultyHours.values()).filter(h => h > 25).length;
    const underutilizedFaculty = Array.from(facultyHours.values()).filter(h => h < 8).length;
    
    const utilizationPercentages = Array.from(facultyHours.values()).map(h => (h / 15) * 100);
    const avgUtilization = utilizationPercentages.length > 0
      ? utilizationPercentages.reduce((sum, util) => sum + util, 0) / utilizationPercentages.length
      : 0;

    // 3. Department comparison
    const departmentStats = new Map<string, {
      facultyCount: number;
      classes: number;
      hours: number;
    }>();

    allFaculty.forEach(fac => {
      if (!departmentStats.has(fac.department)) {
        departmentStats.set(fac.department, {
          facultyCount: 0,
          classes: 0,
          hours: 0
        });
      }
      const stats = departmentStats.get(fac.department)!;
      stats.facultyCount++;
    });

    classesWithDuration.forEach(cls => {
      const facultyData = allFaculty.find(f => f.id === cls.facultyId);
      if (facultyData) {
        const stats = departmentStats.get(facultyData.department)!;
        stats.classes++;
        stats.hours += cls.duration;
      }
    });

    const departmentComparison = Array.from(departmentStats.entries())
      .map(([department, stats]) => ({
        department,
        facultyCount: stats.facultyCount,
        classes: stats.classes,
        hours: Math.round(stats.hours * 100) / 100,
        avgHours: stats.facultyCount > 0 
          ? Math.round((stats.hours / stats.facultyCount) * 100) / 100 
          : 0
      }))
      .sort((a, b) => b.hours - a.hours);

    // 4. Class type distribution
    const classTypeStats = {
      lecture: { count: 0, hours: 0 },
      practical: { count: 0, hours: 0 },
      tutorial: { count: 0, hours: 0 }
    };

    classesWithDuration.forEach(cls => {
      const type = cls.classType.toLowerCase() as 'lecture' | 'practical' | 'tutorial';
      if (classTypeStats[type]) {
        classTypeStats[type].count++;
        classTypeStats[type].hours += cls.duration;
      }
    });

    const totalClassTypeHours = Object.values(classTypeStats).reduce((sum, stat) => sum + stat.hours, 0);
    const classTypeDistribution = Object.entries(classTypeStats).map(([type, stats]) => ({
      type,
      count: stats.count,
      hours: Math.round(stats.hours * 100) / 100,
      percentage: totalClassTypeHours > 0 
        ? Math.round((stats.hours / totalClassTypeHours) * 10000) / 100 
        : 0
    }));

    // 5. Recent trends (last 4 weeks)
    const past4Weeks = getPast4Weeks(new Date(endDate));
    const weeklyData = past4Weeks.map(week => {
      const weekClasses = classesWithDuration.filter(cls => {
        const classDate = new Date(cls.createdAt).toISOString().split('T')[0];
        return classDate >= week.start && classDate <= week.end;
      });
      
      const weekFacultyIds = new Set(weekClasses.map(c => c.facultyId));
      const weekHours = weekClasses.reduce((sum, cls) => sum + cls.duration, 0);

      return {
        weekStart: week.start,
        weekEnd: week.end,
        classes: weekClasses.length,
        hours: Math.round(weekHours * 100) / 100,
        activeFaculty: weekFacultyIds.size
      };
    });

    // Calculate trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (weeklyData.length >= 2) {
      const firstHalf = weeklyData.slice(0, 2).reduce((sum, w) => sum + w.hours, 0);
      const secondHalf = weeklyData.slice(2).reduce((sum, w) => sum + w.hours, 0);
      const diff = secondHalf - firstHalf;
      if (diff > firstHalf * 0.1) trend = 'increasing';
      else if (diff < -firstHalf * 0.1) trend = 'decreasing';
    }

    // 6. Top statistics
    // Top 5 most taught subjects
    const subjectCounts = new Map<number, number>();
    classesWithDuration.forEach(cls => {
      subjectCounts.set(cls.subjectId, (subjectCounts.get(cls.subjectId) || 0) + 1);
    });

    const topSubjects = Array.from(subjectCounts.entries())
      .map(([subjectId, count]) => {
        const subject = allSubjects.find(s => s.id === subjectId);
        return {
          name: subject?.name || 'Unknown',
          code: subject?.code || 'N/A',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top 5 most used classrooms
    const classroomCounts = new Map<number, number>();
    classesWithDuration.forEach(cls => {
      classroomCounts.set(cls.classroomId, (classroomCounts.get(cls.classroomId) || 0) + 1);
    });

    const topClassrooms = Array.from(classroomCounts.entries())
      .map(([classroomId, count]) => {
        const classroom = allClassrooms.find(c => c.id === classroomId);
        return {
          roomNumber: classroom?.roomNumber || 'Unknown',
          building: classroom?.building || 'N/A',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top 5 busiest days of week
    const dayCounts = new Map<string, number>();
    classesWithDuration.forEach(cls => {
      dayCounts.set(cls.dayOfWeek, (dayCounts.get(cls.dayOfWeek) || 0) + 1);
    });

    const busiestDays = Array.from(dayCounts.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 7. Extra/makeup classes
    const extraClasses = classesWithDuration.filter(cls => cls.isExtraClass).length;
    const makeupClasses = classesWithDuration.filter(cls => cls.isMakeupClass).length;
    const specialClassesTotal = extraClasses + makeupClasses;
    const percentageOfTotal = totalClasses > 0 
      ? Math.round((specialClassesTotal / totalClasses) * 10000) / 100 
      : 0;

    // Construct response
    const response = {
      period: {
        type: periodType,
        startDate,
        endDate
      },
      summary: {
        totalClasses,
        totalFaculty: uniqueFacultyIds.size,
        totalSubjects: uniqueSubjectIds.size,
        totalClassrooms: uniqueClassroomIds.size,
        totalHours: Math.round(totalHours * 100) / 100,
        avgHoursPerFaculty: Math.round(avgHoursPerFaculty * 100) / 100,
        avgClassesPerFaculty: Math.round(avgClassesPerFaculty * 100) / 100
      },
      facultyUtilization: {
        active: activeFaculty,
        inactive: inactiveFaculty,
        overloaded: overloadedFaculty,
        underutilized: underutilizedFaculty,
        avgUtilization: Math.round(avgUtilization * 100) / 100
      },
      departmentComparison,
      classTypeDistribution,
      recentTrends: {
        weeks: weeklyData,
        trend
      },
      topStatistics: {
        subjects: topSubjects,
        classrooms: topClassrooms,
        busiestDays
      },
      specialClasses: {
        extraClasses,
        makeupClasses,
        percentageOfTotal
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}