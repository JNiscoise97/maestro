import type { ReactNode } from "react"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { Toaster } from "@/components/ui/sonner"
import { IdentityProvider } from "@/context/IdentityContext"
import { EventConfigProvider } from "@/context/EventConfigContext"
import { useRealtimeSync } from "@/hooks/use-realtime-sync"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

/** Mises à jour en direct depuis la base (Supabase Realtime). */
function RealtimeSync() {
  useRealtimeSync()
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSync />
      <BrowserRouter>
        <IdentityProvider>
          <EventConfigProvider>
            {children}
            <Toaster position="top-center" richColors />
          </EventConfigProvider>
        </IdentityProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
