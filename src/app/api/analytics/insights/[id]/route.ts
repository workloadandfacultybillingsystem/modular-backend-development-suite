import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { faculty, timetable, subjects, salaryRates, syllabusRequirements } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

interface InsightItem {
  status: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'error';
}

interface ProgressInsight extends InsightItem {
  subject: string;
}

interface AnomalyInsight {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'error';
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
}

interface InsightsResponse {
  faculty: {
    id: number;
    name: string;
    email: string;
    department: string;
  };
  period: {
    type: string;
    startDate: string;
    endDate: string;
  };
  overallScore: number;
  insights: {
    workload: InsightItem;
    balance: InsightItem;
    schedule: InsightItem;
    progress: ProgressInsight[];
    salary: InsightItem;
    anomalies: AnomalyInsight[];
  };
  recommendations: Recommendation[];
  strengths: string[];
  areasForImprovement: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const facultyId = parseInt(params.id);
    
    if (isNaN(facultyId)) {
      return NextResponse.json(
        { error: 'Valid faculty ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    
    if (period !== 'week' && period !== 'month') {
      return NextResponse.json(
        { error: 'Period must be "week" or "month"', code: 'INVALID_PERIOD' },
        { status: 400 }
      );
    }

    let startDate: string;
    let endDate: string;

    const providedStartDate = searchParams.get('startDate');
    const providedEndDate = searchParams.get('endDate');

    if (providedStartDate && providedEndDate) {
      startDate = providedStartDate;
      endDate = providedEndDate;
    } else {
      const now = new Date();
      if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else {
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diff);
        startDate = monday.toISOString().split('T')[0];
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        endDate = sunday.toISOString().split('T')[0];
      }
    }

    const facultyRecord = await db
      .select()
      .from(faculty)
      .where(eq(faculty.id, facultyId))
      .limit(1);

    if (facultyRecord.length === 0) {
      return NextResponse.json(
        { error: 'Faculty not found', code: 'FACULTY_NOT_FOUND' },
        { status: 404 }
      );
    }

    const facultyData = facultyRecord[0];

    const classes = await db
      .select({
        id: timetable.id,
        subjectId: timetable.subjectId,
        dayOfWeek: timetable.dayOfWeek,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
        classType: timetable.classType,
        isExtraClass: timetable.isExtraClass,
        isMakeupClass: timetable.isMakeupClass,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        semester: timetable.semester,
      })
      .from(timetable)
      .leftJoin(subjects, eq(timetable.subjectId, subjects.id))
      .where(eq(timetable.facultyId, facultyId));

    const salaryRateRecord = await db
      .select()
      .from(salaryRates)
      .where(eq(salaryRates.facultyId, facultyId))
      .limit(1);

    const syllabusData = await db
      .select()
      .from(syllabusRequirements)
      .leftJoin(subjects, eq(syllabusRequirements.subjectId, subjects.id));

    const calculateHours = (start: string, end: string): number => {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return (endMinutes - startMinutes) / 60;
    };

    let totalHours = 0;
    let lectureHours = 0;
    let practicalHours = 0;
    let tutorialHours = 0;
    let extraClassCount = 0;
    let makeupClassCount = 0;
    const uniqueSubjects = new Set<number>();
    const dayCount = new Set<string>();
    const subjectHours: Record<string, { lecture: number; practical: number; tutorial: number }> = {};

    classes.forEach((cls) => {
      const hours = calculateHours(cls.startTime, cls.endTime);
      totalHours += hours;
      
      if (cls.subjectId) uniqueSubjects.add(cls.subjectId);
      dayCount.add(cls.dayOfWeek);

      const subjectKey = `${cls.subjectId}-${cls.semester}`;
      if (!subjectHours[subjectKey]) {
        subjectHours[subjectKey] = { lecture: 0, practical: 0, tutorial: 0 };
      }

      if (cls.classType === 'lecture') {
        lectureHours += hours;
        subjectHours[subjectKey].lecture += hours;
      } else if (cls.classType === 'practical') {
        practicalHours += hours;
        subjectHours[subjectKey].practical += hours;
      } else if (cls.classType === 'tutorial') {
        tutorialHours += hours;
        subjectHours[subjectKey].tutorial += hours;
      }

      if (cls.isExtraClass) extraClassCount++;
      if (cls.isMakeupClass) makeupClassCount++;
    });

    let estimatedSalary = 0;
    if (salaryRateRecord.length > 0) {
      const rates = salaryRateRecord[0];
      let baseSalary = 
        (lectureHours * rates.lectureRatePerHour) +
        (practicalHours * rates.practicalRatePerHour) +
        (tutorialHours * rates.tutorialRatePerHour);

      const extraBonus = (baseSalary * extraClassCount * rates.extraClassBonus) / 100;
      const makeupBonus = (baseSalary * makeupClassCount * rates.makeupClassBonus) / 100;
      
      estimatedSalary = baseSalary + extraBonus + makeupBonus;
    }

    const insights: InsightsResponse['insights'] = {
      workload: { status: 'optimal', message: '', severity: 'info' },
      balance: { status: 'balanced', message: '', severity: 'info' },
      schedule: { status: 'optimal', message: '', severity: 'info' },
      progress: [],
      salary: { status: 'fair', message: '', severity: 'info' },
      anomalies: []
    };

    const recommendations: Recommendation[] = [];
    const strengths: string[] = [];
    const areasForImprovement: string[] = [];

    if (totalHours > 25) {
      insights.workload = {
        status: 'high',
        message: `Your workload is significantly high at ${totalHours.toFixed(1)} hours per ${period}. Consider delegating some classes.`,
        severity: 'warning'
      };
      areasForImprovement.push('High workload requiring attention');
      recommendations.push({
        priority: 'high',
        category: 'workload',
        title: 'Reduce Workload',
        description: `Delegate 2-3 classes to bring workload down to optimal 15-20 hours range.`
      });
    } else if (totalHours < 8) {
      insights.workload = {
        status: 'low',
        message: `Your workload is below average at ${totalHours.toFixed(1)} hours per ${period}. You may have capacity for additional classes.`,
        severity: 'info'
      };
      recommendations.push({
        priority: 'medium',
        category: 'workload',
        title: 'Increase Teaching Load',
        description: 'Consider taking on additional classes to reach optimal 15-20 hours.'
      });
    } else if (totalHours >= 15 && totalHours <= 20) {
      insights.workload = {
        status: 'optimal',
        message: `Your workload is well-balanced at ${totalHours.toFixed(1)} hours per ${period}. Great job maintaining optimal teaching load!`,
        severity: 'success'
      };
      strengths.push('Optimal workload balance');
    } else {
      insights.workload = {
        status: 'moderate',
        message: `Your workload is at ${totalHours.toFixed(1)} hours per ${period}.`,
        severity: 'info'
      };
    }

    if (extraClassCount > 5) {
      insights.workload.message += ` You have ${extraClassCount} extra classes, showing strong commitment. Ensure adequate rest between sessions.`;
      strengths.push('High commitment with extra classes');
      recommendations.push({
        priority: 'medium',
        category: 'wellness',
        title: 'Schedule Rest Periods',
        description: 'Ensure adequate breaks between sessions to prevent burnout.'
      });
    }

    const totalClassHours = lectureHours + practicalHours + tutorialHours;
    if (totalClassHours > 0) {
      const lecturePercent = (lectureHours / totalClassHours) * 100;
      const practicalPercent = (practicalHours / totalClassHours) * 100;
      const tutorialPercent = (tutorialHours / totalClassHours) * 100;

      if (lecturePercent > 70) {
        insights.balance = {
          status: 'imbalanced',
          message: `Your schedule is heavily focused on lectures (${lecturePercent.toFixed(1)}%). Consider adding variety with other class types.`,
          severity: 'warning'
        };
        areasForImprovement.push('Class type distribution needs balance');
        recommendations.push({
          priority: 'medium',
          category: 'balance',
          title: 'Diversify Class Types',
          description: 'Add practical and tutorial sessions to create a more balanced teaching portfolio.'
        });
      } else if (practicalPercent > 70) {
        insights.balance = {
          status: 'imbalanced',
          message: `Your schedule is heavily focused on practicals (${practicalPercent.toFixed(1)}%). Consider adding variety with other class types.`,
          severity: 'warning'
        };
        areasForImprovement.push('Class type distribution needs balance');
      } else if (tutorialPercent > 70) {
        insights.balance = {
          status: 'imbalanced',
          message: `Your schedule is heavily focused on tutorials (${tutorialPercent.toFixed(1)}%). Consider adding variety with other class types.`,
          severity: 'warning'
        };
        areasForImprovement.push('Class type distribution needs balance');
      } else if (lecturePercent >= 20 && lecturePercent <= 40 && 
                 practicalPercent >= 20 && practicalPercent <= 40 && 
                 tutorialPercent >= 20 && tutorialPercent <= 40) {
        insights.balance = {
          status: 'balanced',
          message: 'Your class type distribution is well-balanced across lectures, practicals, and tutorials.',
          severity: 'success'
        };
        strengths.push('Well-balanced class type distribution');
      } else {
        insights.balance = {
          status: 'moderate',
          message: `Class distribution: Lectures ${lecturePercent.toFixed(1)}%, Practicals ${practicalPercent.toFixed(1)}%, Tutorials ${tutorialPercent.toFixed(1)}%.`,
          severity: 'info'
        };
      }
    }

    const daysTeaching = dayCount.size;
    if (daysTeaching > 5) {
      insights.schedule = {
        status: 'distributed',
        message: `You're teaching on ${daysTeaching} days this ${period === 'week' ? 'week' : 'period'}. Consider consolidating to fewer days for better work-life balance.`,
        severity: 'warning'
      };
      areasForImprovement.push('Schedule spread across too many days');
      recommendations.push({
        priority: 'medium',
        category: 'schedule',
        title: 'Consolidate Teaching Days',
        description: 'Reorganize classes to reduce teaching days from 6+ to 4-5 days per week.'
      });
    } else if (daysTeaching <= 3) {
      insights.schedule = {
        status: 'consolidated',
        message: `Your teaching is consolidated to ${daysTeaching} days, which is excellent for focused work.`,
        severity: 'success'
      };
      strengths.push('Consolidated teaching schedule');
    } else {
      insights.schedule = {
        status: 'moderate',
        message: `You're teaching on ${daysTeaching} days, which is a reasonable distribution.`,
        severity: 'info'
      };
    }

    const timeConflicts: Array<{ day: string; time: string }> = [];
    const classesByDay: Record<string, Array<{ start: string; end: string }>> = {};
    
    classes.forEach((cls) => {
      if (!classesByDay[cls.dayOfWeek]) {
        classesByDay[cls.dayOfWeek] = [];
      }
      classesByDay[cls.dayOfWeek].push({ start: cls.startTime, end: cls.endTime });
    });

    Object.entries(classesByDay).forEach(([day, dayClasses]) => {
      dayClasses.sort((a, b) => a.start.localeCompare(b.start));
      
      for (let i = 0; i < dayClasses.length - 1; i++) {
        const current = dayClasses[i];
        const next = dayClasses[i + 1];
        
        if (current.end > next.start) {
          timeConflicts.push({ day, time: current.start });
        }
      }
    });

    if (timeConflicts.length > 0) {
      timeConflicts.forEach((conflict) => {
        insights.anomalies.push({
          type: 'time_conflict',
          message: `Critical: Time conflict detected on ${conflict.day} at ${conflict.time}. Immediate resolution needed.`,
          severity: 'error'
        });
      });
      areasForImprovement.push('Time conflicts requiring immediate attention');
      recommendations.push({
        priority: 'high',
        category: 'schedule',
        title: 'Resolve Time Conflicts',
        description: 'Review and reschedule overlapping classes to eliminate conflicts.'
      });
    }

    syllabusData.forEach((item) => {
      if (!item.syllabus_requirements || !item.subjects) return;

      const req = item.syllabus_requirements;
      const subject = item.subjects;
      const subjectKey = `${req.subjectId}-${req.semester}`;
      const completedHours = subjectHours[subjectKey] || { lecture: 0, practical: 0, tutorial: 0 };

      const totalRequired = req.requiredLectureHours + req.requiredPracticalHours + req.requiredTutorialHours;
      const totalCompleted = completedHours.lecture + completedHours.practical + completedHours.tutorial;
      const progressPercent = (totalCompleted / totalRequired) * 100;

      if (progressPercent < 30) {
        insights.progress.push({
          subject: subject.name,
          status: 'behind',
          message: `Subject ${subject.name} is behind schedule at ${progressPercent.toFixed(1)}% completion. Consider scheduling additional sessions.`,
          severity: 'warning'
        });
        areasForImprovement.push(`${subject.name} behind syllabus schedule`);
        recommendations.push({
          priority: 'high',
          category: 'syllabus',
          title: `Catch Up on ${subject.name}`,
          description: `Schedule 2-3 additional sessions to improve progress from ${progressPercent.toFixed(1)}% to target range.`
        });
      } else if (progressPercent > 90) {
        insights.progress.push({
          subject: subject.name,
          status: 'ahead',
          message: `Excellent progress on ${subject.name} at ${progressPercent.toFixed(1)}% completion. You're ahead of schedule!`,
          severity: 'success'
        });
        strengths.push(`${subject.name} ahead of schedule`);
      } else if (progressPercent >= 70 && progressPercent <= 90) {
        insights.progress.push({
          subject: subject.name,
          status: 'on_track',
          message: `Subject ${subject.name} is on track at ${progressPercent.toFixed(1)}% completion. Keep up the good work!`,
          severity: 'success'
        });
        strengths.push(`${subject.name} on track`);
      } else {
        insights.progress.push({
          subject: subject.name,
          status: 'moderate',
          message: `Subject ${subject.name} is at ${progressPercent.toFixed(1)}% completion.`,
          severity: 'info'
        });
      }
    });

    if (totalHours > 0) {
      const salaryPerHour = estimatedSalary / totalHours;

      if (salaryPerHour < 500) {
        insights.salary = {
          status: 'below_average',
          message: `Your average earning rate is ₹${salaryPerHour.toFixed(0)}/hour. Consider negotiating higher rates for specialized classes.`,
          severity: 'warning'
        };
        areasForImprovement.push('Compensation below market standards');
        recommendations.push({
          priority: 'high',
          category: 'compensation',
          title: 'Request Rate Review',
          description: `Current rate of ₹${salaryPerHour.toFixed(0)}/hour is below recommended standards. Schedule meeting with administration.`
        });
      } else if (salaryPerHour > 700) {
        insights.salary = {
          status: 'excellent',
          message: `Your earning rate of ₹${salaryPerHour.toFixed(0)}/hour is excellent, reflecting high-value contributions.`,
          severity: 'success'
        };
        strengths.push('Competitive compensation rate');
      } else {
        insights.salary = {
          status: 'fair',
          message: `Your earning rate is ₹${salaryPerHour.toFixed(0)}/hour, which is within fair range.`,
          severity: 'info'
        };
      }

      if (salaryRateRecord.length > 0) {
        const rates = salaryRateRecord[0];
        const baseSalary = 
          (lectureHours * rates.lectureRatePerHour) +
          (practicalHours * rates.practicalRatePerHour) +
          (tutorialHours * rates.tutorialRatePerHour);
        
        const bonusEarnings = estimatedSalary - baseSalary;
        const bonusPercent = baseSalary > 0 ? (bonusEarnings / baseSalary) * 100 : 0;

        if (bonusPercent > 20) {
          insights.salary.message += ` Extra classes contribute ${bonusPercent.toFixed(1)}% to your income. Great supplementary earnings!`;
          strengths.push('Strong supplementary income from extra classes');
        }
      }
    }

    let overallScore = 50;
    
    if (insights.workload.status === 'optimal') overallScore += 15;
    else if (insights.workload.status === 'high') overallScore -= 10;
    else if (insights.workload.status === 'low') overallScore -= 5;
    
    if (insights.balance.status === 'balanced') overallScore += 15;
    else if (insights.balance.status === 'imbalanced') overallScore -= 10;
    
    if (insights.schedule.status === 'consolidated') overallScore += 10;
    else if (insights.schedule.status === 'distributed') overallScore -= 5;
    
    const onTrackSubjects = insights.progress.filter(p => p.status === 'on_track' || p.status === 'ahead').length;
    const totalSubjects = insights.progress.length;
    if (totalSubjects > 0) {
      overallScore += (onTrackSubjects / totalSubjects) * 15;
    }
    
    if (insights.salary.status === 'excellent') overallScore += 10;
    else if (insights.salary.status === 'below_average') overallScore -= 10;
    
    if (insights.anomalies.length > 0) {
      overallScore -= insights.anomalies.length * 5;
    }
    
    overallScore = Math.max(0, Math.min(100, overallScore));

    if (strengths.length === 0) {
      strengths.push('Maintaining active teaching schedule');
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        category: 'maintenance',
        title: 'Continue Current Approach',
        description: 'Your teaching metrics show good balance. Maintain current schedule pattern.'
      });
    }

    const response: InsightsResponse = {
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
      overallScore: Math.round(overallScore),
      insights,
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      strengths,
      areasForImprovement
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}