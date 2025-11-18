"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import {
  Users,
  DollarSign,
  TrendingUp,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { toast } from "sonner";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalFaculty: 0,
    totalSalaryPaid: 0,
    pendingSalaries: 0,
    departments: 0,
  });
  const [salaryTrend, setSalaryTrend] = useState<any[]>([]);
  const [departmentSummary, setDepartmentSummary] = useState<any[]>([]);

  // Refs to prevent multiple runs
  const hasCheckedAuth = useRef(false);
  const hasFetchedData = useRef(false);

  // Authentication check - only runs once
  useEffect(() => {
    if (hasCheckedAuth.current) return;

    const currentToken = useAuthStore.getState().token;
    const currentUser = useAuthStore.getState().user;

    // Check authentication
    if (!currentToken || !currentUser) {
      router.push("/login");
      return;
    }

    // Check admin role
    if (currentUser.role !== "admin") {
      toast.error("Access denied. Admin privileges required.");
      router.push("/faculty/dashboard");
      return;
    }

    hasCheckedAuth.current = true;
    setAuthChecked(true);
  }, [router]);

  // Fetch data only after auth is confirmed - only runs once
  useEffect(() => {
    if (!authChecked || hasFetchedData.current) return;
    
    hasFetchedData.current = true;
    fetchDashboardData();
  }, [authChecked]);

  const fetchDashboardData = async () => {
    const currentToken = useAuthStore.getState().token;
    
    if (!currentToken) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [facultyRes, salaryTrendRes, deptSummaryRes] = await Promise.all([
        fetch("/api/faculty?limit=100", {
          headers: { Authorization: `Bearer ${currentToken}` },
        }),
        fetch("/api/analytics/salary-trend?startMonth=2024-11&endMonth=2025-01", {
          headers: { Authorization: `Bearer ${currentToken}` },
        }),
        fetch("/api/analytics/department-summary", {
          headers: { Authorization: `Bearer ${currentToken}` },
        }),
      ]);

      // Check for errors
      if (!facultyRes.ok) {
        throw new Error("Failed to fetch faculty data");
      }
      if (!salaryTrendRes.ok) {
        throw new Error("Failed to fetch salary trends");
      }
      if (!deptSummaryRes.ok) {
        throw new Error("Failed to fetch department summary");
      }

      const faculty = await facultyRes.json();
      const trends = await salaryTrendRes.json();
      const depts = await deptSummaryRes.json();

      // Validate data
      const facultyArray = Array.isArray(faculty) ? faculty : [];
      const trendsArray = Array.isArray(trends) ? trends : [];
      const deptsArray = Array.isArray(depts) ? depts : [];

      setStats({
        totalFaculty: facultyArray.length,
        totalSalaryPaid: trendsArray.length > 0 
          ? trendsArray[trendsArray.length - 1]?.totalFinalSalary || 0
          : 0,
        pendingSalaries: 0,
        departments: deptsArray.length,
      });

      setSalaryTrend(trendsArray);
      setDepartmentSummary(deptsArray);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard data";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const salaryChartData = {
    labels: salaryTrend.map((t) => t.month || "N/A"),
    datasets: [
      {
        label: "Total Salary Paid",
        data: salaryTrend.map((t) => t.totalFinalSalary || 0),
        borderColor: "rgb(99, 102, 241)",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const departmentChartData = {
    labels: departmentSummary.map((d) => d.department || "Unknown"),
    datasets: [
      {
        label: "Faculty Count",
        data: departmentSummary.map((d) => d.facultyCount || 0),
        backgroundColor: [
          "rgba(99, 102, 241, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
      },
    ],
  };

  // Show loading only during auth check and data fetch
  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-950">
      <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <h1 className="text-3xl font-bold gradient-text">
          Welcome back, {user?.name || "Admin"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here's what's happening with your college today.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white glass-card hover-lift animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
            <Users className="h-5 w-5 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalFaculty}</div>
            <p className="text-xs opacity-75 mt-1">Active members</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white glass-card hover-lift animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Salary Paid (This Month)
            </CardTitle>
            <DollarSign className="h-5 w-5 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{(stats.totalSalaryPaid / 1000).toFixed(0)}K
            </div>
            <p className="text-xs opacity-75 mt-1">January 2025</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white glass-card hover-lift animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <TrendingUp className="h-5 w-5 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.departments}</div>
            <p className="text-xs opacity-75 mt-1">Active departments</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white glass-card hover-lift animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Records
            </CardTitle>
            <FileText className="h-5 w-5 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingSalaries}</div>
            <p className="text-xs opacity-75 mt-1">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-lg glass-card animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <CardHeader>
            <CardTitle>Salary Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {salaryTrend.length > 0 ? (
              <Line
                data={salaryChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₹${(Number(value) / 1000).toFixed(0)}K`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No salary data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg glass-card animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {departmentSummary.length > 0 ? (
              <Bar
                data={departmentChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 },
                    },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No department data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}