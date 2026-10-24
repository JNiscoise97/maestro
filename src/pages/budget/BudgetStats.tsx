import { useMemo, useState } from "react"
import { BarChart3, ChevronDown } from "lucide-react"

import { fmt, fmtCompact, type BudgetModel } from "@/lib/budget-calc"
import { sequenceColor } from "@/lib/sequence-colors"
import { cn } from "@/lib/utils"
import type { BudgetItem } from "@/services/supabase/budget"
import type { Pole } from "@/types/domain"

type Seq = { id: string; name: string; color?: string | null; sortOrder?: number }
type Basis = "estimated" | "real"
type Bucket = { key: string; label: string; color: string; estimated: number; real: number }

/** Couleurs des pôles (les séquences ont déjà la leur, réglée dans Paramètres). */
const POLE_PALETTE = ["#7a272c", "#3f6f48", "#c08a3e", "#2f6f8f", "#9c5b8f", "#d0703c", "#5a6b2e", "#8a5a3c", "#3d5a80", "#b5838d", "#6d597a", "#457b9d", "#a3a380"]
const NO_KEY = "__none__"
const OPEN_KEY = "sj-budget-stats-ouvert"

/**
 * Statistiques du budget, dépliables en haut de la page : répartition par pôle, par séquence et
 * pôle × séquence (estimé et réel), camemberts des parts, et indicateurs utiles au pilotage
 * (engagement, paiements, échéances à venir, dépassements, lignes non décidées, devis en cours).
 * Les montants sont ceux des lignes : postes sans sous-poste et sous-postes.
 */
