# Notification & Alerts System Documentation

## Overview

A complete, production-ready notification system for the Faculty Timetable Management System. This system provides real-time alerts for schedule conflicts, timetable changes, exam duties, holidays, salary notifications, and more.

## Features

### 1. **Notification Types**
- **Info**: General information and updates
- **Warning**: Important notices requiring attention
- **Conflict**: Scheduling conflicts and double-bookings
- **Approval Required**: Requests pending approval
- **System**: Auto-generated system notifications

### 2. **Severity Levels**
- **Low**: Non-urgent information
- **Medium**: Standard priority notifications
- **High**: Important notifications requiring prompt attention
- **Critical**: Urgent issues requiring immediate action

### 3. **Target User Types**
- **Faculty**: Notifications for specific faculty members
- **Admin**: Notifications for administrators
- **All**: Broadcast notifications for all users

## Architecture

### Database Schema

```typescript
notifications {
  id: integer (primary key)
  title: text (required)
  message: text (required)
  notificationType: 'info' | 'warning' | 'conflict' | 'approval_required' | 'system'
  severity: 'low' | 'medium' | 'high' | 'critical'
  targetUserType: 'faculty' | 'admin' | 'all'
  targetUserId: integer (nullable)
  referenceType: 'timetable' | 'holiday' | 'exam_duty' | 'salary' | 'workload' | 'schedule_change'
  referenceId: integer (nullable)
  metadata: text (JSON, nullable)
  isRead: boolean (default: false)
  isSent: boolean (default: true)
  sentAt: timestamp
  readAt: timestamp (nullable)
  createdAt: timestamp
}
```

### API Endpoints

#### 1. **GET /api/notifications**
Fetch notifications with filtering and pagination.

