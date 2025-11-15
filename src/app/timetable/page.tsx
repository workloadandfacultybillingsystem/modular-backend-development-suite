"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  Building2, 
  AlertCircle, 
  CheckCircle2,
  Trash2,
  Plus,
  Grid3x3
} from 'lucide-react'

interface Faculty {
  id: number
  name: string
  email: string
  department: string
}

interface Subject {
  id: number
  name: string
  code: string
  credits: number
}

interface Classroom {
  id: number
  roomNumber: string
  building: string
  capacity: number
}

interface TimetableEntry {
  id: number
  dayOfWeek: string
  startTime: string
  endTime: string
  semester: string
  studentGroup: string
  createdAt: string
  faculty: Faculty
  subject: Subject
  classroom: Classroom
}

interface FormData {
  facultyId: string
  subjectId: string
  classroomId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  semester: string
  studentGroup: string
}

export default function TimetablePage() {
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [conflictDetails, setConflictDetails] = useState<any>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>()

  const watchedValues = watch()

  // Helper function to check for conflicts
  const checkConflicts = (entries: TimetableEntry[]) => {
    const conflicts: Set<number> = new Set()
    
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i]
        const entry2 = entries[j]
        
        if (entry1.dayOfWeek === entry2.dayOfWeek) {
          const overlap = timeSlotsOverlap(
            entry1.startTime,
            entry1.endTime,
            entry2.startTime,
            entry2.endTime
          )
          
          if (overlap) {
            // Check if same faculty, classroom, or student group
            if (
              entry1.faculty.id === entry2.faculty.id ||
              entry1.classroom.id === entry2.classroom.id ||
              (entry1.semester === entry2.semester && entry1.studentGroup === entry2.studentGroup)
            ) {
              conflicts.add(entry1.id)
              conflicts.add(entry2.id)
            }
          }
        }
      }
    }
    
    return conflicts
  }

  const timeSlotsOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const [h1, m1] = start1.split(':').map(Number)
    const [h2, m2] = end1.split(':').map(Number)
    const [h3, m3] = start2.split(':').map(Number)
    const [h4, m4] = end2.split(':').map(Number)
    
    const start1Minutes = h1 * 60 + m1
    const end1Minutes = h2 * 60 + m2
    const start2Minutes = h3 * 60 + m3
    const end2Minutes = h4 * 60 + m4
    
    return (start1Minutes < end2Minutes && end1Minutes > start2Minutes)
  }

  const conflicts = checkConflicts(timetableEntries)

  // Generate time slots for grid view
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
  ]
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const getEntriesForDayAndTime = (day: string, time: string) => {
    return timetableEntries.filter(entry => {
      if (entry.dayOfWeek !== day) return false
      
      const [entryHour, entryMin] = entry.startTime.split(':').map(Number)
      const [slotHour] = time.split(':').map(Number)
      
      return entryHour === slotHour
    })
  }

  // Fetch all data
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [facultyRes, subjectsRes, classroomsRes, timetableRes] = await Promise.all([
        fetch('/api/faculty'),
        fetch('/api/subjects'),
        fetch('/api/classrooms'),
        fetch('/api/timetable'),
      ])

      const [facultyData, subjectsData, classroomsData, timetableData] = await Promise.all([
        facultyRes.json(),
        subjectsRes.json(),
        classroomsRes.json(),
        timetableRes.json(),
      ])

      setFaculty(facultyData)
      setSubjects(subjectsData)
      setClassrooms(classroomsData)
      setTimetableEntries(timetableData)
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    setConflictDetails(null)

    try {
      const response = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess('Timetable entry created successfully!')
        setTimetableEntries([...timetableEntries, result.entry])
        reset()
        setTimeout(() => setSuccess(null), 5000)
      } else {
        setError(result.error || 'Failed to create entry')
        if (result.conflictDetails) {
          setConflictDetails(result.conflictDetails)
        }
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const response = await fetch(`/api/timetable?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTimetableEntries(timetableEntries.filter(entry => entry.id !== id))
        setSuccess('Entry deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const result = await response.json()
        setError(result.error || 'Failed to delete entry')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error(err)
    }
  }

  const getDayColor = (day: string) => {
    const colors: Record<string, string> = {
      Monday: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      Tuesday: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      Wednesday: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      Thursday: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      Friday: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      Saturday: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    }
    return colors[day] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[600px]" />
            <Skeleton className="h-[600px]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Timetable Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Automated conflict detection system
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
              {timetableEntries.length} Entries
            </Badge>
            {conflicts.size > 0 && (
              <Badge variant="destructive" className="text-sm px-4 py-2">
                <AlertCircle className="w-4 h-4 mr-2" />
                {conflicts.size} Conflicts
              </Badge>
            )}
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-200">Success</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Conflict Detected</AlertTitle>
            <AlertDescription>
              {error}
              {conflictDetails && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-sm">
                  <p className="font-semibold">Conflict Details:</p>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Type: {conflictDetails.type}</li>
                    <li>Day: {conflictDetails.day}</li>
                    <li>Existing: {conflictDetails.existingStartTime} - {conflictDetails.existingEndTime}</li>
                    <li>Requested: {conflictDetails.requestedStartTime} - {conflictDetails.requestedEndTime}</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="form" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Entry
            </TabsTrigger>
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4" />
              Weekly Grid
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add Entry Form */}
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add New Entry
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    Fill in all fields to schedule a new class
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Faculty Select */}
                    <div className="space-y-2">
                      <Label htmlFor="facultyId" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Faculty
                      </Label>
                      <Select
                        value={watchedValues.facultyId}
                        onValueChange={(value) => setValue('facultyId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select faculty" />
                        </SelectTrigger>
                        <SelectContent>
                          {faculty.map((f) => (
                            <SelectItem key={f.id} value={f.id.toString()}>
                              {f.name} - {f.department}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subject Select */}
                    <div className="space-y-2">
                      <Label htmlFor="subjectId" className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Subject
                      </Label>
                      <Select
                        value={watchedValues.subjectId}
                        onValueChange={(value) => setValue('subjectId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.code} - {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Classroom Select */}
                    <div className="space-y-2">
                      <Label htmlFor="classroomId" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Classroom
                      </Label>
                      <Select
                        value={watchedValues.classroomId}
                        onValueChange={(value) => setValue('classroomId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select classroom" />
                        </SelectTrigger>
                        <SelectContent>
                          {classrooms.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.roomNumber} - {c.building} (Cap: {c.capacity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Day of Week */}
                    <div className="space-y-2">
                      <Label htmlFor="dayOfWeek" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Day of Week
                      </Label>
                      <Select
                        value={watchedValues.dayOfWeek}
                        onValueChange={(value) => setValue('dayOfWeek', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Time Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startTime" className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Start Time
                        </Label>
                        <Input
                          id="startTime"
                          type="time"
                          {...register('startTime', { required: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          {...register('endTime', { required: true })}
                        />
                      </div>
                    </div>

                    {/* Semester */}
                    <div className="space-y-2">
                      <Label htmlFor="semester">Semester</Label>
                      <Select
                        value={watchedValues.semester}
                        onValueChange={(value) => setValue('semester', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6'].map((sem) => (
                            <SelectItem key={sem} value={sem}>
                              {sem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Student Group */}
                    <div className="space-y-2">
                      <Label htmlFor="studentGroup">Student Group</Label>
                      <Select
                        value={watchedValues.studentGroup}
                        onValueChange={(value) => setValue('studentGroup', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          {['Group A', 'Group B', 'Group C', 'Group D'].map((group) => (
                            <SelectItem key={group} value={group}>
                              {group}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      disabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Add Timetable Entry'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Timetable Entries List */}
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <CardTitle>Current Timetable</CardTitle>
                  <CardDescription className="text-purple-100">
                    All scheduled classes
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {timetableEntries.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No timetable entries yet</p>
                      </div>
                    ) : (
                      timetableEntries.map((entry) => (
                        <Card 
                          key={entry.id} 
                          className={`border-l-4 ${
                            conflicts.has(entry.id) 
                              ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' 
                              : 'border-l-blue-500'
                          } hover:shadow-md transition-shadow`}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getDayColor(entry.dayOfWeek)}>
                                    {entry.dayOfWeek}
                                  </Badge>
                                  <Badge variant="outline">
                                    {entry.startTime} - {entry.endTime}
                                  </Badge>
                                  {conflicts.has(entry.id) && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      Conflict
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                                  {entry.subject.name} ({entry.subject.code})
                                </h3>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span className="font-medium">{entry.faculty.name}</span>
                                <span className="text-xs">({entry.faculty.department})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                <span>{entry.classroom.roomNumber} - {entry.classroom.building}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary">{entry.semester}</Badge>
                                <Badge variant="secondary">{entry.studentGroup}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="grid" className="mt-6">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Grid3x3 className="w-5 h-5" />
                  Weekly Timetable Grid
                </CardTitle>
                <CardDescription className="text-emerald-100">
                  Visual representation of all scheduled classes
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <div className="min-w-[1000px]">
                    {/* Grid Header */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      <div className="font-semibold text-sm text-slate-700 dark:text-slate-300 p-2">
                        Time
                      </div>
                      {days.map(day => (
                        <div 
                          key={day}
                          className="font-semibold text-sm text-center p-2 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-lg"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Grid Body */}
                    <div className="space-y-2">
                      {timeSlots.map(time => (
                        <div key={time} className="grid grid-cols-7 gap-2">
                          <div className="font-medium text-sm text-slate-600 dark:text-slate-400 p-2 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {time}
                          </div>
                          {days.map(day => {
                            const entries = getEntriesForDayAndTime(day, time)
                            
                            return (
                              <div 
                                key={`${day}-${time}`}
                                className="min-h-[80px] p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                              >
                                {entries.map(entry => (
                                  <div
                                    key={entry.id}
                                    className={`p-2 rounded-md text-xs mb-1 ${
                                      conflicts.has(entry.id)
                                        ? 'bg-red-100 border border-red-300 dark:bg-red-900/30 dark:border-red-700'
                                        : 'bg-blue-100 border border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                                    }`}
                                  >
                                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                                      {entry.subject.code}
                                    </div>
                                    <div className="text-slate-700 dark:text-slate-300 truncate text-[10px]">
                                      {entry.faculty.name.split(' ')[1]}
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400 truncate text-[10px]">
                                      {entry.classroom.roomNumber}
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-400 text-[10px]">
                                      {entry.studentGroup}
                                    </div>
                                    {conflicts.has(entry.id) && (
                                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400 mt-1">
                                        <AlertCircle className="w-3 h-3" />
                                        <span className="text-[10px] font-semibold">Conflict</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex items-center gap-6 justify-center flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300 dark:bg-blue-900/30 dark:border-blue-700"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Normal Class</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 border border-red-300 dark:bg-red-900/30 dark:border-red-700"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Conflict Detected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700"></div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Free Slot</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}