export function BudgetStats({ items, model, poles, sequences }: {
  items: BudgetItem[]
  model: BudgetModel
  poles: Pole[]
  sequences: Seq[]
}) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(OPEN_KEY) === "1" } catch { return false } })
  const [basis, setBasis] = useState<Basis>("estimated")
  const toggle = () => setOpen((o) => { try { localStorage.setItem(OPEN_KEY, o ? "0" : "1") } catch { /* stockage indisponible */ } return !o })

  const stats = useMemo(() => {
    // Lignes : postes sans sous-poste et sous-postes ; pôle = celui du poste.
    const lines = items.filter((i) => i.parentId || model.children(i.id).length === 0).map((i) => {
      const top = i.parentId ? model.itemsById.get(i.parentId) : i
      const f = model.line(i)
      return { item: i, poleId: top?.poleId ?? null, sequenceId: i.sequenceId, posteLabel: top?.label ?? i.label, ...f }
    })

    const poleColor = new Map(poles.map((p, i) => [p.id, POLE_PALETTE[i % POLE_PALETTE.length]]))
    const byPole = new Map<string, Bucket>()
    const bySeq = new Map<string, Bucket>()
    const cell = new Map<string, { estimated: number; real: number }>()
    for (const l of lines) {
      const pk = l.poleId ?? NO_KEY
      const sk = l.sequenceId ?? NO_KEY
      const pole = poles.find((p) => p.id === l.poleId)
      const seq = sequences.find((s) => s.id === l.sequenceId)
      const pb = byPole.get(pk) ?? { key: pk, label: pole?.name ?? "Sans pôle", color: poleColor.get(pk) ?? "#9ca3af", estimated: 0, real: 0 }
      const sb = bySeq.get(sk) ?? { key: sk, label: seq?.name ?? "Sans séquence", color: seq ? sequenceColor(seq) : "#9ca3af", estimated: 0, real: 0 }
      pb.estimated += l.estimated; pb.real += l.real ?? 0
      sb.estimated += l.estimated; sb.real += l.real ?? 0
      byPole.set(pk, pb); bySeq.set(sk, sb)
      const c = cell.get(`${pk}|${sk}`) ?? { estimated: 0, real: 0 }
      c.estimated += l.estimated; c.real += l.real ?? 0
      cell.set(`${pk}|${sk}`, c)
    }
    const poleOrder = new Map(poles.map((p, i) => [p.id, i]))
    const seqOrder = new Map(sequences.map((s, i) => [s.id, i]))
    const poleBuckets = [...byPole.values()].sort((a, b) => (poleOrder.get(a.key) ?? 99) - (poleOrder.get(b.key) ?? 99))
    const seqBuckets = [...bySeq.values()].sort((a, b) => (seqOrder.get(a.key) ?? 99) - (seqOrder.get(b.key) ?? 99))

    const estimated = lines.reduce((t, l) => t + l.estimated, 0)
    const real = lines.reduce((t, l) => t + (l.real ?? 0), 0)
    const paid = lines.reduce((t, l) => t + l.paid, 0)
    const due = lines.reduce((t, l) => t + (l.real ?? l.estimated), 0)

    // Lignes au-dessus de leur estimation.
    const overruns = lines.filter((l) => l.real != null && l.estimated > 0 && l.real > l.estimated + 0.005)
    // Lignes sans achat décidé : ni devis, ni montant réel, ni versement.
    const undecided = lines.filter((l) => !model.linesByItem.get(l.item.id)?.length && l.real == null && !(model.paymentsByItem.get(l.item.id)?.length))
    // Devis en cours (ni retenus ni refusés).
    const pendingDevis = [...model.devisById.values()].filter((d) => d.status === "en_cours")
    // Acomptes demandés mais pas encore versés.
    const depositsDue = lines.filter((l) => {
      const retained = model.retained.get(l.item.id)
      return (l.item.depositRequired || (!!retained && l.item.depositRequired)) && !l.hasPaidDeposit
    })

    // Échéances à venir : versements non payés, datés, d'un devis retenu ou d'un achat direct.
    const today = new Date().toISOString().slice(0, 10)
    const upcoming = [
      ...[...model.paymentsByDevis.entries()].flatMap(([devisId, list]) => {
        const d = model.devisById.get(devisId)
        if (d?.status !== "retenu") return []
        return list.filter((p) => !p.paid && p.dueDate).map((p) => ({ date: p.dueDate!, amount: p.amount ?? 0, label: d.vendor ?? d.title ?? "Devis", kind: p.kind }))
      }),
      ...[...model.paymentsByItem.entries()].flatMap(([itemId, list]) => {
        const it = model.itemsById.get(itemId)
        return list.filter((p) => !p.paid && p.dueDate).map((p) => ({ date: p.dueDate!, amount: p.amount ?? 0, label: it?.vendor ?? it?.label ?? "Achat", kind: p.kind }))
      }),
    ].sort((a, b) => a.date.localeCompare(b.date))
    const late = upcoming.filter((u) => u.date < today)
    const in30 = upcoming.filter((u) => u.date >= today && u.date <= addDays(today, 30))

    return { poleBuckets, seqBuckets, cell, estimated, real, paid, due, overruns, undecided, pendingDevis, depositsDue, upcoming, late, in30, lineCount: lines.length }
  }, [items, model, poles, sequences])

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <button type="button" onClick={toggle} aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30">
        <BarChart3 className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Statistiques</span>
        <span className="text-xs text-muted-foreground">
          {fmt(stats.estimated)} estimés · {pct(stats.real, stats.estimated)} % engagés · {pct(stats.paid, stats.due)} % payés
        </span>
        <ChevronDown className={cn("ml-auto size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-6 border-t border-border p-4">
          {/* ── Indicateurs ── */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Engagé / estimé" value={`${pct(stats.real, stats.estimated)} %`} sub={`${fmt(stats.real)} sur ${fmt(stats.estimated)}`} progress={pct(stats.real, stats.estimated)} />
            <Metric label="Payé / à payer" value={`${pct(stats.paid, stats.due)} %`} sub={`${fmt(stats.paid)} payés · reste ${fmt(Math.max(0, stats.due - stats.paid))}`} progress={pct(stats.paid, stats.due)} />
            <Metric label="Échéances à 30 jours" value={fmt(stats.in30.reduce((t, u) => t + u.amount, 0))}
              sub={`${stats.in30.length} versement${stats.in30.length > 1 ? "s" : ""}${stats.late.length ? ` · ${stats.late.length} en retard` : ""}`}
              tone={stats.late.length ? "danger" : undefined} />
            <Metric label="Dépassements" value={String(stats.overruns.length)}
              sub={stats.overruns.length ? `+${fmt(stats.overruns.reduce((t, l) => t + ((l.real ?? 0) - l.estimated), 0))} au-dessus de l'estimé` : "aucune ligne au-dessus de l'estimé"}
              tone={stats.overruns.length ? "danger" : "ok"} />
            <Metric label="Achat pas décidé" value={String(stats.undecided.length)}
              sub={`${fmt(stats.undecided.reduce((t, l) => t + l.estimated, 0))} estimés sans devis ni achat`} />
            <Metric label="Devis en cours" value={String(stats.pendingDevis.length)}
              sub={`${fmt(stats.pendingDevis.reduce((t, d) => t + (d.totalAmount ?? model.devisLinesTotal(d.id)), 0))} à arbitrer`} />
            <Metric label="Acomptes à verser" value={String(stats.depositsDue.length)} sub="lignes avec acompte requis non versé"
              tone={stats.depositsDue.length ? "warn" : "ok"} />
            <Metric label="Lignes de budget" value={String(stats.lineCount)} sub={`${stats.poleBuckets.length} pôles · ${stats.seqBuckets.length} séquences`} />
          </div>

          {/* ── Barres par pôle et par séquence ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Chart title="Par pôle (estimé et réel)"><Bars buckets={stats.poleBuckets} /></Chart>
            <Chart title="Par séquence (estimé et réel)"><Bars buckets={stats.seqBuckets} /></Chart>
          </div>

          {/* ── Camemberts ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Parts calculées sur :</span>
              {(["estimated", "real"] as const).map((b) => (
                <button key={b} type="button" onClick={() => setBasis(b)} aria-pressed={basis === b}
                  className={cn("rounded-full border px-3 py-0.5 text-xs font-medium", basis === b ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30")}>
                  {b === "estimated" ? "l'estimé" : "le réel"}
                </button>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Chart title="Part de chaque pôle"><Donut buckets={stats.poleBuckets} basis={basis} /></Chart>
              <Chart title="Part de chaque séquence"><Donut buckets={stats.seqBuckets} basis={basis} /></Chart>
            </div>
          </div>

          {/* ── Pôle × séquence ── */}
          <Chart title="Par séquence dans chaque pôle (estimé / réel)">
            <Matrix poles={stats.poleBuckets} seqs={stats.seqBuckets} cell={stats.cell} />
          </Chart>

          {/* ── Prochaines échéances ── */}
          {(stats.late.length > 0 || stats.upcoming.length > 0) && (
            <Chart title="Prochains versements">
              <ul className="divide-y divide-border text-sm">
                {[...stats.late, ...stats.upcoming.filter((u) => !stats.late.includes(u))].slice(0, 8).map((u, i) => (
                  <li key={i} className="flex items-center gap-3 py-1.5">
                    <span className={cn("w-24 shrink-0 tabular-nums", stats.late.includes(u) ? "font-semibold text-destructive" : "text-muted-foreground")}>
                      {new Date(u.date).toLocaleDateString("fr-FR")}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{u.label} <span className="text-xs text-muted-foreground">· {u.kind}</span></span>
                    <span className="tabular-nums">{fmt(u.amount)}</span>
                  </li>
                ))}
              </ul>
            </Chart>
          )}
        </div>
      )}
    </section>
  )
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function Metric({ label, value, sub, progress, tone }: { label: string; value: string; sub?: string; progress?: number; tone?: "ok" | "warn" | "danger" }) {
  return (
    <div className="space-y-1 rounded-lg border border-border p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold tabular-nums",
        tone === "danger" && "text-destructive", tone === "warn" && "text-amber-600", tone === "ok" && "text-emerald-600 dark:text-emerald-400")}>{value}</p>
      {progress != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Chart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      {children}
    </div>
  )
}