**Query Parameters:**
- `targetUserType`: Filter by user type (faculty/admin/all)
- `targetUserId`: Filter by specific user ID
- `isRead`: Filter by read status (true/false)
- `notificationType`: Filter by notification type
- `severity`: Filter by severity level
- `limit`: Maximum number of results (default: 50, max: 500)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
[
  {
    "id": 1,
    "title": "Faculty Schedule Conflict",
    "message": "Dr. John Smith already has a class on Monday from 10:00 to 11:00",
    "notificationType": "conflict",
    "severity": "critical",
    "targetUserType": "admin",
    "targetUserId": null,
    "referenceType": "timetable",
    "referenceId": 5,
    "metadata": "{\"type\":\"faculty\",\"facultyName\":\"Dr. John Smith\"}",
    "isRead": false,
    "sentAt": "2024-01-20T10:30:00.000Z",
    "readAt": null,
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
]
```

#### 2. **POST /api/notifications**
Create a new notification.

**Request Body:**
```json
{
  "title": "New Class Scheduled",
  "message": "Data Structures class scheduled on Monday at 10:00 AM",
  "notificationType": "info",
  "severity": "medium",
  "targetUserType": "faculty",
  "targetUserId": 1,
  "referenceType": "timetable",
  "referenceId": 10,
  "metadata": "{\"day\":\"Monday\",\"time\":\"10:00\"}"
}
```

#### 3. **PUT /api/notifications?id={id}**
Mark a notification as read.

**Response:**
```json
{
  "id": 1,
  "isRead": true,
  "readAt": "2024-01-20T11:00:00.000Z",
  ...
}
```

#### 4. **DELETE /api/notifications?id={id}**
Delete a notification.

#### 5. **POST /api/notifications/bulk**
Create multiple notifications at once.

**Request Body:**
```json
{
  "notifications": [
    {
      "title": "Holiday Announcement",
      "message": "Republic Day holiday on January 26",
      "notificationType": "info",
      "severity": "medium",
      "targetUserType": "all"
    },
    // ... more notifications
  ]
}
```

#### 6. **PUT /api/notifications/mark-all-read**
Mark all notifications as read for a user.

**Request Body:**
```json
{
  "targetUserType": "faculty",
  "targetUserId": 1
}
```

#### 7. **GET /api/notifications/unread-count**
Get count of unread notifications.

**Query Parameters:**
- `targetUserType`: Filter by user type
- `targetUserId`: Filter by user ID

**Response:**
```json
{
  "count": 5,
  "filters": {
    "targetUserType": "faculty",
    "targetUserId": 1
  }
}
```

## Notification Service

The notification service provides helper functions for creating notifications throughout the application.

### Helper Functions

#### 1. **notifyFaculty()**
Send notification to a specific faculty member.

```typescript
import { notifyFaculty } from '@/lib/notification-service';

await notifyFaculty(
  facultyId: 1,
  "New Class Scheduled",
  "Your Data Structures class is scheduled for Monday at 10:00 AM",
  {
    notificationType: 'info',
    severity: 'medium',
    referenceType: 'timetable',
    referenceId: 10,
    metadata: { day: 'Monday', time: '10:00' }
  }
);
```

#### 2. **notifyAdmin()**
Send notification to admin users.

```typescript
import { notifyAdmin } from '@/lib/notification-service';

await notifyAdmin(
  adminId: 1, // or undefined for all admins
  "Workload Exceeds Limit",
  "Dr. Smith's teaching hours exceed recommended limit",
  {
    notificationType: 'warning',
    severity: 'high',
    referenceType: 'workload'
  }
);
```

#### 3. **notifyAll()**
Broadcast notification to all users.

```typescript
import { notifyAll } from '@/lib/notification-service';

await notifyAll(
  "System Maintenance",
  "Scheduled maintenance on Saturday from 11 PM to 2 AM",
  {
    notificationType: 'info',
    severity: 'medium'
  }
);
```

#### 4. **notifyOnConflict()**
Auto-send notifications when scheduling conflicts are detected.

```typescript
import { notifyOnConflict } from '@/lib/notification-service';

await notifyOnConflict({
  type: 'faculty',
  facultyId: 1,
  facultyName: 'Dr. John Smith',
  day: 'Monday',
  existingStartTime: '10:00',
  existingEndTime: '11:00',
  requestedStartTime: '10:30',
  requestedEndTime: '11:30'
});
```

#### 5. **notifyOnTimetableCreated()**
Notify when a new timetable entry is created.

```typescript
import { notifyOnTimetableCreated } from '@/lib/notification-service';

await notifyOnTimetableCreated({
  id: 10,
  facultyId: 1,
  facultyName: 'Dr. John Smith',
  subjectName: 'Data Structures',
  classroomNumber: 'A-201',
  dayOfWeek: 'Monday',
  startTime: '10:00',
  endTime: '11:00',
  semester: 'Fall 2024',
  studentGroup: 'CS-3A'
});
```

#### 6. **notifyOnHoliday()**
Notify about holidays.

```typescript
import { notifyOnHoliday } from '@/lib/notification-service';

await notifyOnHoliday({
  id: 5,
  name: 'Republic Day',
  date: '2024-01-26',
  isModified: false
});
```

#### 7. **notifyOnDutyAssignment()**
Notify about exam duty assignments.

```typescript
import { notifyOnDutyAssignment } from '@/lib/notification-service';

await notifyOnDutyAssignment({
  id: 15,
  facultyId: 1,
  facultyName: 'Dr. John Smith',
  examDate: '2024-01-28',
  examTime: '10:00 AM',
  roomNumber: 'A-301',
  examName: 'Mid-term Examination'
});
```

#### 8. **notifyOnSalaryGenerated()**
Notify when salary slips are generated.

```typescript
import { notifyOnSalaryGenerated } from '@/lib/notification-service';

await notifyOnSalaryGenerated({
  id: 20,
  facultyId: 1,
  month: 'January',
  year: 2024,
  amount: 50000
});
```

#### 9. **notifyOnWorkloadUpdate()**
Notify about workload updates or warnings.

```typescript
import { notifyOnWorkloadUpdate } from '@/lib/notification-service';

await notifyOnWorkloadUpdate({
  facultyId: 1,
  facultyName: 'Dr. John Smith',
  totalHours: 25,
  recommendedHours: 20,
  exceeded: true
});
```

#### 10. **notifyOnScheduleChange()**
Notify about schedule changes.

```typescript
import { notifyOnScheduleChange } from '@/lib/notification-service';

await notifyOnScheduleChange({
  id: 10,
  facultyId: 1,
  facultyName: 'Dr. John Smith',
  changeType: 'time',
  oldValue: '10:00 AM',
  newValue: '2:00 PM',
  affectedClass: 'Data Structures',
  reason: 'Room availability conflict'
});
```

#### 11. **notifyOnLectureExchange()**
Handle lecture exchange requests and approvals.

```typescript
import { notifyOnLectureExchange } from '@/lib/notification-service';

// Request
await notifyOnLectureExchange({
  requestingFacultyId: 1,
  requestingFacultyName: 'Dr. John Smith',
  targetFacultyId: 2,
  targetFacultyName: 'Dr. Jane Doe',
  classDetails: 'Data Structures - Monday 10:00 AM',
  originalDate: '2024-01-22',
  proposedDate: '2024-01-24',
  status: 'requested'
});

// Approval
await notifyOnLectureExchange({
  requestingFacultyId: 1,
  requestingFacultyName: 'Dr. John Smith',
  targetFacultyId: 2,
  targetFacultyName: 'Dr. Jane Doe',
  classDetails: 'Data Structures - Monday 10:00 AM',
  originalDate: '2024-01-22',
  proposedDate: '2024-01-24',
  status: 'approved'
});
```

## UI Components

### 1. **NotificationBell**
A bell icon with unread count badge that opens a popover with recent notifications.

**Usage:**
```tsx
import { NotificationBell } from '@/components/notifications/notification-bell';

<NotificationBell />
```

**Features:**
- Real-time unread count badge
- Auto-refreshes every 30 seconds
- Popover dropdown with recent notifications
- Compact design for headers/navbars

### 2. **NotificationList**
Scrollable list of notifications with inline actions.

**Usage:**
```tsx
import { NotificationList } from '@/components/notifications/notification-list';

<NotificationList onUpdate={() => console.log('Updated')} />
```

**Features:**
- Mark individual notifications as read
- Mark all as read
- Color-coded icons and severity badges
- Time-relative timestamps (e.g., "2 hours ago")
- Link to full notifications page

### 3. **Notifications Page**
Full-page view with filtering, sorting, and management.

**Route:** `/notifications`

**Features:**
- Filter by read/unread status
- Filter by notification type
- Filter by severity level
- Stats dashboard (total, unread, critical, conflicts)
- Delete notifications
- Responsive design

## Integration Examples

### Timetable Creation Hook

```typescript
// In your timetable API route
import { notifyOnTimetableCreated } from '@/lib/notification-service';

// After successfully creating a timetable entry
await notifyOnTimetableCreated({
  id: newEntry.id,
  facultyId: facultyData.id,
  facultyName: facultyData.name,
  subjectName: subjectData.name,
  classroomNumber: classroomData.roomNumber,
  dayOfWeek: 'Monday',
  startTime: '10:00',
  endTime: '11:00',
  semester: 'Fall 2024',
  studentGroup: 'CS-3A'
});
```

### Conflict Detection Hook

```typescript
// In your timetable validation logic
import { notifyOnConflict } from '@/lib/notification-service';

if (hasConflict) {
  await notifyOnConflict({
    type: 'faculty',
    facultyId: conflictingFaculty.id,
    facultyName: conflictingFaculty.name,
    day: 'Monday',
    existingStartTime: '10:00',
    existingEndTime: '11:00',
    requestedStartTime: '10:30',
    requestedEndTime: '11:30'
  });
  
  // Block the operation
  return error;
}
```

## Best Practices

### 1. **Avoid Duplicate Notifications**
The system automatically prevents duplicate notifications by checking recent entries. Always use the provided helper functions.

### 2. **Use Appropriate Severity Levels**
- **Low**: General info, non-urgent updates
- **Medium**: Standard notifications requiring attention
- **High**: Important issues affecting operations
- **Critical**: Urgent conflicts or errors requiring immediate action

### 3. **Include Metadata**
Always include relevant metadata for context and debugging:

```typescript
metadata: {
  facultyId: 1,
  facultyName: 'Dr. John Smith',
  day: 'Monday',
  time: '10:00',
  conflictType: 'faculty'
}
```

### 4. **Handle Errors Gracefully**
Notification failures should not break the main operation:

```typescript
try {
  await notifyFaculty(facultyId, title, message);
} catch (error) {
  console.error('Failed to send notification:', error);
  // Continue with main operation
}
```

### 5. **Clean Up Old Notifications**
Implement a cleanup job to archive or delete old read notifications:

```typescript
// Example cleanup function (run as cron job)
async function cleanupOldNotifications() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await db.delete(notifications)
    .where(
      and(
        eq(notifications.isRead, true),
        lt(notifications.readAt, thirtyDaysAgo.toISOString())
      )
    );
}
```

## Testing

### Test Notification Creation

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test notification",
    "notificationType": "info",
    "severity": "low",
    "targetUserType": "all"
  }'
```

