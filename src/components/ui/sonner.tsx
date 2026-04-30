"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      richColors
      expand
      icons={{
        success: (
          <CircleCheckIcon className="size-6" />
        ),
        info: (
          <InfoIcon className="size-6" />
        ),
        warning: (
          <TriangleAlertIcon className="size-6" />
        ),
        error: (
          <OctagonXIcon className="size-6" />
        ),
        loading: (
          <Loader2Icon className="size-6 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast text-base p-4 shadow-xl border-2 font-medium",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
