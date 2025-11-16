"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Building2,
  Sparkles,
  Award,
  Target,
  Lightbulb,
  Calendar
} from 'lucide-react'

interface Faculty {
  id: number
  name: string
  email: string
  department: string
}

interface FacultyAnalytics {
  faculty: Faculty
  period: { type: string; startDate: string; endDate: string }
  summary: {
    totalHours: number
    totalClasses: number
    lectures: number
    practicals: number
    tutorials: number
    extraClasses: number
    makeupClasses: number
    uniqueSubjects: number
  }
  salary: {
    totalAmount: number
    baseAmount: number
    extraBonus: number
    makeupBonus: number
  }
  classTypeDistribution: Array<{
    type: string
    hours: number
    count: number
    percentage: number
  }>
  syllabusProgress: Array<{
    subject: string
    code: string
    required: number
    completed: number
    percentage: number
    status: string
  }>
  anomalies: Array<{
    type: string
    severity: string
    message: string
  }>
}

interface Insights {
  faculty: Faculty
  period: { type: string; startDate: string; endDate: string }
  overallScore: number
  insights: {
    workload: { status: string; message: string; severity: string }
    balance: { status: string; message: string; severity: string }
    schedule: { status: string; message: string; severity: string }
    salary: { status: string; message: string; severity: string }
    progress: Array<{ subject: string; status: string; message: string; severity: string }>
    anomalies: Array<{ type: string; message: string; severity: string }>
  }
  recommendations: Array<{
    priority: string
    category: string
    title: string
    description: string
  }>
  strengths: string[]
  areasForImprovement: string[]
}

