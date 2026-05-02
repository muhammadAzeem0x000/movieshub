'use client'

import { useState } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Film } from 'lucide-react'
import { toast } from 'sonner'

import Image from 'next/image'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await login(formData)
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />
      
      <Card className="w-full max-w-sm relative z-10 border-primary/20 shadow-2xl backdrop-blur-xl bg-background/80">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-6">
            <div className="rounded-full p-2 animate-in zoom-in duration-500 overflow-hidden shadow-lg shadow-primary/10 bg-background">
              <Image src="/logo/dark-logo.png" alt="MoviesHub Logo" width={80} height={80} className="dark:hidden object-contain rounded-full" />
              <Image src="/logo/white-logo.png" alt="MoviesHub Logo" width={80} height={80} className="hidden dark:block object-contain rounded-full" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your email to sign in to your account
          </CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required className="bg-background/50 focus-visible:ring-primary/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold">Password</Label>
              <Input id="password" name="password" type="password" required className="bg-background/50 focus-visible:ring-primary/50" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 mt-2">
            <Button className="w-full shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-semibold hover:underline underline-offset-4 transition-all">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
