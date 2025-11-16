import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timetable, subjects, syllabusRequirements } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  calculateDuration,
  calculateSyllabusProgress,
  predictFinishDate,
  round,
  isValidDateFormat
} from '@/lib/analytics-utils';

/**
 * GET /api/analytics/syllabus/:subjectId
 * Syllabus Progress Analytics
 * 
 * Query params:
 * - semester: Filter by semester (optional)
 * - startDate: Course start date for prediction (optional, defaults to 3 months ago)
 * - totalWeeks: Total weeks available (optional, defaults to 16)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { subjectId: string } }
) {
  try {
    const subjectId = parseInt(params.subjectId);
    
    if (isNaN(subjectId)) {
      return NextResponse.json({
        error: 'Valid subject ID is required',
        code: 'INVALID_SUBJECT_ID'
      }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const semesterFilter = searchParams.get('semester');
    const startDateParam = searchParams.get('startDate');
    const totalWeeksParam = searchParams.get('totalWeeks');

    // Check if subject exists
    const subjectRecord = await db.select()
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (subjectRecord.length === 0) {
      return NextResponse.json({
        error: 'Subject not found',
        code: 'SUBJECT_NOT_FOUND'
      }, { status: 404 });
    }

    const subjectData = subjectRecord[0];

    // Fetch syllabus requirements
    const syllabusRecords = await db.select()
      .from(syllabusRequirements)
      .where(eq(syllabusRequirements.subjectId, subjectId));

    // If semester filter is provided, find matching requirement
    let syllabusReq = semesterFilter
      ? syllabusRecords.find(req => req.semester === semesterFilter)
      : syllabusRecords[0];

    if (!syllabusReq && syllabusRecords.length > 0) {
      syllabusReq = syllabusRecords[0];
    }

    if (!syllabusReq) {
      return NextResponse.json({
        subject: {
          id: subjectData.id,
          name: subjectData.name,
          code: subjectData.code,
          credits: subjectData.credits
        },
        semester: semesterFilter || 'Not specified',
        status: 'no_requirements',
        message: 'No syllabus requirements configured for this subject',
        progress: {
          totalRequired: 0,
          totalCompleted: 0,
          percentage: 0,
          remaining: 0,
          status: 'no_requirements'
        }
      }, { status: 200 });
    }

    // Fetch all timetable entries for this subject
    let query = db.select({
      id: timetable.id,
      subjectId: timetable.subjectId,
      startTime: timetable.startTime,
      endTime: timetable.endTime,
      classType: timetable.classType,
      semester: timetable.semester,
      studentGroup: timetable.studentGroup,
      dayOfWeek: timetable.dayOfWeek,
      createdAt: timetable.createdAt
    })
      .from(timetable)
      .where(eq(timetable.subjectId, subjectId));

    const allEntries = await query;

    // Filter by semester if specified
    const filteredEntries = semesterFilter
      ? allEntries.filter(entry => entry.semester === semesterFilter)
      : allEntries;

    // Calculate completed hours by type
    let completedLecture = 0;
    let completedPractical = 0;
    let completedTutorial = 0;
    const unitsCovered: number[] = [];

    filteredEntries.forEach(entry => {
      const duration = calculateDuration(entry.startTime, entry.endTime);
      
      if (entry.classType === 'lecture') {
        completedLecture += duration;
      } else if (entry.classType === 'practical') {
        completedPractical += duration;
      } else if (entry.classType === 'tutorial') {
        completedTutorial += duration;
      }
    });

    // Calculate progress using utility function
    const progress = calculateSyllabusProgress(
      {
        lecture: completedLecture,
        practical: completedPractical,
        tutorial: completedTutorial
      },
      {
        lecture: syllabusReq.requiredLectureHours,
        practical: syllabusReq.requiredPracticalHours,
        tutorial: syllabusReq.requiredTutorialHours
      }
    );

    // Estimate units (assuming each unit takes equal time)
    const totalUnits = Math.ceil(progress.totalRequired / 10) || 6; // Default 6 units
    const estimatedUnitsCovered = Math.floor((progress.percentage / 100) * totalUnits);
    const unitsRemaining = Math.max(0, totalUnits - estimatedUnitsCovered);

    // Predict finish date
    const defaultStartDate = new Date();
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 3);
    const startDate = startDateParam && isValidDateFormat(startDateParam)
      ? startDateParam
      : defaultStartDate.toISOString().split('T')[0];
    
    const totalWeeks = totalWeeksParam ? parseInt(totalWeeksParam) : syllabusReq.totalWeeks || 16;
    
    const prediction = predictFinishDate(startDate, totalWeeks, progress.percentage);

    // Generate alerts and recommendations
    const alerts: string[] = [];
    const recommendations: string[] = [];

    if (progress.status === 'completed') {
      alerts.push('✅ Syllabus completed! All required hours have been covered.');
    } else if (progress.status === 'ahead') {
      alerts.push(`🚀 Ahead of schedule! You're ${round(progress.percentage - 100)}% ahead.`);
      recommendations.push('Consider adding advanced topics or conducting revision sessions.');
    } else if (progress.status === 'behind') {
      alerts.push(`⚠️ Behind schedule! Only ${round(progress.percentage)}% completed.`);
      recommendations.push('Schedule additional classes or extend lecture duration to catch up.');
      recommendations.push(`Need to cover ${round(progress.remaining)} more hours to complete syllabus.`);
    } else {
      alerts.push(`📊 On track: ${round(progress.percentage)}% completed.`);
    }

    if (prediction.status === 'delayed') {
      alerts.push(`⏰ Projected delay: Course may finish ${prediction.weeksRemaining} weeks later than planned.`);
      recommendations.push('Consider scheduling makeup classes or extra sessions.');
    } else if (prediction.status === 'ahead') {
      alerts.push(`⏰ Early completion expected: ${prediction.weeksRemaining} weeks ahead of schedule.`);
    }

    // Identify lagging class types
    if (progress.breakdown.lecture.percentage < progress.breakdown.practical.percentage - 20) {
      recommendations.push('Lecture hours are lagging. Schedule more theory sessions.');
    }
    if (progress.breakdown.practical.percentage < progress.breakdown.lecture.percentage - 20) {
      recommendations.push('Practical hours are lagging. Increase lab/workshop sessions.');
    }

    // Calculate weekly requirement to finish on time
    const hoursPerWeek = prediction.weeksRemaining > 0
      ? round(progress.remaining / prediction.weeksRemaining)
      : 0;

    if (hoursPerWeek > 5) {
      recommendations.push(`⚡ Need ${hoursPerWeek} hours/week to finish on time. Current pace may be unsustainable.`);
    }

    return NextResponse.json({
      subject: {
        id: subjectData.id,
        name: subjectData.name,
        code: subjectData.code,
        credits: subjectData.credits
      },
      semester: syllabusReq.semester,
      requirements: {
        totalLectureHours: syllabusReq.requiredLectureHours,
        totalPracticalHours: syllabusReq.requiredPracticalHours,
        totalTutorialHours: syllabusReq.requiredTutorialHours,
        totalHours: progress.totalRequired,
        totalWeeks: syllabusReq.totalWeeks
      },
      progress: {
        totalUnits,
        unitsCovered: estimatedUnitsCovered,
        unitsRemaining,
        totalCompleted: progress.totalCompleted,
        totalRequired: progress.totalRequired,
        remaining: progress.remaining,
        completionPercentage: progress.percentage,
        status: progress.status,
        breakdown: progress.breakdown
      },
      prediction: {
        predictedFinishDate: prediction.predictedDate,
        weeksRemaining: prediction.weeksRemaining,
        status: prediction.status,
        requiredHoursPerWeek: hoursPerWeek
      },
      schedule: {
        totalClassesConducted: filteredEntries.length,
        averageClassDuration: filteredEntries.length > 0
          ? round((completedLecture + completedPractical + completedTutorial) / filteredEntries.length)
          : 0
      },
      alerts,
      recommendations
    }, { status: 200 });

  } catch (error) {
    console.error('GET syllabus progress error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}
