import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Film, Sparkles, Database } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2">
              <span className="font-bold text-primary">MT</span>
            </div>
            <h1 className="text-xl font-bold">MovieTrack</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:underline">
              Sign In
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full py-24 md:py-32 lg:py-48 flex items-center justify-center text-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-8">
              <div className="space-y-4 max-w-3xl">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                  Your Personal Movie Universe
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Track every film you watch, rate them, and get AI-powered recommendations tailored strictly to your taste. 
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/signup">
                  <Button size="lg" className="h-12 px-8">Start Tracking</Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="h-12 px-8">Sign In</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50 border-t border-b">
          <div className="container px-4 md:px-6">
            <div className="grid gap-12 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Film className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Track & Rate</h3>
                <p className="text-muted-foreground">Search our massive database powered by TMDB. Log your watched movies with your personal 1-10 rating and notes.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">AI Recommendations</h3>
                <p className="text-muted-foreground">Our AI engine analyzes your highly rated movies to suggest exactly what you should watch next.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Total Data Control</h3>
                <p className="text-muted-foreground">Your data belongs to you. Export your entire history to CSV at any time, or permanently delete your account.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 w-full shrink-0 border-t">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MovieTrack. All rights reserved.</p>
          <div className="flex gap-4 mt-4 sm:mt-0">
            <span>Powered by TMDB & Supabase</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
