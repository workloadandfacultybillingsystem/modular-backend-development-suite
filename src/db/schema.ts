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
  createdAt: text('created_at').notNull(),
});