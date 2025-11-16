/**
 * Notification Service
 * 
 * Centralized service for creating and managing notifications across the application.
 * Prevents duplicate notifications and provides helper functions for common notification scenarios.
 */

interface NotificationData {
  title: string;
  message: string;
  notificationType: 'info' | 'warning' | 'conflict' | 'approval_required' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetUserType: 'faculty' | 'admin' | 'all';
  targetUserId?: number;
  referenceType?: 'timetable' | 'holiday' | 'exam_duty' | 'salary' | 'workload' | 'schedule_change';
  referenceId?: number;
  metadata?: Record<string, any>;
}

/**
 * Create a single notification
 */
async function createNotification(data: NotificationData): Promise<void> {
  try {
    const payload = {
      ...data,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    };

    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to create notification:', error);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Create multiple notifications at once
 */
async function createBulkNotifications(notifications: NotificationData[]): Promise<void> {
  try {
    const payload = notifications.map(notif => ({
      ...notif,
      metadata: notif.metadata ? JSON.stringify(notif.metadata) : undefined,
    }));

    const response = await fetch('/api/notifications/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notifications: payload }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to create bulk notifications:', error);
    }
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
  }
}

/**
 * Notify a specific faculty member
 */
export async function notifyFaculty(
  facultyId: number,
  title: string,
  message: string,
  options: {
    notificationType?: NotificationData['notificationType'];
    severity?: NotificationData['severity'];
    referenceType?: NotificationData['referenceType'];
    referenceId?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  await createNotification({
    title,
    message,
    notificationType: options.notificationType || 'info',
    severity: options.severity || 'medium',
    targetUserType: 'faculty',
    targetUserId: facultyId,
    referenceType: options.referenceType,
    referenceId: options.referenceId,
    metadata: options.metadata,
  });
}

/**
 * Notify admin users
 */
export async function notifyAdmin(
  adminId: number | undefined,
  title: string,
  message: string,
  options: {
    notificationType?: NotificationData['notificationType'];
    severity?: NotificationData['severity'];
    referenceType?: NotificationData['referenceType'];
    referenceId?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  await createNotification({
    title,
    message,
    notificationType: options.notificationType || 'info',
    severity: options.severity || 'medium',
    targetUserType: 'admin',
    targetUserId: adminId,
    referenceType: options.referenceType,
    referenceId: options.referenceId,
    metadata: options.metadata,
  });
}

/**
 * Notify all users (broadcast)
 */
export async function notifyAll(
  title: string,
  message: string,
  options: {
    notificationType?: NotificationData['notificationType'];
    severity?: NotificationData['severity'];
    referenceType?: NotificationData['referenceType'];
    referenceId?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  await createNotification({
    title,
    message,
    notificationType: options.notificationType || 'info',
    severity: options.severity || 'low',
    targetUserType: 'all',
    referenceType: options.referenceType,
    referenceId: options.referenceId,
    metadata: options.metadata,
  });
}

/**
 * Notify about a scheduling conflict (soft warning)
 */
export async function notifyOnConflict(
  conflictDetails: {
    type: 'faculty' | 'classroom' | 'student_group';
    facultyId?: number;
    facultyName?: string;
    classroomNumber?: string;
    studentGroup?: string;
    semester?: string;
    day: string;
    existingStartTime: string;
    existingEndTime: string;
    requestedStartTime: string;
    requestedEndTime: string;
  }
): Promise<void> {
  let title = '';
  let message = '';
  
  switch (conflictDetails.type) {
    case 'faculty':
      title = 'Faculty Schedule Conflict';
      message = `${conflictDetails.facultyName} already has a class on ${conflictDetails.day} from ${conflictDetails.existingStartTime} to ${conflictDetails.existingEndTime}`;
      break;
    case 'classroom':
      title = 'Classroom Booking Conflict';
      message = `${conflictDetails.classroomNumber} is already booked on ${conflictDetails.day} from ${conflictDetails.existingStartTime} to ${conflictDetails.existingEndTime}`;
      break;
    case 'student_group':
      title = 'Student Group Schedule Conflict';
      message = `${conflictDetails.studentGroup} in ${conflictDetails.semester} already has a class on ${conflictDetails.day} from ${conflictDetails.existingStartTime} to ${conflictDetails.existingEndTime}`;
      break;
  }

  // Notify admin about conflict
  await notifyAdmin(undefined, title, message, {
    notificationType: 'conflict',
    severity: 'critical',
    referenceType: 'timetable',
    metadata: conflictDetails,
  });

  // Also notify faculty if it's a faculty conflict
  if (conflictDetails.type === 'faculty' && conflictDetails.facultyId) {
    await notifyFaculty(conflictDetails.facultyId, title, message, {
      notificationType: 'conflict',
      severity: 'high',
      referenceType: 'timetable',
      metadata: conflictDetails,
    });
  }
}

/**
 * Notify about a new timetable entry
 */
export async function notifyOnTimetableCreated(
  entryDetails: {
    id: number;
    facultyId: number;
    facultyName: string;
    subjectName: string;
    classroomNumber: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    semester: string;
    studentGroup: string;
  }
): Promise<void> {
  const title = 'New Class Scheduled';
  const message = `${entryDetails.subjectName} scheduled on ${entryDetails.dayOfWeek} at ${entryDetails.startTime} in ${entryDetails.classroomNumber}`;

  // Notify the assigned faculty
  await notifyFaculty(entryDetails.facultyId, title, message, {
    notificationType: 'info',
    severity: 'medium',
    referenceType: 'timetable',
    referenceId: entryDetails.id,
    metadata: entryDetails,
  });
}

/**
 * Notify about holiday added or modified
 */
export async function notifyOnHoliday(
  holidayDetails: {
    id?: number;
    name: string;
    date: string;
    isModified?: boolean;
  }
): Promise<void> {
  const title = holidayDetails.isModified ? 'Holiday Modified' : 'Holiday Announced';
  const message = holidayDetails.isModified
    ? `Holiday schedule updated: ${holidayDetails.name} on ${holidayDetails.date}`
    : `Holiday declared: ${holidayDetails.name} on ${holidayDetails.date}. All classes cancelled.`;

  // Notify all users
  await notifyAll(title, message, {
    notificationType: 'info',
    severity: 'medium',
    referenceType: 'holiday',
    referenceId: holidayDetails.id,
    metadata: holidayDetails,
  });
}

/**
 * Notify about exam duty assignment
 */
export async function notifyOnDutyAssignment(
  dutyDetails: {
    id: number;
    facultyId: number;
    facultyName: string;
    examDate: string;
    examTime: string;
    roomNumber: string;
    examName?: string;
  }
): Promise<void> {
  const title = 'Exam Duty Assigned';
  const message = `You have been assigned invigilation duty on ${dutyDetails.examDate} at ${dutyDetails.examTime} in ${dutyDetails.roomNumber}${dutyDetails.examName ? ` for ${dutyDetails.examName}` : ''}`;

  // Notify the assigned faculty
  await notifyFaculty(dutyDetails.facultyId, title, message, {
    notificationType: 'info',
    severity: 'high',
    referenceType: 'exam_duty',
    referenceId: dutyDetails.id,
    metadata: dutyDetails,
  });
}

/**
 * Notify about salary slip generation
 */
export async function notifyOnSalaryGenerated(
  salaryDetails: {
    id: number;
    facultyId: number;
    month: string;
    year: number;
    amount: number;
  }
): Promise<void> {
  const title = 'Salary Slip Generated';
  const message = `Your salary slip for ${salaryDetails.month} ${salaryDetails.year} is now available. Download from the portal.`;

  // Notify the faculty member
  await notifyFaculty(salaryDetails.facultyId, title, message, {
    notificationType: 'info',
    severity: 'low',
    referenceType: 'salary',
    referenceId: salaryDetails.id,
    metadata: salaryDetails,
  });
}

/**
 * Notify about workload updates or warnings
 */
export async function notifyOnWorkloadUpdate(
  workloadDetails: {
    facultyId: number;
    facultyName: string;
    totalHours: number;
    recommendedHours: number;
    exceeded?: boolean;
  }
): Promise<void> {
  if (workloadDetails.exceeded) {
    const title = 'Workload Exceeds Recommended Hours';
    const message = `${workloadDetails.facultyName}'s teaching hours (${workloadDetails.totalHours} hrs) exceed the recommended limit of ${workloadDetails.recommendedHours} hours per week.`;

    // Notify admin
    await notifyAdmin(undefined, title, message, {
      notificationType: 'warning',
      severity: 'high',
      referenceType: 'workload',
      metadata: workloadDetails,
    });

    // Notify faculty
    await notifyFaculty(workloadDetails.facultyId, 'Workload Alert', `Your teaching hours (${workloadDetails.totalHours} hrs) exceed the recommended ${workloadDetails.recommendedHours} hours per week.`, {
      notificationType: 'warning',
      severity: 'medium',
      referenceType: 'workload',
      metadata: workloadDetails,
    });
  } else {
    const title = 'Workload Updated';
    const message = `Teaching schedule updated: ${workloadDetails.totalHours} hours per week`;

    // Notify faculty
    await notifyFaculty(workloadDetails.facultyId, title, message, {
      notificationType: 'info',
      severity: 'low',
      referenceType: 'workload',
      metadata: workloadDetails,
    });
  }
}

/**
 * Notify about schedule changes affecting faculty
 */
export async function notifyOnScheduleChange(
  changeDetails: {
    id?: number;
    facultyId: number;
    facultyName: string;
    changeType: 'time' | 'room' | 'date' | 'cancellation';
    oldValue: string;
    newValue: string;
    affectedClass: string;
    reason?: string;
  }
): Promise<void> {
  let title = '';
  let message = '';

  switch (changeDetails.changeType) {
    case 'time':
      title = 'Class Time Changed';
      message = `${changeDetails.affectedClass} time changed from ${changeDetails.oldValue} to ${changeDetails.newValue}`;
      break;
    case 'room':
      title = 'Classroom Changed';
      message = `${changeDetails.affectedClass} room changed from ${changeDetails.oldValue} to ${changeDetails.newValue}`;
      break;
    case 'date':
      title = 'Class Date Changed';
      message = `${changeDetails.affectedClass} rescheduled from ${changeDetails.oldValue} to ${changeDetails.newValue}`;
      break;
    case 'cancellation':
      title = 'Class Cancelled';
      message = `${changeDetails.affectedClass} on ${changeDetails.oldValue} has been cancelled${changeDetails.reason ? `: ${changeDetails.reason}` : ''}`;
      break;
  }

  // Notify the affected faculty
  await notifyFaculty(changeDetails.facultyId, title, message, {
    notificationType: changeDetails.changeType === 'cancellation' ? 'warning' : 'info',
    severity: changeDetails.changeType === 'cancellation' ? 'high' : 'medium',
    referenceType: 'schedule_change',
    referenceId: changeDetails.id,
    metadata: changeDetails,
  });
}

/**
 * Notify about lecture exchange request and approval
 */
export async function notifyOnLectureExchange(
  exchangeDetails: {
    requestingFacultyId: number;
    requestingFacultyName: string;
    targetFacultyId: number;
    targetFacultyName: string;
    classDetails: string;
    originalDate: string;
    proposedDate: string;
    status: 'requested' | 'approved' | 'rejected';
    reason?: string;
  }
): Promise<void> {
  if (exchangeDetails.status === 'requested') {
    // Notify target faculty about exchange request
    await notifyFaculty(
      exchangeDetails.targetFacultyId,
      'Lecture Exchange Request',
      `${exchangeDetails.requestingFacultyName} has requested to exchange ${exchangeDetails.classDetails} from ${exchangeDetails.originalDate} to ${exchangeDetails.proposedDate}. Please review and approve.`,
      {
        notificationType: 'approval_required',
        severity: 'medium',
        referenceType: 'schedule_change',
        metadata: exchangeDetails,
      }
    );

    // Notify admin
    await notifyAdmin(
      undefined,
      'Lecture Exchange Pending',
      `${exchangeDetails.requestingFacultyName} requests exchange with ${exchangeDetails.targetFacultyName}`,
      {
        notificationType: 'approval_required',
        severity: 'low',
        referenceType: 'schedule_change',
        metadata: exchangeDetails,
      }
    );
  } else if (exchangeDetails.status === 'approved') {
    // Notify requesting faculty
    await notifyFaculty(
      exchangeDetails.requestingFacultyId,
      'Lecture Exchange Approved',
      `Your lecture exchange request has been approved. ${exchangeDetails.classDetails} rescheduled to ${exchangeDetails.proposedDate}.`,
      {
        notificationType: 'info',
        severity: 'medium',
        referenceType: 'schedule_change',
        metadata: exchangeDetails,
      }
    );
  } else if (exchangeDetails.status === 'rejected') {
    // Notify requesting faculty
    await notifyFaculty(
      exchangeDetails.requestingFacultyId,
      'Lecture Exchange Rejected',
      `Your lecture exchange request has been rejected${exchangeDetails.reason ? `: ${exchangeDetails.reason}` : ''}.`,
      {
        notificationType: 'warning',
        severity: 'low',
        referenceType: 'schedule_change',
        metadata: exchangeDetails,
      }
    );
  }
}

/**
 * System-generated notification (auto-generated by the system)
 */
export async function notifySystem(
  title: string,
  message: string,
  options: {
    targetUserType?: NotificationData['targetUserType'];
    targetUserId?: number;
    severity?: NotificationData['severity'];
    referenceType?: NotificationData['referenceType'];
    referenceId?: number;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  await createNotification({
    title,
    message,
    notificationType: 'system',
    severity: options.severity || 'low',
    targetUserType: options.targetUserType || 'admin',
    targetUserId: options.targetUserId,
    referenceType: options.referenceType,
    referenceId: options.referenceId,
    metadata: options.metadata,
  });
}
