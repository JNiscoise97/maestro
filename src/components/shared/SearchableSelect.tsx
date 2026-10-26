import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

export type SearchableOption = { value: string; label: string; group?: string; hint?: string }

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

/**
 * Liste déroulante avec recherche (« select intelligent ») : on tape quelques lettres, sans se soucier
 * des accents ni des majuscules ; les options restent regroupées (ex. par pôle).
 */
export function SearchableSelect({ value, options, onChange, placeholder = "Choisir…", searchPlaceholder = "Rechercher…", empty = "Aucun résultat.", className, ariaLabel, clearable = true }: {
  value: string | null
  options: SearchableOption[]
  onChange: (value: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  empty?: string
  className?: string
  ariaLabel?: string
  clearable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const groups = [...new Set(options.map((o) => o.group ?? ""))]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" role="combobox" aria-expanded={open} aria-label={ariaLabel}
          className={cn("flex h-8 w-full min-w-0 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-left text-xs transition-colors hover:border-foreground/30", className)}>
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>
            {selected ? <>{selected.label}{selected.group && <span className="text-muted-foreground"> · {selected.group}</span>}</> : placeholder}
          </span>
          {clearable && selected && (
            <span role="button" tabIndex={-1} aria-label="Effacer" className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onChange(null) }}>
              <X className="size-3" />
            </span>
          )}
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0" align="start">
        <Command filter={(itemValue, search, keywords) => {
          const hay = norm([itemValue, ...(keywords ?? [])].join(" "))
          return norm(search).split(/\s+/).filter(Boolean).every((w) => hay.includes(w)) ? 1 : 0
        }}>
          <CommandInput placeholder={searchPlaceholder} className="text-base sm:text-sm" />
          <CommandList className="max-h-72">
            <CommandEmpty>{empty}</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g || "_"} heading={g || undefined}>
                {options.filter((o) => (o.group ?? "") === g).map((o) => (
                  <CommandItem key={o.value} value={o.value} keywords={[o.label, o.group ?? "", o.hint ?? ""]}
                    onSelect={() => { onChange(o.value); setOpen(false) }}>
                    <Check className={cn("size-3.5", o.value === value ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="shrink-0 text-[11px] text-muted-foreground">{o.hint}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