/** Barres horizontales : estimé (clair) et réel (foncé) pour chaque groupe. */
function Bars({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.estimated, b.real)))
  if (!buckets.length) return <p className="text-xs text-muted-foreground">Aucune donnée.</p>
  return (
    <div className="space-y-2">
      {buckets.map((b) => (
        <div key={b.key} className="grid grid-cols-[8.5rem_1fr] items-center gap-2 text-xs sm:grid-cols-[11rem_1fr]">
          <span className="truncate" title={b.label}>
            <span aria-hidden className="mr-1.5 inline-block size-2 rounded-full align-middle" style={{ background: b.color }} />
            {b.label}
          </span>
          <div className="space-y-0.5">
            <Bar width={(b.estimated / max) * 100} color={b.color} opacity={0.35} value={b.estimated} title="Estimé" />
            <Bar width={(b.real / max) * 100} color={b.color} opacity={1} value={b.real} title="Réel" />
          </div>
        </div>
      ))}
      <p className="flex gap-4 pl-[9rem] text-[11px] text-muted-foreground sm:pl-[11.5rem]">
        <span><span className="mr-1 inline-block h-2 w-3 rounded-sm bg-foreground/30 align-middle" />Estimé</span>
        <span><span className="mr-1 inline-block h-2 w-3 rounded-sm bg-foreground align-middle" />Réel</span>
      </p>
    </div>
  )
}

function Bar({ width, color, opacity, value, title }: { width: number; color: string; opacity: number; value: number; title: string }) {
  return (
    <div className="flex items-center gap-2" title={`${title} : ${fmt(value)}`}>
      <div className="h-2.5 rounded-sm" style={{ width: `${Math.max(width, value > 0 ? 1 : 0)}%`, background: color, opacity }} />
      <span className="shrink-0 tabular-nums text-muted-foreground">{value > 0 ? fmtCompact(value) : "—"}</span>
    </div>
  )
}

