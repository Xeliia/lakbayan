"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Lock, Mail, User, AlertCircle, CheckCircle2, MapPin, ShieldAlert, LogOut, ArrowRight, Info, FileText, Bus, Waypoints, BarChart3, ArrowLeft, Users, Clock, Download, TrendingUp, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

const API_BASE_URL = "https://api-lakbayan.onrender.com/api"

interface UserData {
  username: string
  email: string
  id?: number
  is_staff?: boolean
  is_superuser?: boolean
}

interface TerminalContribution {
  name: string
  description: string
  latitude: string
  longitude: string
  city: number
  verified?: boolean
}

interface RouteContribution {
  terminal: number
  destination_name: string
  mode: number
  description: string
  verified?: boolean
}

interface ContributionsSummary {
  terminals: {
    data: TerminalContribution[]
    total: number
    verified: number
    pending: number
  }
  routes: {
    data: RouteContribution[]
    total: number
    verified: number
    pending: number
  }
  summary: {
    total_contributions: number
    verified_contributions: number
  }
}

interface LoginAnalytics {
  hour: string
  count: number
}

interface UniqueUsersAnalytics {
  hour: string
  unique_users: number
}

interface AllLoginsAnalytics {
  hour: string
  user__username: string
  user__id: number
  count: number
}

interface LeaderboardContributor {
  username: string
  lakbay_points: number
  percentage: number
  verified_terminals: number
  verified_routes: number
}

interface LeaderboardData {
  total_lp_pool: number
  contributors: LeaderboardContributor[]
}