### Test Bulk Creation

```bash
curl -X POST http://localhost:3000/api/notifications/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "notifications": [
      {
        "title": "Test 1",
        "message": "Message 1",
        "notificationType": "info",
        "severity": "low",
        "targetUserType": "all"
      },
      {
        "title": "Test 2",
        "message": "Message 2",
        "notificationType": "warning",
        "severity": "medium",
        "targetUserType": "admin"
      }
    ]
  }'
```

### Test Filtering

```bash
# Get unread notifications for faculty
curl "http://localhost:3000/api/notifications?targetUserType=faculty&isRead=false"

# Get critical notifications
curl "http://localhost:3000/api/notifications?severity=critical"

# Get conflict notifications
curl "http://localhost:3000/api/notifications?notificationType=conflict"
```

## Database Management

You can manage your notifications database through the **Database Studio** tab located at the top right of the page, next to the "Analytics" tab.

## Future Enhancements

1. **Email Notifications**: Send email notifications for critical alerts
2. **Push Notifications**: Browser push notifications for real-time updates
3. **SMS Notifications**: SMS alerts for urgent notifications
4. **Notification Preferences**: User-configurable notification settings
5. **Notification History**: Archive and search old notifications
6. **Notification Templates**: Reusable templates for common notifications
7. **Notification Analytics**: Track notification engagement and effectiveness

## Troubleshooting

### Notifications Not Appearing

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check database connection
4. Ensure notification service is properly imported

### Unread Count Not Updating

1. Verify polling interval (default: 30 seconds)
2. Check network tab for failed API calls
3. Clear browser cache and reload

### Duplicate Notifications

1. Ensure you're using the provided helper functions
2. Check for multiple event listeners
3. Review your integration code for duplicate calls

## Support

For issues or questions about the notification system, please:
1. Check this documentation
2. Review the API endpoint responses
3. Check the browser console for errors
4. Review the notification service source code in `src/lib/notification-service.ts`
