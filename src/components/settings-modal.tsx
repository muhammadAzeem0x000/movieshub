'use client'

import { useState } from 'react'
import { exportData, deleteAccount } from '@/app/settings/actions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Download, AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"

export function SettingsModal() {
  const [isOpen, setIsOpen] = useState(false)
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
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) setIsDeleteDialogOpen(false)
    }}>
      <DialogTrigger render={<button className="text-sm font-medium text-muted-foreground hover:text-foreground bg-transparent border-none p-0 cursor-pointer" />}>
        Settings
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your data and account preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium text-lg">Export Data</h3>
              <p className="text-sm text-muted-foreground">Download all your saved media as a CSV file.</p>
            </div>
            <Button onClick={handleExport} disabled={exporting} className="mt-4 sm:mt-0">
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export CSV
            </Button>
          </div>

          {!isDeleteDialogOpen ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
              <div>
                <h3 className="font-medium text-lg text-destructive">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all data.</p>
              </div>
              <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className="mt-4 sm:mt-0">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          ) : (
             <div className="p-4 border border-destructive bg-destructive/10 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                <h3 className="font-bold text-destructive">Are you absolutely sure?</h3>
                <p className="text-sm mt-1 mb-4 text-muted-foreground">This action cannot be undone. This will permanently delete your account and remove your data from our servers.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Yes, delete my account
                  </Button>
                </div>
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
