'use client'

import { useState } from 'react'
import { exportData, deleteAccount } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { Download, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    const result = await exportData()
    setExporting(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.csv) {
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'my_movies_export.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Data exported successfully')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteAccount()
    setDeleting(false)

    if (result?.error) {
      toast.error(result.error)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your data and account preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Total Data Control</CardTitle>
            <CardDescription>
              We believe your data belongs to you. You can export your entire media history or permanently delete your account and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium text-lg">Export Data</h3>
                <p className="text-sm text-muted-foreground">Download all your saved movies and TV shows as a CSV file.</p>
              </div>
              <Button onClick={handleExport} disabled={exporting} className="mt-4 sm:mt-0">
                {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export CSV
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
              <div>
                <h3 className="font-medium text-lg text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all your data. This action cannot be undone.</p>
              </div>
              <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className="mt-4 sm:mt-0">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and remove your data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
