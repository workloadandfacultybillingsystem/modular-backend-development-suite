import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timetable, faculty, holidays } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import {
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  calculateAttendanceInsights,
  round
} from '@/lib/analytics-utils';

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
    const period = searchParams.get('period') || 'month';
    
    const currentDate = new Date();
    let startDate: string;
    let endDate: string;

    if (period === 'week') {
      startDate = searchParams.get('startDate') || getWeekStart(currentDate);
      endDate = searchParams.get('endDate') || getWeekEnd(currentDate);
    } else {
      startDate = searchParams.get('startDate') || getMonthStart(currentDate);
      endDate = searchParams.get('endDate') || getMonthEnd(currentDate);
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

    const scheduledClasses = await db.select()
      .from(timetable)
      .where(eq(timetable.facultyId, facultyId));

    const holidayRecords = await db.select()
      .from(holidays)
      .where(and(gte(holidays.date, startDate), lte(holidays.date, endDate)));

    const holidayDates = new Set(holidayRecords.map(h => h.date));

    const start = new Date(startDate);
    const end = new Date(endDate);
    const workingDays: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      
      if (dayOfWeek >= 1 && dayOfWeek <= 6 && !holidayDates.has(dateStr)) {
        workingDays.push(dateStr);
      }
    }

    const totalWorkingDays = workingDays.length;

    // Mock attendance (90% present)
    const attendanceRecords = workingDays.map(date => ({
      date,
      present: Math.random() > 0.1,
      leaveType: Math.random() > 0.9 ? 'sick' : undefined
    }));

    const insights = calculateAttendanceInsights(attendanceRecords, totalWorkingDays);

    const recommendations: string[] = [];
    if (insights.attendancePercentage < 80) {
      recommendations.push('Critical: Schedule meeting to discuss attendance.');
    }

    return NextResponse.json({
      faculty: {
        id: facultyData.id,
        name: facultyData.name,
        email: facultyData.email,
        department: facultyData.department
      },
      period: { type: period, startDate, endDate },
      summary: {
        totalWorkingDays,
        presentDays: insights.presentDays,
        absentDays: insights.absentDays,
        attendancePercentage: insights.attendancePercentage,
        status: insights.status
      },
      leaveRecords: { breakdown: insights.leaveBreakdown },
      patterns: { highAbsenceDays: insights.highAbsenceDays },
      aiInsights: insights.insights,
      recommendations
    }, { status: 200 });

  } catch (error) {
    console.error('GET attendance error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}
