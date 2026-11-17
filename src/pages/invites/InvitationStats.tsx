import { useState } from "react"
import { BarChart3, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Statistiques de l'invitation en ligne, dépliables en haut de l'onglet (même présentation que le budget) :
 * indicateurs, réponses par moment, conviés et personnes annoncées par moment, parts (réponses, listes, côtés)
 * et arrivée des réponses jusqu'à la date limite.
 */

export type MomentStat = {
  id: string; title: string; day: string; color: string; limited: boolean
  invited: number; yes: number; no: number; unsure: number; pending: number
  /** Personnes annoncées « oui » et « je ne sais pas encore » à ce moment. */
  people: number; maybe: number
}
export type Slice = { key: string; label: string; color: string; value: number }
export type SideStat = { key: string; label: string; yes: number; no: number; unsure: number; pending: number }

const STATUS_COLORS = { yes: "#3f8f5a", no: "#9ca3af", unsure: "#5b8fc9", pending: "#d9a441" }
const STATUS_KEYS = ["yes", "no", "unsure", "pending"] as const
const OPEN_KEY = "sj-invitation-stats-ouvert"

export function InvitationStats({ totals, moments, byList, bySide, responseDates, deadline }: {
  totals: { invited: number; yes: number; no: number; unsure: number; pending: number; people: number; under10: number; responses: number }
  moments: MomentStat[]
  byList: Slice[]
  bySide: SideStat[]
  /** Date (AAAA-MM-JJ) de chaque réponse retenue. */
  responseDates: string[]
  /** Date limite de réponse (AAAA-MM-JJ). */
  deadline: string
}) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(OPEN_KEY) !== "0" } catch { return true } })
  const toggle = () => setOpen((o) => { try { localStorage.setItem(OPEN_KEY, o ? "0" : "1") } catch { /* stockage indisponible */ } return !o })
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
  const answered = totals.yes + totals.no + totals.unsure
  const limited = moments.filter((m) => m.limited)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button type="button" onClick={toggle} aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30">
        <BarChart3 className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Statistiques</span>
        <span className="text-xs text-muted-foreground">
          {totals.invited} conviés · {pct(answered, totals.invited)} % de réponses · {totals.people} personnes annoncées
        </span>
        <ChevronDown className={cn("ml-auto size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-6 border-t border-border p-4">
          {/* ── Indicateurs ── */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Metric label="Taux de réponse" value={`${pct(answered, totals.invited)} %`} progress={pct(answered, totals.invited)}
              sub={`${answered} invités sur ${totals.invited} · ${totals.responses} formulaire${totals.responses > 1 ? "s" : ""}`} />
            <Metric label="Présents" value={String(totals.yes)} tone="ok" sub={`${pct(totals.yes, answered)} % des réponses`} />
            <Metric label="Absents" value={String(totals.no)} sub={`${pct(totals.no, answered)} % des réponses`} />
            <Metric label="Ne savent pas encore" value={String(totals.unsure)} tone={totals.unsure ? "info" : undefined} sub="à relancer plus tard" />
            <Metric label="Personnes annoncées" value={String(totals.people)}
              sub={totals.under10 ? `dont ${totals.under10} de moins de 10 ans` : "toutes réponses « oui » ou « je ne sais pas »"} />
            <Metric label="Sans réponse" value={String(totals.pending)} tone={totals.pending ? "warn" : "ok"}
              sub={`date limite : ${new Date(`${deadline}T00:00:00`).toLocaleDateString("fr-FR")}`} />
          </div>

          {/* ── Réponses par moment ── */}
          <Chart title="Réponses par moment" legend={<StatusLegend />}>
            <StackedBars moments={moments} />
          </Chart>

          {/* ── Conviés et personnes annoncées ── */}
          <Chart title="Conviés et personnes annoncées par moment"
            legend={<span className="text-[11px] text-muted-foreground">clair : conviés · foncé : personnes annoncées « oui » · + : « je ne sais pas encore »</span>}>
            <PairBars moments={moments} />
          </Chart>
          {limited.length > 0 && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Moments à places limitées :{" "}
              {limited.map((m, i) => (
                <span key={m.id}>
                  <b className="text-foreground">{m.title}</b> {m.people} annoncée{m.people > 1 ? "s" : ""}{m.maybe ? ` (+${m.maybe} ?)` : ""} pour {m.invited} conviés
                  {m.pending ? ` (${m.pending} en attente)` : ""}{i < limited.length - 1 ? " · " : "."}
                </span>
              ))}
            </p>
          )}

          {/* ── Parts ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Chart title="Répartition des réponses">
              <Donut center="conviés" slices={[
                { key: "yes", label: "Oui", color: STATUS_COLORS.yes, value: totals.yes },
                { key: "no", label: "Non", color: STATUS_COLORS.no, value: totals.no },
                { key: "unsure", label: "Ne sait pas encore", color: STATUS_COLORS.unsure, value: totals.unsure },
                { key: "pending", label: "Sans réponse", color: STATUS_COLORS.pending, value: totals.pending },
              ]} />
            </Chart>
            <Chart title="Conviés par liste"><Donut center="conviés" slices={byList} /></Chart>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {bySide.length > 0 && (
              <Chart title="Réponses par côté" legend={<StatusLegend />}>
                <SideBars sides={bySide} />
              </Chart>
            )}
            <Chart title="Arrivée des réponses">
              <Timeline dates={responseDates} deadline={deadline} total={totals.invited} />
            </Chart>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Briques ───────────────────────────────────────────────────────────────────

function Metric({ label, value, sub, progress, tone }: { label: string; value: string; sub?: string; progress?: number; tone?: "ok" | "warn" | "info" }) {
  return (
    <div className="space-y-1 rounded-lg border border-border p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold tabular-nums", tone === "warn" && "text-amber-600", tone === "info" && "text-sky-700 dark:text-sky-400", tone === "ok" && "text-emerald-600 dark:text-emerald-400")}>{value}</p>
      {progress != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Chart({ title, legend, children }: { title: string; legend?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        {legend}
      </div>
      {children}
    </div>
  )
}

function StatusLegend() {
  return (
    <span className="flex gap-3 text-[11px] text-muted-foreground">
      {([["yes", "Oui"], ["no", "Non"], ["unsure", "Ne sait pas"], ["pending", "Sans réponse"]] as const).map(([k, l]) => (
        <span key={k} className="flex items-center gap-1">
          <span aria-hidden className="size-2.5 rounded-sm" style={{ background: STATUS_COLORS[k] }} />{l}
        </span>
      ))}
    </span>
  )
}

function MomentLabel({ m }: { m: MomentStat }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: m.color }} />
      <span className="truncate">{m.title}</span>
      {m.limited && <span className="shrink-0 text-[10px] text-muted-foreground" title="Places limitées">◆</span>}
    </span>
  )
}

/** Une barre par moment, découpée en oui / non / sans réponse, longueur proportionnelle aux conviés. */
function StackedBars({ moments }: { moments: MomentStat[] }) {
  const max = Math.max(1, ...moments.map((m) => m.invited))
  return (
    <div className="space-y-1.5 text-xs">
      {moments.map((m) => (
        <div key={m.id} className="grid grid-cols-[minmax(7rem,12rem)_1fr_3rem] items-center gap-2">
          <MomentLabel m={m} />
          <div className="flex h-3.5 overflow-hidden rounded-sm bg-muted/40" style={{ width: `${(m.invited / max) * 100}%`, minWidth: m.invited ? 4 : 0 }}
            title={`${m.title} : ${m.yes} oui, ${m.no} non, ${m.unsure} ne savent pas, ${m.pending} sans réponse`}>
            {STATUS_KEYS.map((k) => m[k] > 0 && (
              <span key={k} style={{ width: `${(m[k] / m.invited) * 100}%`, background: STATUS_COLORS[k] }} />
            ))}
          </div>
          <span className="text-right tabular-nums text-muted-foreground">{m.invited || "—"}</span>
        </div>
      ))}
    </div>
  )
}

/** Conviés (clair) et personnes annoncées (foncé), couleur de la séquence. */
function PairBars({ moments }: { moments: MomentStat[] }) {
  const max = Math.max(1, ...moments.map((m) => Math.max(m.invited, m.people)))
  return (
    <div className="space-y-2 text-xs">
      {moments.map((m) => (
        <div key={m.id} className="grid grid-cols-[minmax(7rem,12rem)_1fr] items-center gap-2">
          <MomentLabel m={m} />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2" title={`${m.title} : ${m.invited} conviés`}>
              <div className="h-2.5 rounded-sm" style={{ width: `${Math.max((m.invited / max) * 100, m.invited ? 1 : 0)}%`, background: m.color, opacity: 0.35 }} />
              <span className="shrink-0 tabular-nums text-muted-foreground">{m.invited || "—"}</span>
            </div>
            <div className="flex items-center gap-2" title={`${m.title} : ${m.people} personnes annoncées, ${m.maybe} ne savent pas encore`}>
              <div className="flex h-2.5" style={{ width: `${Math.max(((m.people + m.maybe) / max) * 100, m.people + m.maybe ? 1 : 0)}%` }}>
                {m.people > 0 && <span className="h-full rounded-l-sm" style={{ width: `${(m.people / (m.people + m.maybe)) * 100}%`, background: m.color }} />}
                {m.maybe > 0 && <span className="h-full rounded-r-sm" style={{ width: `${(m.maybe / (m.people + m.maybe)) * 100}%`, background: `repeating-linear-gradient(45deg, ${m.color} 0 2px, transparent 2px 4px)` }} />}
              </div>
              <span className="shrink-0 tabular-nums text-muted-foreground">{m.people || "—"}{m.maybe ? ` +${m.maybe} ?` : ""}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SideBars({ sides }: { sides: SideStat[] }) {
  return (
    <div className="space-y-1.5 text-xs">
      {sides.map((s) => {
        const total = s.yes + s.no + s.unsure + s.pending
        return (
          <div key={s.key} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-2">
            <span className="truncate">{s.label}</span>
            <div className="flex h-3.5 overflow-hidden rounded-sm bg-muted/40" title={`${s.label} : ${s.yes} oui, ${s.no} non, ${s.unsure} ne savent pas, ${s.pending} sans réponse`}>
              {STATUS_KEYS.map((k) => s[k] > 0 && (
                <span key={k} style={{ width: `${(s[k] / total) * 100}%`, background: STATUS_COLORS[k] }} />
              ))}
            </div>
            <span className="text-right tabular-nums text-muted-foreground">{total}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Camembert (anneau) avec légende et pourcentages. */
function Donut({ slices, center }: { slices: Slice[]; center: string }) {
  const data = slices.filter((s) => s.value > 0)
  const total = data.reduce((t, d) => t + d.value, 0)
  if (!total) return <p className="text-xs text-muted-foreground">Aucune donnée pour l'instant.</p>
  const R = 60, r = 36, C = 70
  const starts = data.map((_, i) => data.slice(0, i).reduce((t, d) => t + d.value, 0))
  const arcs = data.map((d, i) => {
    const start = -Math.PI / 2 + (starts[i] / total) * Math.PI * 2
    const end = start + (d.value / total) * Math.PI * 2
    return { ...d, path: arcPath(C, C, R, r, start, end), pct: (d.value / total) * 100 }
  })
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg viewBox="0 0 140 140" className="size-36 shrink-0" role="img" aria-label="Répartition en pourcentage">
        {arcs.map((a) => <path key={a.key} d={a.path} fill={a.color}><title>{`${a.label} : ${a.value} (${a.pct.toFixed(1)} %)`}</title></path>)}
        <text x={C} y={C - 2} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">{total}</text>
        <text x={C} y={C + 12} textAnchor="middle" className="fill-muted-foreground text-[8px]">{center}</text>
      </svg>
      <ul className="w-full space-y-1 text-xs">
        {arcs.map((a) => (
          <li key={a.key} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: a.color }} />
            <span className="min-w-0 flex-1 truncate">{a.label}</span>
            <span className="w-12 text-right font-semibold tabular-nums">{a.pct.toFixed(a.pct < 10 ? 1 : 0)} %</span>
            <span className="w-10 text-right tabular-nums text-muted-foreground">{a.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function arcPath(cx: number, cy: number, R: number, r: number, a0: number, a1: number): string {
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    return `M ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} Z M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`
  }
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p = (rad: number, a: number) => `${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}`
  return `M ${p(R, a0)} A ${R} ${R} 0 ${large} 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 ${large} 0 ${p(r, a0)} Z`
}

/** Courbe cumulée des invités ayant répondu, jusqu'à la date limite (ligne verticale). */
function Timeline({ dates, deadline, total }: { dates: string[]; deadline: string; total: number }) {
  if (!dates.length) return <p className="text-xs text-muted-foreground">Aucune réponse pour l'instant.</p>
  const day = (iso: string) => Math.floor(new Date(`${iso}T00:00:00`).getTime() / 86_400_000)
  const sorted = [...dates].sort()
  const start = day(sorted[0])
  const today = day(new Date().toISOString().slice(0, 10))
  const end = Math.max(day(deadline), today, start + 1)
  const W = 320, H = 120, P = { l: 28, r: 8, t: 8, b: 18 }
  const max = Math.max(total, sorted.length, 1)
  const x = (d: number) => P.l + ((d - start) / (end - start)) * (W - P.l - P.r)
  const y = (n: number) => H - P.b - (n / max) * (H - P.t - P.b)
  // Points en escalier : un palier par jour de réponse.
  const counts = new Map<number, number>()
  for (const d of sorted) counts.set(day(d), (counts.get(day(d)) ?? 0) + 1)
  let cum = 0
  const pts: [number, number][] = [[x(start), y(0)]]
  for (const [d, n] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
    pts.push([x(d), y(cum)])
    cum += n
    pts.push([x(d), y(cum)])
  }
  pts.push([x(Math.min(today, end)), y(cum)])
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"} ${px.toFixed(1)} ${py.toFixed(1)}`).join(" ")
  const fmt = (d: number) => new Date(d * 86_400_000).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-md" role="img"
      aria-label={`${cum} réponses reçues sur ${total} conviés, date limite le ${fmt(day(deadline))}`}>
      <line x1={P.l} x2={W - P.r} y1={y(total)} y2={y(total)} stroke="currentColor" className="text-muted-foreground/30" strokeDasharray="3 3" />
      <text x={P.l - 4} y={y(total) + 3} textAnchor="end" className="fill-muted-foreground text-[8px]">{total}</text>
      <text x={P.l - 4} y={y(0) + 3} textAnchor="end" className="fill-muted-foreground text-[8px]">0</text>
      <line x1={x(day(deadline))} x2={x(day(deadline))} y1={P.t} y2={H - P.b} stroke={STATUS_COLORS.pending} strokeDasharray="2 2" />
      <text x={x(day(deadline))} y={H - 6} textAnchor="end" className="fill-muted-foreground text-[8px]">limite {fmt(day(deadline))}</text>
      <text x={P.l} y={H - 6} className="fill-muted-foreground text-[8px]">{fmt(start)}</text>
      <path d={`${line} L ${pts[pts.length - 1][0].toFixed(1)} ${y(0).toFixed(1)} L ${x(start)} ${y(0)} Z`} fill={STATUS_COLORS.yes} opacity={0.12} />
      <path d={line} fill="none" stroke={STATUS_COLORS.yes} strokeWidth={1.5} />
      <text x={pts[pts.length - 1][0] + 3} y={y(cum) - 3} className="fill-foreground text-[9px] font-semibold">{cum}</text>
    </svg>
  )
}