export default function AuthPage() {
  const router = useRouter()
  
  const [viewState, setViewState] = useState<'login' | 'register' | 'profile' | 'analytics'>('login')
  const [activeTab, setActiveTab] = useState<'terminals' | 'routes'>('terminals')
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [user, setUser] = useState<UserData | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [contributions, setContributions] = useState<ContributionsSummary | null>(null)
  
  // Analytics state
  const [loginAnalytics, setLoginAnalytics] = useState<LoginAnalytics[]>([])
  const [uniqueUsersAnalytics, setUniqueUsersAnalytics] = useState<UniqueUsersAnalytics[]>([])
  const [allLoginsAnalytics, setAllLoginsAnalytics] = useState<AllLoginsAnalytics[]>([])
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchContributions = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/my-contributions/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setContributions(data)
      }
    } catch (error) {
      console.error(error)
    }
  }, [])

  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem("accessToken")
    if (!token) {
      setIsPageLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/email-verification/status/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        // Load stored user data for is_staff/is_superuser
        const storedUser = localStorage.getItem("user")
        const parsedUser = storedUser ? JSON.parse(storedUser) : {}
        
        setUser({ 
          username: data.username, 
          email: data.email || data.primary_email,
          is_staff: parsedUser.is_staff || false,
          is_superuser: parsedUser.is_superuser || false
        })
        setIsVerified(data.email_verified)
        setViewState('profile')
        fetchContributions(token)
      } else {
        handleLogout() 
      }
    } catch {
      handleLogout()
    } finally {
      setIsPageLoading(false)
    }
  }, [fetchContributions])

  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError(null)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (viewState === 'register' && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const endpoint = viewState === 'login' ? "/accounts/login/" : "/accounts/register/"
      const payload = viewState === 'login'
        ? { username: formData.username, password: formData.password }
        : { 
            username: formData.username, 
            email: formData.email, 
            password: formData.password, 
            password_confirm: formData.confirmPassword 
          }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.username) throw new Error(data.username[0])
        if (data.email) throw new Error(data.email[0])
        if (data.password) throw new Error(data.password[0])
        if (data.detail) throw new Error(data.detail)
        throw new Error("Authentication failed")
      }

      localStorage.setItem("accessToken", data.access_token)
      localStorage.setItem("refreshToken", data.refresh_token)
      localStorage.setItem("user", JSON.stringify(data.user))

      if (viewState === 'login') {
        checkAuthStatus()
      } else {
        setSuccess("Account created! Please check your email.")
        setTimeout(() => {
            setViewState('login')
            setSuccess(null)
        }, 2000)
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    const token = localStorage.getItem("accessToken")

    try {
      const response = await fetch(`${API_BASE_URL}/email-verification/resend/`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSuccess("Verification email sent! Check your inbox.")
      } else {
        if (response.status === 429) {
             throw new Error("Please wait a few minutes before trying again.")
        }
        throw new Error(data.message || "Failed to resend email")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
    setUser(null)
    setContributions(null)
    setViewState('login')
    setFormData({ username: "", email: "", password: "", confirmPassword: "" })
  }

  const handleViewOnMap = (lat: string, lng: string) => {
    router.push(`/?lat=${lat}&lng=${lng}&zoom=16`)
  }

  const fetchAnalytics = useCallback(async () => {
    const token = localStorage.getItem("accessToken")
    if (!token) return

    setIsLoadingAnalytics(true)
    try {
      const [loginRes, uniqueRes, allLoginsRes, leaderboardRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/analytics/unique-users/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/analytics/all-logins/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/analytics/lakbay-leaderboards/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (loginRes.ok) {
        const loginData = await loginRes.json()
        setLoginAnalytics(loginData)
      }
      if (uniqueRes.ok) {
        const uniqueData = await uniqueRes.json()
        setUniqueUsersAnalytics(uniqueData)
      }
      if (allLoginsRes.ok) {
        const allLoginsData = await allLoginsRes.json()
        if (Array.isArray(allLoginsData)) {
          // Sort by hour descending (newest first)
          const sortedData = allLoginsData.sort((a: AllLoginsAnalytics, b: AllLoginsAnalytics) => 
            new Date(b.hour).getTime() - new Date(a.hour).getTime()
          )
          setAllLoginsAnalytics(sortedData)
        }
      }
      if (leaderboardRes.ok) {
        const leaderboardDataJson = await leaderboardRes.json()
        setLeaderboardData(leaderboardDataJson)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }, [])

  const isAdmin = useMemo(() => {
    return user?.is_staff || user?.is_superuser
  }, [user])

  // Aggregate logins by user for pie chart
  const userLoginCounts = useMemo(() => {
    const counts: Record<string, { username: string; count: number }> = {}
    allLoginsAnalytics.forEach(entry => {
      if (counts[entry.user__username]) {
        counts[entry.user__username].count += entry.count
      } else {
        counts[entry.user__username] = { username: entry.user__username, count: entry.count }
      }
    })
    return Object.values(counts).sort((a, b) => b.count - a.count)
  }, [allLoginsAnalytics])

  // Calculate max for bar chart scaling
  const maxLoginCount = useMemo(() => {
    return Math.max(...loginAnalytics.map(d => d.count), 1)
  }, [loginAnalytics])

  // Heatmap data - group by day and hour
  const heatmapData = useMemo(() => {
    const grid: Record<string, Record<number, number>> = {}
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Initialize grid
    days.forEach(day => {
      grid[day] = {}
      for (let h = 0; h < 24; h++) {
        grid[day][h] = 0
      }
    })
    
    loginAnalytics.forEach(entry => {
      const date = new Date(entry.hour)
      const dayName = days[date.getDay()]
      const hour = date.getHours()
      grid[dayName][hour] += entry.count
    })
    
    return { grid, days }
  }, [loginAnalytics])

  // Max value for heatmap color scaling
  const heatmapMax = useMemo(() => {
    let max = 1
    Object.values(heatmapData.grid).forEach(hours => {
      Object.values(hours).forEach(count => {
        if (count > max) max = count
      })
    })
    return max
  }, [heatmapData])

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalLogins = loginAnalytics.reduce((sum, d) => sum + d.count, 0)
    const totalUniqueUsers = new Set(allLoginsAnalytics.map(d => d.user__id)).size
    const peakHour = loginAnalytics.length > 0 
      ? loginAnalytics.reduce((max, d) => d.count > max.count ? d : max, loginAnalytics[0])
      : null
    const avgLoginsPerHour = loginAnalytics.length > 0 
      ? (totalLogins / loginAnalytics.length).toFixed(1) 
      : '0'
    
    return { totalLogins, totalUniqueUsers, peakHour, avgLoginsPerHour }
  }, [loginAnalytics, allLoginsAnalytics])

  // Export analytics data
  const handleExportAnalytics = useCallback(() => {
    const timestamp = new Date().toISOString().split('T')[0]
    
    // Export login analytics
    const loginBlob = new Blob([JSON.stringify(loginAnalytics, null, 2)], { type: 'application/json' })
    const loginUrl = URL.createObjectURL(loginBlob)
    const loginLink = document.createElement('a')
    loginLink.href = loginUrl
    loginLink.download = `login-analytics-${timestamp}.json`
    loginLink.click()
    URL.revokeObjectURL(loginUrl)

    // Export unique users analytics
    const uniqueBlob = new Blob([JSON.stringify(uniqueUsersAnalytics, null, 2)], { type: 'application/json' })
    const uniqueUrl = URL.createObjectURL(uniqueBlob)
    const uniqueLink = document.createElement('a')
    uniqueLink.href = uniqueUrl
    uniqueLink.download = `unique-users-analytics-${timestamp}.json`
    uniqueLink.click()
    URL.revokeObjectURL(uniqueUrl)

    // Export all logins analytics
    const allLoginsBlob = new Blob([JSON.stringify(allLoginsAnalytics, null, 2)], { type: 'application/json' })
    const allLoginsUrl = URL.createObjectURL(allLoginsBlob)
    const allLoginsLink = document.createElement('a')
    allLoginsLink.href = allLoginsUrl
    allLoginsLink.download = `all-logins-analytics-${timestamp}.json`
    allLoginsLink.click()
    URL.revokeObjectURL(allLoginsUrl)
  }, [loginAnalytics, uniqueUsersAnalytics, allLoginsAnalytics])

  if (isPageLoading) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400"/>
        </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex bg-white">
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative justify-center items-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518558997970-4dadc805574e?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 text-center text-white p-8">
            <div className="mx-auto w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8 backdrop-blur-md border border-white/20 shadow-2xl">
                <MapPin className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-6xl font-bold mb-6 tracking-tight">LakBayan</h1>
            <p className="text-xl text-slate-300 font-light max-w-md mx-auto leading-relaxed">
                Navigate the Philippines with community-driven transport data.
            </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen relative bg-white lg:bg-slate-50">
        <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col justify-center items-center p-6 md:p-12">
                <div className="w-full max-w-md space-y-8 bg-white lg:bg-transparent rounded-2xl lg:rounded-none p-6 lg:p-0 shadow-xl lg:shadow-none border border-slate-100 lg:border-none">
                    
                    <div className="lg:hidden text-center space-y-2 mb-8">
                        <div className="mx-auto w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                            <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">LakBayan</h1>
                    </div>

                    {viewState === 'profile' && user ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center space-y-3">
                                <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-slate-700 border-4 border-white shadow-lg">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Welcome, {user.username}</h2>
                                    <p className="text-slate-500 font-medium">{user.email}</p>
                                </div>
                            </div>

                            {!isVerified ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-amber-100 p-2 rounded-full shrink-0">
                                            <ShieldAlert className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-amber-900">Email Not Verified</h3>
                                            <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                                                Please verify your email address to unlock contribution features.
                                            </p>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleResendVerification} 
                                        disabled={isLoading}
                                        className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none shadow-none"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Mail className="w-4 h-4 mr-2"/>}
                                        Resend Verification Email
                                    </Button>
                                </div>
                            ) : isAdmin ? (
                                <div className="space-y-6">
                                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                                        <div className="bg-violet-100 p-2 rounded-full">
                                            <BarChart3 className="w-5 h-5 text-violet-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-violet-900">Welcome Back, Admin {user.username}!</h3>
                                        </div>
                                    </div>

                                    <Button 
                                        onClick={() => { setViewState('analytics'); fetchAnalytics(); }}
                                        className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white shadow-lg"
                                    >
                                        <BarChart3 className="w-4 h-4 mr-2" />
                                        View Analytics
                                    </Button>

                                    {contributions && (
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2 font-bold text-slate-800">
                                                    <FileText className="w-4 h-4" /> My Contributions
                                                </div>
                                                <span className="text-xs bg-slate-900 text-white px-2.5 py-1 rounded-full font-bold">
                                                    {contributions.summary.total_contributions} Total
                                                </span>
                                            </div>

                                            <div className="w-full">
                                                <div className="flex border-b border-slate-200">
                                                    <button 
                                                        onClick={() => setActiveTab('terminals')}
                                                        className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'terminals' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                                    >
                                                        Terminals ({contributions.terminals.total})
                                                    </button>
                                                    <button 
                                                        onClick={() => setActiveTab('routes')}
                                                        className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'routes' ? 'bg-white text-green-600 border-b-2 border-green-600' : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                                    >
                                                        Routes ({contributions.routes.total})
                                                    </button>
                                                </div>
                                                
                                                <ScrollArea className="h-[180px] bg-slate-50/50">
                                                    {activeTab === 'terminals' ? (
                                                        contributions.terminals.data.length > 0 ? (
                                                            <div className="divide-y divide-slate-100">
                                                                {contributions.terminals.data.map((term, i) => (
                                                                    <div key={i} className="p-4 bg-white hover:bg-slate-50 transition-colors flex justify-between items-start gap-3">
                                                                        <div className="space-y-1.5 w-full">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="p-1.5 bg-blue-100 rounded-md">
                                                                                        <Bus className="w-3.5 h-3.5 text-blue-600" />
                                                                                    </div>
                                                                                    <span className="font-semibold text-sm text-slate-900">{term.name}</span>
                                                                                </div>
                                                                                {term.verified ? (
                                                                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-emerald-200">Verified</span>
                                                                                ) : (
                                                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-amber-200">Pending</span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 line-clamp-2 pl-9">{term.description}</p>
                                                                        </div>
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="outline" 
                                                                            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 shrink-0 shadow-sm"
                                                                            title="View location on map"
                                                                            onClick={() => handleViewOnMap(term.latitude, term.longitude)}
                                                                        >
                                                                            <MapPin className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 space-y-3">
                                                                <div className="bg-slate-100 p-4 rounded-full">
                                                                    <Bus className="w-6 h-6 text-slate-300" />
                                                                </div>
                                                                <span className="text-sm font-medium">No terminals contributed yet.</span>
                                                            </div>
                                                        )
                                                    ) : (
                                                        contributions.routes.data.length > 0 ? (
                                                            <div className="divide-y divide-slate-100">
                                                                {contributions.routes.data.map((route, i) => (
                                                                    <div key={i} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                                                                        <div className="flex items-center justify-between mb-1.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="p-1.5 bg-green-100 rounded-md">
                                                                                    <Waypoints className="w-3.5 h-3.5 text-green-600" />
                                                                                </div>
                                                                                <span className="font-semibold text-sm text-slate-900">To: {route.destination_name}</span>
                                                                            </div>
                                                                            {route.verified ? (
                                                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-emerald-200">Verified</span>
                                                                            ) : (
                                                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-amber-200">Pending</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-slate-500 line-clamp-2 pl-9">{route.description}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 space-y-3">
                                                                <div className="bg-slate-100 p-4 rounded-full">
                                                                    <Waypoints className="w-6 h-6 text-slate-300" />
                                                                </div>
                                                                <span className="text-sm font-medium">No routes contributed yet.</span>
                                                            </div>
                                                        )
                                                    )}
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
                                        <div className="bg-emerald-100 p-2 rounded-full">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-emerald-900">Account Verified</h3>
                                            <p className="text-sm text-emerald-700">You are ready to contribute data.</p>
                                        </div>
                                    </div>

                                    {contributions && (
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2 font-bold text-slate-800">
                                                    <FileText className="w-4 h-4" /> My Contributions
                                                </div>
                                                <span className="text-xs bg-slate-900 text-white px-2.5 py-1 rounded-full font-bold">
                                                    {contributions.summary.total_contributions} Total
                                                </span>
                                            </div>

                                            <div className="w-full">
                                                <div className="flex border-b border-slate-200">
                                                    <button 
                                                        onClick={() => setActiveTab('terminals')}
                                                        className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'terminals' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                                    >
                                                        Terminals ({contributions.terminals.total})
                                                    </button>
                                                    <button 
                                                        onClick={() => setActiveTab('routes')}
                                                        className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === 'routes' ? 'bg-white text-green-600 border-b-2 border-green-600' : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                                    >
                                                        Routes ({contributions.routes.total})
                                                    </button>
                                                </div>
                                                
                                                <ScrollArea className="h-[280px] bg-slate-50/50">
                                                    {activeTab === 'terminals' ? (
                                                        contributions.terminals.data.length > 0 ? (
                                                            <div className="divide-y divide-slate-100">
                                                                {contributions.terminals.data.map((term, i) => (
                                                                    <div key={i} className="p-4 bg-white hover:bg-slate-50 transition-colors flex justify-between items-start gap-3">
                                                                        <div className="space-y-1.5 w-full">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="p-1.5 bg-blue-100 rounded-md">
                                                                                        <Bus className="w-3.5 h-3.5 text-blue-600" />
                                                                                    </div>
                                                                                    <span className="font-semibold text-sm text-slate-900">{term.name}</span>
                                                                                </div>
                                                                                {term.verified ? (
                                                                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-emerald-200">Verified</span>
                                                                                ) : (
                                                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-amber-200">Pending</span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 line-clamp-2 pl-9">{term.description}</p>
                                                                        </div>
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="outline" 
                                                                            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 shrink-0 shadow-sm"
                                                                            title="View location on map"
                                                                            onClick={() => handleViewOnMap(term.latitude, term.longitude)}
                                                                        >
                                                                            <MapPin className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 space-y-3">
                                                                <div className="bg-slate-100 p-4 rounded-full">
                                                                    <Bus className="w-6 h-6 text-slate-300" />
                                                                </div>
                                                                <span className="text-sm font-medium">No terminals contributed yet.</span>
                                                            </div>
                                                        )
                                                    ) : (
                                                        contributions.routes.data.length > 0 ? (
                                                            <div className="divide-y divide-slate-100">
                                                                {contributions.routes.data.map((route, i) => (
                                                                    <div key={i} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                                                                        <div className="flex items-center justify-between mb-1.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="p-1.5 bg-green-100 rounded-md">
                                                                                    <Waypoints className="w-3.5 h-3.5 text-green-600" />
                                                                                </div>
                                                                                <span className="font-semibold text-sm text-slate-900">To: {route.destination_name}</span>
                                                                            </div>
                                                                            {route.verified ? (
                                                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-emerald-200">Verified</span>
                                                                            ) : (
                                                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-amber-200">Pending</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-slate-500 line-clamp-2 pl-9">{route.description}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 space-y-3">
                                                                <div className="bg-slate-100 p-4 rounded-full">
                                                                    <Waypoints className="w-6 h-6 text-slate-300" />
                                                                </div>
                                                                <span className="text-sm font-medium">No routes contributed yet.</span>
                                                            </div>
                                                        )
                                                    )}
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-50 text-green-600 text-sm p-4 rounded-xl flex items-center gap-3 animate-in fade-in border border-green-100">
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    <span className="font-medium">{success}</span>
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3 animate-in fade-in border border-red-100">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span className="font-medium">{error}</span>
                                </div>
                            )}
                            
                            <div className="grid gap-3 pt-4 border-t border-slate-100">
                                <Button className="w-full h-12 text-base bg-slate-900 hover:bg-slate-800 shadow-lg hover:shadow-xl transition-all" onClick={() => router.push('/')}>
                                    Go to Map <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" className="w-full h-11 border-slate-200 hover:bg-slate-50 hover:text-slate-900" onClick={() => router.push('/about')}>
                                        About <Info className="w-4 h-4 ml-2" />
                                    </Button>

                                    <Button variant="ghost" className="w-full h-11 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}>
                                        Sign Out <LogOut className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : viewState === 'analytics' && user ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setViewState('profile')}
                                    className="shrink-0"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
                                    <p className="text-sm text-slate-500">Platform usage insights</p>
                                </div>
                            </div>

                            {isLoadingAnalytics ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Export Button */}
                                    <Button 
                                        onClick={handleExportAnalytics}
                                        variant="outline"
                                        className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Export All Data (JSON)
                                    </Button>

                                    {/* Summary Stats Cards */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-4 text-white">
                                            <div className="flex items-center gap-2 mb-1 opacity-80">
                                                <Activity className="w-4 h-4" />
                                                <span className="text-xs font-medium">Total Logins</span>
                                            </div>
                                            <span className="text-2xl font-bold">{summaryStats.totalLogins}</span>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                                            <div className="flex items-center gap-2 mb-1 opacity-80">
                                                <Users className="w-4 h-4" />
                                                <span className="text-xs font-medium">Unique Users</span>
                                            </div>
                                            <span className="text-2xl font-bold">{summaryStats.totalUniqueUsers}</span>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                                            <div className="flex items-center gap-2 mb-1 opacity-80">
                                                <TrendingUp className="w-4 h-4" />
                                                <span className="text-xs font-medium">Avg/Hour</span>
                                            </div>
                                            <span className="text-2xl font-bold">{summaryStats.avgLoginsPerHour}</span>
                                        </div>
                                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
                                            <div className="flex items-center gap-2 mb-1 opacity-80">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-xs font-medium">Peak Hour</span>
                                            </div>
                                            <span className="text-xl font-bold">
                                                {summaryStats.peakHour 
                                                    ? new Date(summaryStats.peakHour.hour).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
                                                    : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Heatmap - Login Activity by Day & Hour */}
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-rose-600" />
                                            <span className="font-bold text-slate-800">Activity Heatmap</span>
                                            <span className="text-xs text-slate-400 ml-auto">Day × Hour</span>
                                        </div>
                                        <div className="p-4 overflow-x-auto">
                                            <div className="min-w-[500px]">
                                                {/* Hour labels */}
                                                <div className="flex mb-1 ml-10">
                                                    {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                                                        <span key={h} className="text-[10px] text-slate-400 flex-1 text-center">
                                                            {h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h-12}p` : `${h}a`}
                                                        </span>
                                                    ))}
                                                </div>
                                                {/* Heatmap grid */}
                                                {heatmapData.days.map(day => (
                                                    <div key={day} className="flex items-center gap-1 mb-1">
                                                        <span className="text-xs text-slate-500 w-8 shrink-0">{day}</span>
                                                        <div className="flex-1 flex gap-0.5">
                                                            {Array.from({ length: 24 }, (_, h) => {
                                                                const count = heatmapData.grid[day][h]
                                                                const intensity = count / heatmapMax
                                                                const bgColor = count === 0 
                                                                    ? 'bg-slate-100' 
                                                                    : intensity < 0.25 
                                                                        ? 'bg-rose-200' 
                                                                        : intensity < 0.5 
                                                                            ? 'bg-rose-300' 
                                                                            : intensity < 0.75 
                                                                                ? 'bg-rose-400' 
                                                                                : 'bg-rose-500'
                                                                return (
                                                                    <div 
                                                                        key={h} 
                                                                        className={`flex-1 h-5 rounded-sm ${bgColor} transition-colors cursor-pointer hover:ring-2 hover:ring-rose-600 hover:ring-offset-1`}
                                                                        title={`${day} ${h}:00 - ${count} logins`}
                                                                    />
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                                {/* Legend */}
                                                <div className="flex items-center justify-end gap-1 mt-3">
                                                    <span className="text-[10px] text-slate-400 mr-1">Less</span>
                                                    <div className="w-4 h-4 rounded-sm bg-slate-100" />
                                                    <div className="w-4 h-4 rounded-sm bg-rose-200" />
                                                    <div className="w-4 h-4 rounded-sm bg-rose-300" />
                                                    <div className="w-4 h-4 rounded-sm bg-rose-400" />
                                                    <div className="w-4 h-4 rounded-sm bg-rose-500" />
                                                    <span className="text-[10px] text-slate-400 ml-1">More</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bar Chart - Login Count per Hour */}
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4 text-violet-600" />
                                            <span className="font-bold text-slate-800">Recent Hourly Logins</span>
                                        </div>
                                        <div className="p-4">
                                            {loginAnalytics.length > 0 ? (
                                                <div className="space-y-2">
                                                    {loginAnalytics.slice(-8).map((entry, i) => {
                                                        const date = new Date(entry.hour)
                                                        const hourLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
                                                        const barWidth = (entry.count / maxLoginCount) * 100
                                                        return (
                                                            <div key={i} className="flex items-center gap-3">
                                                                <span className="text-xs text-slate-500 w-14 shrink-0">{hourLabel}</span>
                                                                <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                                                                        style={{ width: `${Math.max(barWidth, 10)}%` }}
                                                                    >
                                                                        <span className="text-xs font-bold text-white">{entry.count}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-400 text-center py-4">No login data available</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Donut Chart - User Distribution (SVG) */}
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-blue-600" />
                                            <span className="font-bold text-slate-800">Top Users by Logins</span>
                                        </div>
                                        <div className="p-4">
                                            {userLoginCounts.length > 0 ? (
                                                <div className="flex items-center gap-6">
                                                    {/* SVG Donut Chart */}
                                                    <div className="relative w-28 h-28 shrink-0">
                                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                            {(() => {
                                                                const total = userLoginCounts.reduce((sum, u) => sum + u.count, 0)
                                                                const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
                                                                let cumulativePercent = 0
                                                                
                                                                return userLoginCounts.slice(0, 6).map((u, i) => {
                                                                    const percent = (u.count / total) * 100
                                                                    const dashArray = `${percent} ${100 - percent}`
                                                                    const dashOffset = -cumulativePercent
                                                                    cumulativePercent += percent
                                                                    
                                                                    return (
                                                                        <circle
                                                                            key={i}
                                                                            cx="18"
                                                                            cy="18"
                                                                            r="15.9155"
                                                                            fill="none"
                                                                            stroke={colors[i % colors.length]}
                                                                            strokeWidth="3"
                                                                            strokeDasharray={dashArray}
                                                                            strokeDashoffset={dashOffset}
                                                                            className="transition-all duration-500"
                                                                        />
                                                                    )
                                                                })
                                                            })()}
                                                        </svg>
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="text-center">
                                                                <span className="text-lg font-bold text-slate-700">{userLoginCounts.reduce((sum, u) => sum + u.count, 0)}</span>
                                                                <p className="text-[10px] text-slate-400">total</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Legend */}
                                                    <div className="flex-1 space-y-1.5">
                                                        {userLoginCounts.slice(0, 6).map((u, i) => {
                                                            const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-pink-500']
                                                            const total = userLoginCounts.reduce((sum, x) => sum + x.count, 0)
                                                            const percent = ((u.count / total) * 100).toFixed(1)
                                                            return (
                                                                <div key={i} className="flex items-center gap-2 text-sm">
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                                                                    <span className="text-slate-700 font-medium truncate flex-1">{u.username}</span>
                                                                    <span className="text-slate-500 text-xs">{percent}%</span>
                                                                    <span className="text-slate-400 text-xs w-6 text-right">{u.count}</span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-400 text-center py-4">No user data available</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Lakbay Points Leaderboard */}
                                    {leaderboardData && (
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-amber-600" />
                                                    <span className="font-bold text-slate-800">Lakbay Points Leaderboard</span>
                                                </div>
                                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                                    {leaderboardData.total_lp_pool} Total LP
                                                </span>
                                            </div>
                                            <div className="p-4">
                                                {leaderboardData.contributors.length > 0 ? (
                                                    <div className="flex items-center gap-6">
                                                        {/* SVG Pie Chart for LP Distribution */}
                                                        <div className="relative w-28 h-28 shrink-0">
                                                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                                                {(() => {
                                                                    const colors = ['#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#ec4899']
                                                                    let cumulativePercent = 0
                                                                    
                                                                    return leaderboardData.contributors.slice(0, 6).map((contributor, i) => {
                                                                        const percent = contributor.percentage
                                                                        const dashArray = `${percent} ${100 - percent}`
                                                                        const dashOffset = -cumulativePercent
                                                                        cumulativePercent += percent
                                                                        
                                                                        return (
                                                                            <circle
                                                                                key={i}
                                                                                cx="18"
                                                                                cy="18"
                                                                                r="15.9155"
                                                                                fill="none"
                                                                                stroke={colors[i % colors.length]}
                                                                                strokeWidth="3"
                                                                                strokeDasharray={dashArray}
                                                                                strokeDashoffset={dashOffset}
                                                                                className="transition-all duration-500"
                                                                            />
                                                                        )
                                                                    })
                                                                })()}
                                                            </svg>
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="text-center">
                                                                    <span className="text-lg font-bold text-slate-700">{leaderboardData.total_lp_pool}</span>
                                                                    <p className="text-[10px] text-slate-400">LP</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Leaderboard List */}
                                                        <div className="flex-1 space-y-2">
                                                            {leaderboardData.contributors.slice(0, 6).map((contributor, i) => {
                                                                const colors = ['bg-amber-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-red-500', 'bg-pink-500']
                                                                return (
                                                                    <div key={i} className="flex items-center gap-2 text-sm">
                                                                        <div className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                                                                        <span className="text-slate-700 font-medium truncate flex-1">{contributor.username}</span>
                                                                        <span className="text-slate-500 text-xs">{contributor.percentage.toFixed(1)}%</span>
                                                                        <span className="text-amber-600 text-xs font-semibold w-10 text-right">{contributor.lakbay_points} LP</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-400 text-center py-4">No leaderboard data available</p>
                                                )}
                                            </div>
                                            {/* Contribution Stats */}
                                            {leaderboardData.contributors.length > 0 && (
                                                <div className="border-t border-slate-100">
                                                    <ScrollArea className="h-[140px]">
                                                        <div className="divide-y divide-slate-100">
                                                            {leaderboardData.contributors.map((contributor, i) => (
                                                                <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-700">
                                                                            {i + 1}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-medium text-slate-800 text-sm">{contributor.username}</span>
                                                                            <p className="text-xs text-slate-400">
                                                                                {contributor.verified_terminals} terminals • {contributor.verified_routes} routes
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-sm bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                                                                        {contributor.lakbay_points} LP
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Recent Activity List */}
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-emerald-600" />
                                                <span className="font-bold text-slate-800">Recent Login Activity</span>
                                            </div>
                                            <span className="text-xs text-slate-400">{allLoginsAnalytics.length} records</span>
                                        </div>
                                        <ScrollArea className="h-[180px]">
                                            {allLoginsAnalytics.length > 0 ? (
                                                <div className="divide-y divide-slate-100">
                                                    {allLoginsAnalytics.slice(0, 15).map((entry, i) => {
                                                        const date = new Date(entry.hour)
                                                        const timeLabel = date.toLocaleString('en-US', { 
                                                            month: 'short', 
                                                            day: 'numeric',
                                                            hour: 'numeric', 
                                                            hour12: true 
                                                        })
                                                        return (
                                                            <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                                                                        {entry.user__username.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium text-slate-800 text-sm">{entry.user__username}</span>
                                                                        <p className="text-xs text-slate-400">{timeLabel}</p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
                                                                    ×{entry.count}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <p className="text-sm text-slate-400">No recent activity</p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                </div>
                            )}

                            <Button 
                                variant="outline" 
                                className="w-full"
                                onClick={() => setViewState('profile')}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Profile
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    {viewState === 'login' ? "Welcome back" : "Create an account"}
                                </h2>
                                <p className="text-slate-500">
                                    {viewState === 'login' ? "Enter your details to sign in to your account" : "Enter your details below to create your account"}
                                </p>
                            </div>

                            <div className="bg-slate-100 p-1.5 rounded-xl flex shadow-inner">
                                <button
                                    onClick={() => { setViewState('login'); setError(null); setSuccess(null); }}
                                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                        viewState === 'login' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    }`}
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => { setViewState('register'); setError(null); setSuccess(null); }}
                                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                        viewState === 'register' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    }`}
                                >
                                    Register
                                </button>
                            </div>

                            <form onSubmit={handleAuth} className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">Username</Label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <Input 
                                            name="username"
                                            placeholder="jdelacruz" 
                                            className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all" 
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                {viewState === 'register' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                        <Label className="text-slate-700 font-medium">Email</Label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                            <Input 
                                                name="email"
                                                type="email" 
                                                placeholder="juan@example.com" 
                                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all" 
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">Password</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <Input 
                                            name="password"
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="••••••••" 
                                            className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all" 
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                </div>

                                {viewState === 'register' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                        <Label className="text-slate-700 font-medium">Confirm Password</Label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                            <Input 
                                                name="confirmPassword"
                                                type="password" 
                                                placeholder="••••••••" 
                                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all" 
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3 animate-in fade-in border border-red-100">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <span className="font-medium">{error}</span>
                                    </div>
                                )}

                                {success && (
                                    <div className="bg-green-50 text-green-600 text-sm p-4 rounded-xl flex items-center gap-3 animate-in fade-in border border-green-100">
                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        <span className="font-medium">{success}</span>
                                    </div>
                                )}

                                <Button className="w-full h-12 text-base bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all" type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {viewState === 'login' ? "Sign In" : "Create Account"}
                                </Button>
                            </form>

                            {viewState === 'login' && (
                                <div className="text-center">
                                    <Link href="/forgot-password" className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline transition-colors">
                                        Forgot your password?
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}