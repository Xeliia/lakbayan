"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MapInterface } from "@/components/map-interface"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("accessToken")

    if (!token) {
      router.replace("/auth")
    } else {
      setIsAuthenticated(true)
    }
    
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-slate-900" />
      </div>
    )
  }

  return isAuthenticated ? <MapInterface /> : null
}