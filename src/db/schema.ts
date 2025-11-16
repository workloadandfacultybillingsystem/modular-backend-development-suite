import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// Faculty table
export const faculty = sqliteTable('faculty', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  department: text('department').notNull(),
});

// Subject table
export const subjects = sqliteTable('subjects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  credits: integer('credits').notNull(),
});

// Classroom table
export const classrooms = sqliteTable('classrooms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomNumber: text('room_number').notNull().unique(),
  building: text('building').notNull(),
  capacity: integer('capacity').notNull(),
});

// Timetable table
export const timetable = sqliteTable('timetable', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  facultyId: integer('faculty_id').notNull().references(() => faculty.id),
  subjectId: integer('subject_id').notNull().references(() => subjects.id),
  classroomId: integer('classroom_id').notNull().references(() => classrooms.id),
  dayOfWeek: text('day_of_week').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  semester: text('semester').notNull(),
  studentGroup: text('student_group').notNull(),
  classType: text('class_type').notNull(),
  isExtraClass: integer('is_extra_class', { mode: 'boolean' }).default(false),
  isMakeupClass: integer('is_makeup_class', { mode: 'boolean' }).default(false),
  originalClassId: integer('original_class_id'),
  createdAt: text('created_at').notNull(),
});

// Activity Logs table
export const activityLogs = sqliteTable('activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actionType: text('action_type').notNull(),
  userId: text('user_id'),
  userName: text('user_name'),
  timestamp: text('timestamp').notNull(),
  description: text('description').notNull(),
  referenceType: text('reference_type'),
  referenceId: integer('reference_id'),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  metadata: text('metadata'),
  severity: text('severity').notNull().default('info'),
  isSystemAction: integer('is_system_action', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

// Add notifications table at the end
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  notificationType: text('notification_type').notNull(),
  severity: text('severity').notNull(),
  targetUserType: text('target_user_type').notNull(),
  targetUserId: integer('target_user_id'),
  referenceType: text('reference_type'),
  referenceId: integer('reference_id'),
  metadata: text('metadata'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  isSent: integer('is_sent', { mode: 'boolean' }).default(true),
  sentAt: text('sent_at').notNull(),
  readAt: text('read_at'),
  createdAt: text('created_at').notNull(),
});

// Add new holidays table
export const holidays = sqliteTable('holidays', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  affectsDepartment: text('affects_department'),
  createdAt: text('created_at').notNull(),
});

// Add new salary_rates table
export const salaryRates = sqliteTable('salary_rates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  facultyId: integer('faculty_id').notNull().references(() => faculty.id),
  lectureRatePerHour: integer('lecture_rate_per_hour').notNull(),
  practicalRatePerHour: integer('practical_rate_per_hour').notNull(),
  tutorialRatePerHour: integer('tutorial_rate_per_hour').notNull(),
  extraClassBonus: integer('extra_class_bonus').notNull(),
  makeupClassBonus: integer('makeup_class_bonus').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Add new syllabus_requirements table
export const syllabusRequirements = sqliteTable('syllabus_requirements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  subjectId: integer('subject_id').notNull().references(() => subjects.id),
  semester: text('semester').notNull(),
  requiredLectureHours: integer('required_lecture_hours').notNull(),
  requiredPracticalHours: integer('required_practical_hours').notNull(),
  requiredTutorialHours: integer('required_tutorial_hours').notNull(),
  totalWeeks: integer('total_weeks').notNull(),
  createdAt: text('created_at').notNull(),
});

// Add new workload_analytics table
export const workloadAnalytics = sqliteTable('workload_analytics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  facultyId: integer('faculty_id').notNull().references(() => faculty.id),
  period: text('period').notNull(),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  totalLectures: integer('total_lectures').notNull(),
  totalPracticals: integer('total_practicals').notNull(),
  totalTutorials: integer('total_tutorials').notNull(),
  totalHours: integer('total_hours').notNull(),
  extraClasses: integer('extra_classes').notNull(),
  makeupClasses: integer('makeup_classes').notNull(),
  subjectsCount: integer('subjects_count').notNull(),
  estimatedSalary: integer('estimated_salary').notNull(),
  computedAt: text('computed_at').notNull(),
});