import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timetable, faculty, subjects, salaryRates, syllabusRequirements } from '@/db/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';

interface TimeSlot {
  day: string;
  start: number;
  end: number;
}

function parseTimeToDecimal(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + (minutes / 60);
}

function calculateDuration(startTime: string, endTime: string): number {
  const start = parseTimeToDecimal(startTime);
  const end = parseTimeToDecimal(endTime);
  return end - start;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getWeekEnd(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getMonthStart(date: Date): string {
  const d = new Date(date);
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

function getMonthEnd(date: Date): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().split('T')[0];
}

function checkTimeOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.day !== slot2.day) return false;
  return (slot1.start < slot2.end && slot1.end > slot2.start);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const facultyId = parseInt(params.id);
    
    if (isNaN(facultyId)) {
      return NextResponse.json({ 
        error: "Valid faculty ID is required",
        code: "INVALID_FACULTY_ID" 
      }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week';
    
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json({ 
        error: "Period must be 'day', 'week', or 'month'",
        code: "INVALID_PERIOD" 
      }, { status: 400 });
    }

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

    const timetableEntries = await db.select({
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
      subjectName: subjects.name,
      subjectCode: subjects.code,
    })
      .from(timetable)
      .leftJoin(subjects, eq(timetable.subjectId, subjects.id))
      .where(eq(timetable.facultyId, facultyId));

    const salaryRateRecord = await db.select()
      .from(salaryRates)
      .where(eq(salaryRates.facultyId, facultyId))
      .limit(1);

    const rates = salaryRateRecord.length > 0 ? salaryRateRecord[0] : {
      lectureRatePerHour: 500,
      practicalRatePerHour: 400,
      tutorialRatePerHour: 450,
      extraClassBonus: 20,
      makeupClassBonus: 15,
    };

    let totalHours = 0;
    let lectureHours = 0;
    let practicalHours = 0;
    let tutorialHours = 0;
    let lectureCount = 0;
    let practicalCount = 0;
    let tutorialCount = 0;
    let extraClassCount = 0;
    let makeupClassCount = 0;
    let extraClassHours = 0;
    let makeupClassHours = 0;
    const uniqueSubjects = new Set<number>();
    const dailyBreakdownMap: Record<string, { hours: number; classes: number; breakdown: any[] }> = {};
    const timeSlots: Array<TimeSlot & { id: number }> = [];

    timetableEntries.forEach(entry => {
      const duration = calculateDuration(entry.startTime, entry.endTime);
      totalHours += duration;
      uniqueSubjects.add(entry.subjectId);

      timeSlots.push({
        id: entry.id,
        day: entry.dayOfWeek,
        start: parseTimeToDecimal(entry.startTime),
        end: parseTimeToDecimal(entry.endTime),
      });

      if (entry.classType === 'lecture') {
        lectureHours += duration;
        lectureCount++;
      } else if (entry.classType === 'practical') {
        practicalHours += duration;
        practicalCount++;
      } else if (entry.classType === 'tutorial') {
        tutorialHours += duration;
        tutorialCount++;
      }

      if (entry.isExtraClass) {
        extraClassCount++;
        extraClassHours += duration;
      }

      if (entry.isMakeupClass) {
        makeupClassCount++;
        makeupClassHours += duration;
      }

      if (!dailyBreakdownMap[entry.dayOfWeek]) {
        dailyBreakdownMap[entry.dayOfWeek] = {
          hours: 0,
          classes: 0,
          breakdown: [],
        };
      }

      dailyBreakdownMap[entry.dayOfWeek].hours += duration;
      dailyBreakdownMap[entry.dayOfWeek].classes++;
      dailyBreakdownMap[entry.dayOfWeek].breakdown.push({
        subject: entry.subjectName,
        code: entry.subjectCode,
        type: entry.classType,
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: duration,
        isExtra: entry.isExtraClass,
        isMakeup: entry.isMakeupClass,
      });
    });

    const totalClasses = timetableEntries.length;

    const classTypeDistribution = [
      {
        type: 'lecture',
        hours: Math.round(lectureHours * 100) / 100,
        count: lectureCount,
        percentage: totalHours > 0 ? Math.round((lectureHours / totalHours) * 100) : 0,
      },
      {
        type: 'practical',
        hours: Math.round(practicalHours * 100) / 100,
        count: practicalCount,
        percentage: totalHours > 0 ? Math.round((practicalHours / totalHours) * 100) : 0,
      },
      {
        type: 'tutorial',
        hours: Math.round(tutorialHours * 100) / 100,
        count: tutorialCount,
        percentage: totalHours > 0 ? Math.round((tutorialHours / totalHours) * 100) : 0,
      },
    ];

    const dailyBreakdown = Object.entries(dailyBreakdownMap).map(([day, data]) => ({
      day,
      hours: Math.round(data.hours * 100) / 100,
      classes: data.classes,
      breakdown: data.breakdown,
    })).sort((a, b) => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return days.indexOf(a.day) - days.indexOf(b.day);
    });

    const baseLectureSalary = lectureHours * rates.lectureRatePerHour;
    const basePracticalSalary = practicalHours * rates.practicalRatePerHour;
    const baseTutorialSalary = tutorialHours * rates.tutorialRatePerHour;
    const baseAmount = baseLectureSalary + basePracticalSalary + baseTutorialSalary;

    const extraClassBaseSalary = extraClassHours * (
      (rates.lectureRatePerHour + rates.practicalRatePerHour + rates.tutorialRatePerHour) / 3
    );
    const extraBonus = extraClassBaseSalary * (rates.extraClassBonus / 100);

    const makeupClassBaseSalary = makeupClassHours * (
      (rates.lectureRatePerHour + rates.practicalRatePerHour + rates.tutorialRatePerHour) / 3
    );
    const makeupBonus = makeupClassBaseSalary * (rates.makeupClassBonus / 100);

    const totalAmount = baseAmount + extraBonus + makeupBonus;

    const subjectIds = Array.from(uniqueSubjects);
    const syllabusData = await db.select()
      .from(syllabusRequirements)
      .where(
        or(
          ...subjectIds.map(id => eq(syllabusRequirements.subjectId, id))
        )
      );

    const syllabusProgress = await Promise.all(
      subjectIds.map(async (subjectId) => {
        const subjectRecord = await db.select()
          .from(subjects)
          .where(eq(subjects.id, subjectId))
          .limit(1);

        if (subjectRecord.length === 0) return null;

        const subject = subjectRecord[0];
        const syllabus = syllabusData.find(s => s.subjectId === subjectId);

        if (!syllabus) {
          return {
            subject: subject.name,
            code: subject.code,
            required: 0,
            completed: 0,
            percentage: 0,
            status: 'no_requirements',
          };
        }

        const subjectEntries = timetableEntries.filter(e => e.subjectId === subjectId);
        let completedLecture = 0;
        let completedPractical = 0;
        let completedTutorial = 0;

        subjectEntries.forEach(entry => {
          const duration = calculateDuration(entry.startTime, entry.endTime);
          if (entry.classType === 'lecture') completedLecture += duration;
          else if (entry.classType === 'practical') completedPractical += duration;
          else if (entry.classType === 'tutorial') completedTutorial += duration;
        });

        const totalRequired = syllabus.requiredLectureHours + syllabus.requiredPracticalHours + syllabus.requiredTutorialHours;
        const totalCompleted = completedLecture + completedPractical + completedTutorial;
        const percentage = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;

        let status = 'on_track';
        if (percentage >= 100) status = 'completed';
        else if (percentage < 50) status = 'behind';

        return {
          subject: subject.name,
          code: subject.code,
          required: totalRequired,
          completed: Math.round(totalCompleted * 100) / 100,
          percentage,
          status,
          breakdown: {
            lecture: { required: syllabus.requiredLectureHours, completed: Math.round(completedLecture * 100) / 100 },
            practical: { required: syllabus.requiredPracticalHours, completed: Math.round(completedPractical * 100) / 100 },
            tutorial: { required: syllabus.requiredTutorialHours, completed: Math.round(completedTutorial * 100) / 100 },
          },
        };
      })
    );

    const anomalies: Array<{ type: string; severity: string; message: string; details: any }> = [];

    for (let i = 0; i < timeSlots.length; i++) {
      for (let j = i + 1; j < timeSlots.length; j++) {
        if (checkTimeOverlap(timeSlots[i], timeSlots[j])) {
          anomalies.push({
            type: 'duplicate_time_slot',
            severity: 'high',
            message: 'Overlapping time slots detected',
            details: {
              day: timeSlots[i].day,
              class1Id: timeSlots[i].id,
              class2Id: timeSlots[j].id,
              class1Time: `${Math.floor(timeSlots[i].start)}:${((timeSlots[i].start % 1) * 60).toString().padStart(2, '0')} - ${Math.floor(timeSlots[i].end)}:${((timeSlots[i].end % 1) * 60).toString().padStart(2, '0')}`,
              class2Time: `${Math.floor(timeSlots[j].start)}:${((timeSlots[j].start % 1) * 60).toString().padStart(2, '0')} - ${Math.floor(timeSlots[j].end)}:${((timeSlots[j].end % 1) * 60).toString().padStart(2, '0')}`,
            },
          });
        }
      }
    }

    if (totalHours > 25) {
      anomalies.push({
        type: 'workload_spike',
        severity: 'medium',
        message: 'Workload exceeds recommended hours',
        details: {
          totalHours: Math.round(totalHours * 100) / 100,
          recommendedMax: 25,
          excess: Math.round((totalHours - 25) * 100) / 100,
        },
      });
    }

    const salaryPerHour = totalHours > 0 ? totalAmount / totalHours : 0;
    if (salaryPerHour > 0 && salaryPerHour < 400) {
      anomalies.push({
        type: 'under_payment',
        severity: 'high',
        message: 'Salary per hour below minimum threshold',
        details: {
          currentRate: Math.round(salaryPerHour),
          minimumRate: 400,
          totalHours: Math.round(totalHours * 100) / 100,
          totalSalary: Math.round(totalAmount),
        },
      });
    }

    return NextResponse.json({
      faculty: {
        id: facultyData.id,
        name: facultyData.name,
        email: facultyData.email,
        department: facultyData.department,
      },
      period: {
        type: period,
        startDate,
        endDate,
      },
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalClasses,
        lectures: lectureCount,
        practicals: practicalCount,
        tutorials: tutorialCount,
        extraClasses: extraClassCount,
        makeupClasses: makeupClassCount,
        uniqueSubjects: uniqueSubjects.size,
      },
      classTypeDistribution,
      dailyBreakdown,
      salary: {
        baseAmount: Math.round(baseAmount),
        extraBonus: Math.round(extraBonus),
        makeupBonus: Math.round(makeupBonus),
        totalAmount: Math.round(totalAmount),
        currency: 'INR',
        breakdown: {
          lectureAmount: Math.round(baseLectureSalary),
          practicalAmount: Math.round(basePracticalSalary),
          tutorialAmount: Math.round(baseTutorialSalary),
        },
      },
      syllabusProgress: syllabusProgress.filter(p => p !== null),
      anomalies,
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}