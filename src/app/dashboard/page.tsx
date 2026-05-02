import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'
import { SettingsModal } from '@/components/settings-modal'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: movies, error } = await supabase
    .from('user_media')
    .select('*')
    .order('watched_at', { ascending: false })

  if (error) {
    console.error('Error fetching movies:', error)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-auto flex items-center justify-center rounded-xl overflow-hidden shadow-sm">
              <Image src="/logo/dark-logo.png" alt="MoviesHub Logo" width={160} height={48} className="dark:hidden w-auto h-full object-contain" priority />
              <Image src="/logo/white-logo.png" alt="MoviesHub Logo" width={160} height={48} className="hidden dark:block w-auto h-full object-contain" priority />
            </div>
            <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">MoviesHub</h1>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <SettingsModal />
            <form action="/login" method="POST">
              <button formAction={async () => {
                'use server';
                const supabase = await createClient()
                await supabase.auth.signOut()
                redirect('/login')
              }} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <DashboardClient initialMovies={movies || []} />
      </main>
    </div>
  )
}