/** Camembert (anneau) avec légende et pourcentages. */
function Donut({ buckets, basis }: { buckets: Bucket[]; basis: Basis }) {
  const data = buckets.map((b) => ({ ...b, value: basis === "estimated" ? b.estimated : b.real })).filter((b) => b.value > 0)
  const total = data.reduce((t, d) => t + d.value, 0)
  if (!total) return <p className="text-xs text-muted-foreground">Aucun montant {basis === "real" ? "réel" : "estimé"} pour l'instant.</p>
  const R = 60, r = 36, C = 70
  // Angle de départ de chaque part = somme des parts précédentes.
  const starts = data.map((_, i) => data.slice(0, i).reduce((t, d) => t + d.value, 0))
  const arcs = data.map((d, i) => {
    const start = -Math.PI / 2 + (starts[i] / total) * Math.PI * 2
    const end = start + (d.value / total) * Math.PI * 2
    return { ...d, path: arcPath(C, C, R, r, start, end), pct: (d.value / total) * 100 }
  })
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg viewBox="0 0 140 140" className="size-36 shrink-0" role="img" aria-label="Répartition en pourcentage">
        {arcs.map((a) => <path key={a.key} d={a.path} fill={a.color}><title>{`${a.label} : ${a.pct.toFixed(1)} % (${fmt(a.value)})`}</title></path>)}
        <text x={C} y={C - 2} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">{fmtCompact(total)}</text>
        <text x={C} y={C + 12} textAnchor="middle" className="fill-muted-foreground text-[8px]">{basis === "estimated" ? "estimé" : "réel"}</text>
      </svg>
      <ul className="w-full space-y-1 text-xs">
        {arcs.sort((a, b) => b.value - a.value).map((a) => (
          <li key={a.key} className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: a.color }} />
            <span className="min-w-0 flex-1 truncate">{a.label}</span>
            <span className="w-12 text-right font-semibold tabular-nums">{a.pct.toFixed(a.pct < 10 ? 1 : 0)} %</span>
            <span className="w-16 text-right tabular-nums text-muted-foreground">{fmtCompact(a.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function arcPath(cx: number, cy: number, R: number, r: number, a0: number, a1: number): string {
  // Cercle complet (une seule part) : deux demi-arcs.
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    return `M ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} Z M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`
  }
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p = (rad: number, a: number) => `${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}`
  return `M ${p(R, a0)} A ${R} ${R} 0 ${large} 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 ${large} 0 ${p(r, a0)} Z`
}

/** Tableau pôle × séquence : estimé / réel par case, teinte selon l'estimé. */
function Matrix({ poles, seqs, cell }: { poles: Bucket[]; seqs: Bucket[]; cell: Map<string, { estimated: number; real: number }> }) {
  const max = Math.max(1, ...[...cell.values()].map((c) => c.estimated))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="sticky left-0 bg-card px-2 py-1.5 text-left font-medium">Pôle</th>
            {seqs.map((s) => (
              <th key={s.key} className="px-2 py-1.5 text-right font-medium">
                <span aria-hidden className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: s.color }} />{s.label}
              </th>
            ))}
            <th className="px-2 py-1.5 text-right font-semibold text-foreground">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {poles.map((p) => (
            <tr key={p.key}>
              <td className="sticky left-0 bg-card px-2 py-1.5 font-medium">{p.label}</td>
              {seqs.map((s) => {
                const c = cell.get(`${p.key}|${s.key}`)
                return (
                  <td key={s.key} className="px-2 py-1.5 text-right tabular-nums"
                    style={c ? { background: `color-mix(in srgb, ${p.color} ${Math.round((c.estimated / max) * 35)}%, transparent)` } : undefined}
                    title={c ? `${p.label} · ${s.label}\nEstimé : ${fmt(c.estimated)}\nRéel : ${fmt(c.real)}` : undefined}>
                    {c ? <>{fmtCompact(c.estimated)}<br /><span className="text-muted-foreground">{c.real ? fmtCompact(c.real) : "—"}</span></> : <span className="text-muted-foreground/40">·</span>}
                  </td>
                )
              })}
              <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{fmtCompact(p.estimated)}<br /><span className="font-normal text-muted-foreground">{p.real ? fmtCompact(p.real) : "—"}</span></td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="sticky left-0 bg-card px-2 py-1.5">Total</td>
            {seqs.map((s) => (
              <td key={s.key} className="px-2 py-1.5 text-right tabular-nums">{fmtCompact(s.estimated)}<br /><span className="font-normal text-muted-foreground">{s.real ? fmtCompact(s.real) : "—"}</span></td>
            ))}
            <td className="px-2 py-1.5 text-right tabular-nums">
              {fmtCompact(poles.reduce((t, p) => t + p.estimated, 0))}<br />
              <span className="font-normal text-muted-foreground">{fmtCompact(poles.reduce((t, p) => t + p.real, 0))}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-muted-foreground">Dans chaque case : estimé en haut, réel en dessous. Plus la case est foncée, plus l'estimé est élevé.</p>
    </div>
  )
}