export default function AnalyticsPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('')
  const [period, setPeriod] = useState<string>('week')
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analytics, setAnalytics] = useState<FacultyAnalytics | null>(null)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFaculty()
  }, [])

  useEffect(() => {
    if (selectedFacultyId) {
      fetchAnalytics()
    }
  }, [selectedFacultyId, period])

  const fetchFaculty = async () => {
    try {
      const response = await fetch('/api/faculty')
      const data = await response.json()
      setFaculty(data)
      if (data.length > 0) {
        setSelectedFacultyId(data[0].id.toString())
      }
    } catch (err) {
      setError('Failed to load faculty')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    if (!selectedFacultyId) return
    
    setAnalyticsLoading(true)
    setError(null)

    try {
      const [analyticsRes, insightsRes] = await Promise.all([
        fetch(`/api/analytics/faculty/${selectedFacultyId}?period=${period}`),
        fetch(`/api/analytics/insights/${selectedFacultyId}?period=${period}`)
      ])

      if (!analyticsRes.ok || !insightsRes.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const analyticsData = await analyticsRes.json()
      const insightsData = await insightsRes.json()

      setAnalytics(analyticsData)
      setInsights(insightsData)
    } catch (err) {
      setError('Failed to load analytics data')
      console.error(err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-blue-600 dark:text-blue-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-blue-600" />
              Workload Analytics & Salary Insights
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Comprehensive faculty performance tracking and AI-powered recommendations
            </p>
          </div>
          
          <div className="flex gap-3">
            <Select value={selectedFacultyId} onValueChange={setSelectedFacultyId}>
              <SelectTrigger className="w-64 bg-white dark:bg-slate-800">
                <SelectValue placeholder="Select Faculty" />
              </SelectTrigger>
              <SelectContent>
                {faculty.map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>
                    {f.name} - {f.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32 bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analyticsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : analytics && insights ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-lg border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Total Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {analytics.summary.totalHours.toFixed(1)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {analytics.summary.totalClasses} classes
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Est. Salary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    ₹{analytics.salary.totalAmount.toLocaleString()}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    +₹{analytics.salary.extraBonus + analytics.salary.makeupBonus} bonus
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-l-4 border-l-purple-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Subjects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {analytics.summary.uniqueSubjects}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Teaching load
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getScoreColor(insights.overallScore)}`}>
                    {insights.overallScore}/100
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Performance rating
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="insights">AI Insights</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="salary">Salary</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Class Type Distribution */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Class Type Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {analytics.classTypeDistribution.map(type => (
                          <div key={type.type}>
                            <div className="flex justify-between mb-2">
                              <span className="font-medium capitalize">{type.type}</span>
                              <span className="text-slate-600 dark:text-slate-400">
                                {type.hours}h ({type.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all"
                                style={{ width: `${type.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Special Classes */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Special Classes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {analytics.summary.extraClasses}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">Extra Classes</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                +₹{analytics.salary.extraBonus} bonus
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {analytics.summary.makeupClasses}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">Makeup Classes</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                +₹{analytics.salary.makeupBonus} bonus
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Anomalies */}
                {analytics.anomalies.length > 0 && (
                  <Card className="shadow-lg border-l-4 border-l-red-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-5 h-5" />
                        Detected Anomalies
                      </CardTitle>
                      <CardDescription>Issues requiring attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.anomalies.map((anomaly, idx) => (
                          <Alert key={idx} variant={anomaly.severity === 'high' ? 'destructive' : 'default'}>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="capitalize">{anomaly.type.replace(/_/g, ' ')}</AlertTitle>
                            <AlertDescription>{anomaly.message}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* AI Insights Tab */}
              <TabsContent value="insights" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Key Insights */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Key Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {/* Workload */}
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 mt-1 text-blue-600" />
                          <div>
                            <h4 className="font-semibold mb-1">Workload</h4>
                            <Badge className={getSeverityColor(insights.insights.workload.severity)}>
                              {insights.insights.workload.status}
                            </Badge>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                              {insights.insights.workload.message}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Balance */}
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <BarChart3 className="w-5 h-5 mt-1 text-green-600" />
                          <div>
                            <h4 className="font-semibold mb-1">Balance</h4>
                            <Badge className={getSeverityColor(insights.insights.balance.severity)}>
                              {insights.insights.balance.status}
                            </Badge>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                              {insights.insights.balance.message}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Schedule */}
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 mt-1 text-purple-600" />
                          <div>
                            <h4 className="font-semibold mb-1">Schedule</h4>
                            <Badge className={getSeverityColor(insights.insights.schedule.severity)}>
                              {insights.insights.schedule.status}
                            </Badge>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                              {insights.insights.schedule.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {insights.recommendations.map((rec, idx) => (
                          <div key={idx} className="p-4 rounded-lg border">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold">{rec.title}</h4>
                              <Badge className={getPriorityColor(rec.priority)}>
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                              {rec.description}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {rec.category}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Strengths and Areas for Improvement */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="shadow-lg border-l-4 border-l-green-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <Award className="w-5 h-5" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {insights.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                            <span className="text-sm">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg border-l-4 border-l-yellow-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-600">
                        <Target className="w-5 h-5" />
                        Areas for Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {insights.areasForImprovement.map((area, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                            <span className="text-sm">{area}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-4 mt-6">
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Syllabus Coverage Progress
                    </CardTitle>
                    <CardDescription className="text-green-100">
                      Track completion of required teaching hours per subject
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {analytics.syllabusProgress.map((progress, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold">{progress.subject}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {progress.code}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={
                                progress.status === 'completed' || progress.status === 'ahead'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : progress.status === 'behind'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }>
                                {progress.percentage}%
                              </Badge>
                              <p className="text-xs text-slate-500 mt-1">
                                {progress.completed}/{progress.required} hrs
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                progress.percentage >= 100
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  : progress.percentage < 50
                                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                  : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                              }`}
                              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Salary Tab */}
              <TabsContent value="salary" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Salary Breakdown */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Salary Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <span className="text-sm font-medium">Base Salary</span>
                          <span className="font-bold">₹{analytics.salary.baseAmount.toLocaleString()}</span>
                        </div>
                        
                        {analytics.salary.extraBonus > 0 && (
                          <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="text-sm font-medium">Extra Class Bonus</span>
                            <span className="font-bold text-blue-600">+₹{analytics.salary.extraBonus.toLocaleString()}</span>
                          </div>
                        )}
                        
                        {analytics.salary.makeupBonus > 0 && (
                          <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="text-sm font-medium">Makeup Class Bonus</span>
                            <span className="font-bold text-green-600">+₹{analytics.salary.makeupBonus.toLocaleString()}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg">
                          <span className="font-semibold">Total Salary</span>
                          <span className="text-2xl font-bold">₹{analytics.salary.totalAmount.toLocaleString()}</span>
                        </div>

                        <div className="pt-4 border-t">
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            Salary per Hour
                          </p>
                          <p className="text-2xl font-bold">
                            ₹{Math.round(analytics.salary.totalAmount / analytics.summary.totalHours).toLocaleString()}/hr
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Salary Insight */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Salary Insight
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg border">
                          <h4 className="font-semibold mb-2">Payment Status</h4>
                          <Badge className={getSeverityColor(insights.insights.salary.severity)}>
                            {insights.insights.salary.status}
                          </Badge>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
                            {insights.insights.salary.message}
                          </p>
                        </div>

                        <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                          <h4 className="font-semibold mb-3">Earnings by Class Type</h4>
                          <div className="space-y-2">
                            {analytics.classTypeDistribution.map(type => (
                              <div key={type.type} className="flex justify-between text-sm">
                                <span className="capitalize">{type.type}</span>
                                <span className="font-medium">
                                  {type.hours}h × {type.count} classes
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Select a faculty member to view analytics
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
