import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2">
              <span className="font-bold text-primary">MT</span>
            </div>
            <h1 className="text-xl font-bold">My Movies</h1>
          </div>
          <nav className="flex items-center gap-4">
            <a href="/settings" className="text-sm font-medium text-muted-foreground hover:text-foreground">Settings</a>
            <form action="/login" method="POST">
              <button formAction={async () => {
                'use server';
                const supabase = await createClient()
                await supabase.auth.signOut()
                redirect('/login')
              }} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Sign Out
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
