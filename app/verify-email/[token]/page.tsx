"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VerifyEmailPage() {
  const params = useParams()
  const router = useRouter()
  
  const rawToken = params?.token as string
  const fullToken = rawToken ? decodeURIComponent(rawToken) : null

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [debugMsg, setDebugMsg] = useState<string>('')

  useEffect(() => {
    if (!fullToken) {
      setStatus('error')
      setDebugMsg('No token found.')
      return
    }

    const verify = async () => {
        const allauthUrl = 'https://api-lakbayan.onrender.com/api/auth/registration/verify-email/'
        
        try {
            console.log(`Verifying with Allauth at: ${allauthUrl}`)
            
            const res = await fetch(allauthUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ key: fullToken })
            })

            if (res.ok) {
                setStatus('success')
            } else {
                const fallbackUrl = 'https://lakbayan-backend.onrender.com/api/accounts/verify-email/'
                const res2 = await fetch(fallbackUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: fullToken })
                })

                if (res2.ok) {
                    setStatus('success')
                } else {
                    const errorText = await res.text()
                    setStatus('error')
                    setDebugMsg(`Verification failed. Server responded with: ${res.status}`)
                    console.error("Server response:", errorText)
                }
            }

        } catch (err: Error | unknown) {
            setStatus('error')
            setDebugMsg(err instanceof Error ? err.message : "Connection failed")
        }
    }

    verify()
  }, [fullToken])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center space-y-4">
        {status === 'loading' && <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600"/>}
        
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600"/>
            <h1 className="text-xl font-bold">Email Verified!</h1>
            <p className="text-sm text-slate-500">Your account is now active.</p>
            <Button onClick={() => router.push('/auth')}>Go to Login</Button>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 mx-auto text-red-600"/>
            <h1 className="text-xl font-bold">Verification Failed</h1>
            <p className="text-xs text-red-500 bg-red-50 p-2 rounded font-mono break-all">
              {debugMsg}
            </p>
            <Button variant="outline" onClick={() => router.push('/auth')}>Back to Login</Button>
          </>
        )}
      </div>
    </div>
  )
}