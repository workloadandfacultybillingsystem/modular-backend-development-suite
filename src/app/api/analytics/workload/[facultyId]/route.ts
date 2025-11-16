import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timetable, faculty, subjects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  calculateDuration,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  isDayInDateRange,
  round,
  calculateWorkloadPercentage,
  getWorkloadStatus,
  isValidDateFormat,
  isValidPeriod
} from '@/lib/analytics-utils';

/**
 * GET /api/analytics/workload/:facultyId
 * Faculty Workload Summary Analytics
 * 
 * Query params:
 * - period: 'day' | 'week' | 'month' (default: 'week')
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { facultyId: string } }
) {
  try {
    const facultyId = parseInt(params.facultyId);
    
    if (isNaN(facultyId)) {
      return NextResponse.json({
        error: 'Valid faculty ID is required',
        code: 'INVALID_FACULTY_ID'
      }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week';
    
    if (!isValidPeriod(period)) {
      return NextResponse.json({
        error: "Period must be 'day', 'week', or 'month'",
        code: 'INVALID_PERIOD'
      }, { status: 400 });
    }

    // Determine date range
    const currentDate = new Date();
    let startDate: string;
    let endDate: string;

    if (period === 'day') {
      startDate = searchParams.get('startDate') || currentDate.toISOString().split('T')[0];
      endDate = searchParams.get('endDate') || startDate;
    } else if (period === 'week') {
      startDate = searchParams.get('startDate') || getWeekStart(currentDate);
      endDate = searchParams.get('endDate') || getWeekEnd(currentDate);
    } else {
      startDate = searchParams.get('startDate') || getMonthStart(currentDate);
      endDate = searchParams.get('endDate') || getMonthEnd(currentDate);
    }

    // Validate date format
    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
      return NextResponse.json({
        error: 'Dates must be in YYYY-MM-DD format',
        code: 'INVALID_DATE_FORMAT'
      }, { status: 400 });
    }

    // Check if faculty exists
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

    // Fetch all timetable entries for this faculty
    const allEntries = await db.select({
      id: timetable.id,
      facultyId: timetable.facultyId,
      subjectId: timetable.subjectId,
      dayOfWeek: timetable.dayOfWeek,
      startTime: timetable.startTime,
      endTime: timetable.endTime,
      semester: timetable.semester,
      studentGroup: timetable.studentGroup,
      classType: timetable.classType,
      isExtraClass: timetable.isExtraClass,
      isMakeupClass: timetable.isMakeupClass,
      originalClassId: timetable.originalClassId,
      createdAt: timetable.createdAt,
      subjectName: subjects.name,
      subjectCode: subjects.code,
    })
      .from(timetable)
      .leftJoin(subjects, eq(timetable.subjectId, subjects.id))
      .where(eq(timetable.facultyId, facultyId));

    // Filter entries that fall within the date range
    const filteredEntries = allEntries.filter(entry =>
      isDayInDateRange(entry.dayOfWeek, startDate, endDate)
    );

    // Calculate metrics
    let totalLectures = 0;
    let totalPracticals = 0;
    let totalTutorials = 0;
    let completedLectures = 0;
    let remainingLectures = 0;
    let exchangedLectures = 0;
    let cancelledLectures = 0;
    let extraClasses = 0;
    let makeupClasses = 0;
    let totalHours = 0;

    const dailyLoadMap: Record<string, { hours: number; classes: number; breakdown: any[] }> = {};
    const weeklyLoad: Record<string, { hours: number; classes: number }> = {};
    const subjectHoursMap: Record<number, { name: string; code: string; hours: number; classes: number }> = {};

    filteredEntries.forEach(entry => {
      const duration = calculateDuration(entry.startTime, entry.endTime);
      totalHours += duration;

      // Count by class type
      if (entry.classType === 'lecture') {
        totalLectures++;
        completedLectures++;
      } else if (entry.classType === 'practical') {
        totalPracticals++;
      } else if (entry.classType === 'tutorial') {
        totalTutorials++;
      }

      // Count special classes
      if (entry.isExtraClass) extraClasses++;
      if (entry.isMakeupClass) makeupClasses++;

      // Track by subject
      if (!subjectHoursMap[entry.subjectId]) {
        subjectHoursMap[entry.subjectId] = {
          name: entry.subjectName || 'Unknown',
          code: entry.subjectCode || 'N/A',
          hours: 0,
          classes: 0
        };
      }
      subjectHoursMap[entry.subjectId].hours += duration;
      subjectHoursMap[entry.subjectId].classes++;

      // Day-wise breakdown
      if (!dailyLoadMap[entry.dayOfWeek]) {
        dailyLoadMap[entry.dayOfWeek] = {
          hours: 0,
          classes: 0,
          breakdown: []
        };
      }
      dailyLoadMap[entry.dayOfWeek].hours += duration;
      dailyLoadMap[entry.dayOfWeek].classes++;
      dailyLoadMap[entry.dayOfWeek].breakdown.push({
        subject: entry.subjectName,
        code: entry.subjectCode,
        type: entry.classType,
        time: `${entry.startTime} - ${entry.endTime}`,
        duration: round(duration),
        isExtra: entry.isExtraClass,
        isMakeup: entry.isMakeupClass
      });

      // Weekly load (group by week)
      const weekKey = getWeekStart(new Date(entry.createdAt || currentDate));
      if (!weeklyLoad[weekKey]) {
        weeklyLoad[weekKey] = { hours: 0, classes: 0 };
      }
      weeklyLoad[weekKey].hours += duration;
      weeklyLoad[weekKey].classes++;
    });

    // Calculate remaining and exchanged (mock logic - would need actual data)
    remainingLectures = Math.max(0, totalLectures - completedLectures);
    exchangedLectures = 0; // Would need lecture exchange tracking
    cancelledLectures = 0; // Would need cancellation tracking

    // Format day-wise load
    const dayWiseLoad = Object.entries(dailyLoadMap)
      .map(([day, data]) => ({
        day,
        hours: round(data.hours),
        classes: data.classes,
        breakdown: data.breakdown
      }))
      .sort((a, b) => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days.indexOf(a.day) - days.indexOf(b.day);
      });

    // Format weekly load
    const weeklyLoadArray = Object.entries(weeklyLoad)
      .map(([weekStart, data]) => ({
        weekStart,
        hours: round(data.hours),
        classes: data.classes
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    // Subject-wise breakdown
    const subjectBreakdown = Object.values(subjectHoursMap)
      .map(subject => ({
        ...subject,
        hours: round(subject.hours)
      }))
      .sort((a, b) => b.hours - a.hours);

    // Calculate workload percentage and status
    const workloadPercentage = calculateWorkloadPercentage(totalHours);
    const workloadStatus = getWorkloadStatus(totalHours);

    // Generate insights
    const insights: string[] = [];
    
    if (workloadStatus === 'overloaded') {
      insights.push(`⚠️ High workload detected! Faculty is teaching ${round(totalHours)} hours, which exceeds recommended limits. Consider redistributing classes.`);
    } else if (workloadStatus === 'underutilized') {
      insights.push(`📊 Low workload: Only ${round(totalHours)} hours scheduled. Faculty has capacity for additional classes.`);
    } else if (workloadStatus === 'optimal') {
      insights.push(`✅ Optimal workload: ${round(totalHours)} hours is well-balanced and within recommended range.`);
    }

    if (extraClasses > 0) {
      insights.push(`📚 ${extraClasses} extra classes conducted this period, showing strong commitment.`);
    }

    if (makeupClasses > 0) {
      insights.push(`🔄 ${makeupClasses} makeup classes scheduled to compensate for missed sessions.`);
    }

    const busiestDay = dayWiseLoad.reduce((max, day) => day.hours > max.hours ? day : max, { day: 'None', hours: 0, classes: 0, breakdown: [] });
    if (busiestDay.hours > 0) {
      insights.push(`📅 Busiest day: ${busiestDay.day} with ${round(busiestDay.hours)} hours and ${busiestDay.classes} classes.`);
    }

    const totalClasses = totalLectures + totalPracticals + totalTutorials;

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
      summary: {
        totalLecturesAssigned: totalLectures,
        completedLectures,
        remainingLectures,
        exchangedLectures,
        cancelledLectures,
        totalClasses,
        totalHours: round(totalHours),
        workloadPercentage: round(workloadPercentage),
        workloadStatus
      },
      breakdown: {
        lectures: totalLectures,
        practicals: totalPracticals,
        tutorials: totalTutorials,
        extraClasses,
        makeupClasses
      },
      dayWiseLoad,
      weeklyLoad: weeklyLoadArray,
      subjectBreakdown,
      insights
    }, { status: 200 });

  } catch (error) {
    console.error('GET workload error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}
