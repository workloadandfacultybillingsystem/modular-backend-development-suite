import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Shield, 
  AlertCircle, 
  Clock, 
  Users, 
  Building2, 
  CheckCircle2,
  ArrowRight,
  Grid3x3,
  Zap,
  History,
  Bell,
  BarChart3
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Header with Notification Bell */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Timetable Management System
          </h2>
          <NotificationBell />
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Badge variant="outline" className="px-4 py-2">
            <Zap className="w-4 h-4 mr-2" />
            Automated Conflict Detection
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white">
            Timetable Management
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              System
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Intelligent scheduling with real-time conflict detection. Never double-book faculty, classrooms, or student groups again.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/timetable">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg">
                Open Timetable Manager
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/analytics">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                <BarChart3 className="w-5 h-5 mr-2" />
                View Analytics
              </Button>
            </Link>
            <Link href="/activity-logs">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                <History className="w-5 h-5 mr-2" />
                Activity Logs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
            Key Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="border-2 hover:border-blue-500 transition-colors hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Faculty Conflict Detection</CardTitle>
                <CardDescription>
                  Automatically prevents scheduling the same faculty member for multiple classes at the same time.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2 */}
            <Card className="border-2 hover:border-indigo-500 transition-colors hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <CardTitle>Classroom Management</CardTitle>
                <CardDescription>
                  Ensures classrooms are never double-booked, preventing scheduling conflicts and confusion.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3 */}
            <Card className="border-2 hover:border-purple-500 transition-colors hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Student Group Protection</CardTitle>
                <CardDescription>
                  Validates that student groups don't have overlapping classes, ensuring feasible schedules.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4 */}
            <Card className="border-2 hover:border-green-500 transition-colors hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Real-Time Validation</CardTitle>
                <CardDescription>
                  Instant feedback when scheduling conflicts are detected, with detailed error messages.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 5 */}
            <Card className="border-2 hover:border-orange-500 transition-colors hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                  <Grid3x3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Weekly Grid View</CardTitle>
                <CardDescription>
                  Visual timetable representation showing all classes in an easy-to-understand weekly grid format.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 6 */}
            <Card className="border-2 hover:border-pink-500 transition-colors hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>Conflict Highlighting</CardTitle>
                <CardDescription>
                  Color-coded visual indicators immediately show any scheduling conflicts in the timetable.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 7 - Activity Logging */}
            <Card className="border-2 hover:border-cyan-500 transition-colors hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-4">
                  <History className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <CardTitle>Complete Activity Logging</CardTitle>
                <CardDescription>
                  Comprehensive audit trail of all system actions with detailed tracking and analytics.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* NEW Feature 8 - Notifications */}
            <Card className="border-2 hover:border-violet-500 transition-colors hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <CardTitle>Real-Time Notifications</CardTitle>
                <CardDescription>
                  Instant alerts for conflicts, schedule changes, and important system events delivered directly to users.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white dark:bg-slate-900 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
              How It Works
            </h2>
            
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Select Schedule Details
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Choose faculty, subject, classroom, day, time, semester, and student group from pre-populated dropdowns.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Automatic Conflict Check
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    The system validates your entry against all existing schedules, checking for faculty, classroom, and student group conflicts.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Get Instant Feedback
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    If conflicts exist, receive detailed error messages explaining exactly what's wrong. Otherwise, your class is successfully scheduled.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                    4
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Visualize Your Timetable
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    View all scheduled classes in a beautiful weekly grid layout with conflict highlighting for easy management.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold">
                    5
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Track Every Action
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Every operation is automatically logged with detailed audit trails, timestamps, and user information for complete transparency.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold">
                    6
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Receive Real-Time Notifications
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Get instant alerts for schedule conflicts, important changes, exam duties, and system events through the notification center.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0 text-white">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl mb-4">
                Ready to Manage Your Timetable?
              </CardTitle>
              <CardDescription className="text-blue-100 text-lg">
                Get started with automated conflict detection and intelligent scheduling today.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/timetable">
                <Button size="lg" variant="secondary" className="px-8 py-6 text-lg">
                  <Calendar className="w-5 h-5 mr-2" />
                  Launch Timetable Manager
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/notifications">
                <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-white text-white hover:bg-white/10">
                  <Bell className="w-5 h-5 mr-2" />
                  View Notifications
                </Button>
              </Link>
              <Link href="/activity-logs">
                <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-white text-white hover:bg-white/10">
                  <History className="w-5 h-5 mr-2" />
                  View Activity Logs
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Automated Conflict Detection & Notification System</span>
            </div>
            <div className="flex gap-6">
              <Link href="/timetable" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Timetable
              </Link>
              <Link href="/notifications" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Notifications
              </Link>
              <Link href="/activity-logs" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Activity Logs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}