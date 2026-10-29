import { Fragment, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { useSetBudgetReview } from "@/hooks/queries/use-budget"
import { PRIORITY_COLORS, PRIORITY_SHORT, effectivePriority, fmt, lineMatches, type BudgetModel } from "@/lib/budget-calc"
import {
  REVIEW_MAX, REVIEW_QUESTIONS, VERDICT_HINTS, VERDICT_LABELS, costPerPoint, effectiveReview, reviewAmount,
  reviewComplete, reviewTotal, reviewVerdict, type ReviewVerdict,
} from "@/lib/budget-review"
import type { BudgetItem, ReviewKey, ReviewScores } from "@/services/supabase/budget"
import type { Pole } from "@/types/domain"
import { cn } from "@/lib/utils"
import { SequenceDot } from "@/components/shared/SequenceName"

type Seq = { id: string; name: string; color?: string | null; sortOrder?: number }
type Sort = "cost" | "score" | "amount" | "budget"
type Filter = "all" | ReviewVerdict

const VERDICT_STYLES: Record<ReviewVerdict, string> = {
  a_couper: "bg-bordeaux/10 text-bordeaux",
  a_challenger: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  sous_estime: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  protege: "bg-vert-vegetal/15 text-vert-vegetal",
  ok: "bg-muted text-muted-foreground",
  a_noter: "border border-dashed border-border text-muted-foreground",
}

const FILTERS: Filter[] = ["all", "a_noter", "a_couper", "a_challenger", "sous_estime", "protege", "ok"]

/**
 * Seconde passe d'arbitrage : chaque ligne (poste simple ou sous-poste) est notée sur 6 questions
 * (0 = non, 1 = un peu, 2 = oui), puis croisée avec sa priorité MoSCoW et rapportée à son montant.
 */
export function ReviewTab({ items, model, poles, sequences }: {
  items: BudgetItem[]
  model: BudgetModel
  poles: Pole[]
  sequences: Seq[]
}) {
  const setReview = useSetBudgetReview()
  const [filter, setFilter] = useState<Filter>("all")
  const [sort, setSort] = useState<Sort>("cost")
  const [search, setSearch] = useState("")
  const [grouped, setGrouped] = useState(true)
  const [guestOnly, setGuestOnly] = useState(false)
  const [diyOnly, setDiyOnly] = useState(false)
  // Groupes repliés : « s:<séquence> » et « p:<séquence>:<pôle> » (tout déplié par défaut).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (key: string) => setCollapsed((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })

  // Lignes notables, dans l'ordre du budget (pôle, puis poste, puis sous-poste). Les lignes « incluses » valent 0 € : exclues.
  const lines = useMemo(() => {
    const poleOrder = new Map(poles.map((p, i) => [p.id, i]))
    return items
      .filter((i) => !i.parentId)
      .sort((a, b) => (poleOrder.get(a.poleId ?? "") ?? Infinity) - (poleOrder.get(b.poleId ?? "") ?? Infinity) || a.sortOrder - b.sortOrder)
      .flatMap((p) => model.leaves(p))
      .filter((l) => l.amountStatus !== "included")
      .map((l, index) => {
        const review = effectiveReview(model, l)
        const total = review ? reviewTotal(review.scores) : null
        const amount = reviewAmount(model, l)
        const top = l.parentId ? model.itemsById.get(l.parentId) : l
        return {
          item: l, index, review, total, amount,
          perPoint: total == null ? null : costPerPoint(amount, total),
          verdict: reviewVerdict(model, l),
          priority: effectivePriority(model, l),
          poleId: top?.poleId ?? null,
          pole: poles.find((p) => p.id === top?.poleId)?.name ?? "Sans pôle",
          sequenceId: l.sequenceId,
          sequence: sequences.find((s) => s.id === l.sequenceId)?.name ?? "Sans séquence",
        }
      })
  }, [items, model, poles, sequences])

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((f) => [f, 0])) as Record<Filter, number>
    for (const l of lines) { c[l.verdict]++; c.all++ }
    return c
  }, [lines])
  const sumOf = (v: ReviewVerdict) => lines.filter((l) => l.verdict === v).reduce((t, l) => t + l.amount, 0)
  const rated = lines.length - counts.a_noter

  const shown = lines
    .filter((l) => filter === "all" || l.verdict === filter)
    .filter((l) => (!guestOnly || l.item.guestDependent) && (!diyOnly || l.item.diyPossible))
    .filter((l) => !search.trim() || lineMatches(l.item, search)
      || (l.item.parentId != null && lineMatches(model.itemsById.get(l.item.parentId)!, search)))
    .sort((a, b) => {
      if (sort === "budget") return a.index - b.index
      if (sort === "amount") return b.amount - a.amount
      // Lignes non notées en fin de liste pour les tris par note.
      if (a.total == null || b.total == null) return (a.total == null ? 1 : 0) - (b.total == null ? 1 : 0) || a.index - b.index
      if (sort === "score") return a.total - b.total || b.amount - a.amount
      return (b.perPoint ?? 0) - (a.perPoint ?? 0) || b.amount - a.amount
    })

  // Regroupement séquence → pôle (ordre des Paramètres) ; le tri choisi s'applique dans chaque groupe.
  const groups = useMemo(() => {
    if (!grouped) return [{ key: "all", title: null as string | null, seq: null as Seq | null, poles: [{ key: "all", title: null as string | null, rows: shown }] }]
    const seqIds = [...sequences.map((x) => x.id as string | null), null]
    const poleIds = [...poles.map((x) => x.id as string | null), null]
    return seqIds
      .map((sid) => {
        const inSeq = shown.filter((l) => (l.sequenceId ?? null) === sid)
        return {
          key: sid ?? "none",
          title: sid ? sequences.find((x) => x.id === sid)?.name ?? "Séquence" : "Sans séquence",
          seq: sid ? sequences.find((x) => x.id === sid) ?? null : null,
          poles: poleIds
            .map((pid) => ({
              key: pid ?? "none",
              title: pid ? poles.find((x) => x.id === pid)?.name ?? "Pôle" : "Sans pôle",
              rows: inSeq.filter((l) => (l.poleId ?? null) === pid),
            }))
            .filter((g) => g.rows.length),
        }
      })
      .filter((g) => g.poles.length)
  }, [grouped, shown, sequences, poles])
  const colCount = REVIEW_QUESTIONS.length + 9
  const sum = (rows: typeof shown) => rows.reduce((t, l) => t + l.amount, 0)

  function setScore(line: (typeof lines)[number], key: ReviewKey, value: 0 | 1 | 2) {
    // Un sous-poste qui reprenait les notes de son poste reçoit ses propres notes (copie, puis modification).
    const base: ReviewScores = { ...(line.review?.scores ?? {}) }
    if (!line.review?.inherited && base[key] === value) delete base[key]
    else base[key] = value
    setReview.mutate({ id: line.item.id, patch: { reviewScores: Object.keys(base).length ? base : null } },
      { onError: () => toast.error("Note non enregistrée.") })
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30"}`

  return (
    <div className="space-y-4">
      <details className="rounded-xl border border-border bg-card p-4 text-sm" open={rated === 0}>
        <summary className="cursor-pointer font-medium">Les 6 questions et la méthode</summary>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {REVIEW_QUESTIONS.map((q, i) => (
            <li key={q.key}>
              <b>{i + 1}. {q.short}</b> — {q.question}
              <span className="block text-xs text-muted-foreground">{q.hint}</span>
            </li>
          ))}
        </ol>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Chaque question : 0 = non, 1 = un peu, 2 = oui (cliquer à nouveau sur la note l'efface). Total sur {REVIEW_MAX}.</li>
          <li>Un sous-poste non noté reprend les notes de son poste (en italique) ; le modifier lui donne ses propres notes.</li>
          <li>Croisement avec le MoSCoW : {(["a_couper", "a_challenger", "sous_estime", "protege"] as ReviewVerdict[]).map((v) => `${VERDICT_LABELS[v]} = ${VERDICT_HINTS[v]}`).join(" ")}</li>
          <li>Le tri « € par point » fait remonter les grosses dépenses qui rapportent peu : c'est là que sont les vraies économies.</li>
          <li>Astuce : notez chacun de votre côté sur papier, puis saisissez la note discutée ensemble ; les écarts sont les sujets à arbitrer.</li>
        </ul>
      </details>

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Lignes notées" value={`${rated} / ${lines.length}`} />
        <Metric label="À couper (Could, note faible)" value={fmt(sumOf("a_couper"))} sub={`${counts.a_couper} ligne(s)`} tone="text-bordeaux" />
        <Metric label="Must à challenger" value={fmt(sumOf("a_challenger"))} sub={`${counts.a_challenger} ligne(s)`} tone="text-amber-700 dark:text-amber-400" />
        <Metric label="Must sous-estimés ?" value={String(counts.sous_estime)} sub="Should / Could avec une note forte" tone="text-sky-700 dark:text-sky-400" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={chip(filter === f)} onClick={() => setFilter(f)} title={f === "all" ? undefined : VERDICT_HINTS[f]}>
            {f === "all" ? "Toutes" : VERDICT_LABELS[f]} ({counts[f]})
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        <button type="button" className={chip(guestOnly)} onClick={() => setGuestOnly((v) => !v)} title="Lignes dont le montant dépend du nombre d'invités">
          % invités ({lines.filter((l) => l.item.guestDependent).length})
        </button>
        <button type="button" className={chip(diyOnly)} onClick={() => setDiyOnly((v) => !v)} title="Lignes qu'on pourrait faire nous-mêmes">
          DIY envisageable ({lines.filter((l) => l.item.diyPossible).length})
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input className="h-8 max-w-xs text-base sm:text-sm" placeholder="Rechercher une ligne…" value={search}
          onChange={(e) => setSearch(e.target.value)} aria-label="Rechercher une ligne" />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Trier par
          <select className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="cost">€ par point (le moins rentable d'abord)</option>
            <option value="score">Note (la plus faible d'abord)</option>
            <option value="amount">Montant (le plus élevé d'abord)</option>
            <option value="budget">Ordre du budget</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
          Regrouper par séquence puis par pôle
        </label>
        {grouped && (
          <div className="flex gap-1.5">
            <button type="button" className={chip(false)} onClick={() => setCollapsed(new Set())}>
              <ChevronsUpDown className="mr-1 inline size-3.5" />Tout déplier
            </button>
            <button type="button" className={chip(false)}
              onClick={() => setCollapsed(new Set(groups.map((g) => `s:${g.key}`)))}>
              <ChevronsDownUp className="mr-1 inline size-3.5" />Replier les séquences
            </button>
            <button type="button" className={chip(false)}
              onClick={() => setCollapsed(new Set(groups.flatMap((g) => g.poles.map((pg) => `p:${g.key}:${pg.key}`))))}>
              <ChevronsDownUp className="mr-1 inline size-3.5" />Replier les pôles
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Ligne</th>
              <th className="px-2 py-2">Prio.</th>
              <th className="px-2 py-2 text-right">Montant</th>
              {REVIEW_QUESTIONS.map((q) => <th key={q.key} className="px-1 py-2 text-center" title={q.question}>{q.short}</th>)}
              <th className="px-2 py-2 text-right">Note</th>
              <th className="px-2 py-2 text-right">€ / point</th>
              <th className="px-2 py-2">Verdict</th>
              <th className="px-1 py-2 text-center" title="Le montant dépend du nombre d'invités">% invités</th>
              <th className="px-1 py-2 text-center" title="On pourrait le faire nous-mêmes">DIY</th>
              <th className="px-3 py-2">Remarque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groups.map((g) => (
              <Fragment key={g.key}>
                {g.title && (
                  <tr className="cursor-pointer bg-muted/60 hover:bg-muted" onClick={() => toggle(`s:${g.key}`)}
                    aria-expanded={!collapsed.has(`s:${g.key}`)}>
                    <td colSpan={colCount} className="px-3 py-2 text-sm font-semibold">
                      {collapsed.has(`s:${g.key}`)
                        ? <ChevronRight className="mr-1 inline size-4 align-[-3px]" />
                        : <ChevronDown className="mr-1 inline size-4 align-[-3px]" />}
                      {g.seq && <SequenceDot sequence={g.seq} className="mr-1.5 size-2.5 align-[1px]" />}
                      {g.title}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {g.poles.reduce((t, x) => t + x.rows.length, 0)} ligne(s) · {fmt(sum(g.poles.flatMap((x) => x.rows)))}
                      </span>
                    </td>
                  </tr>
                )}
                {!collapsed.has(`s:${g.key}`) && g.poles.map((pg) => (
                  <Fragment key={pg.key}>
                    {pg.title && (
                      <tr className="cursor-pointer bg-muted/20 hover:bg-muted/40" onClick={() => toggle(`p:${g.key}:${pg.key}`)}
                        aria-expanded={!collapsed.has(`p:${g.key}:${pg.key}`)}>
                        <td colSpan={colCount} className="px-3 py-1.5 pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {collapsed.has(`p:${g.key}:${pg.key}`)
                            ? <ChevronRight className="mr-1 inline size-3.5 align-[-2px]" />
                            : <ChevronDown className="mr-1 inline size-3.5 align-[-2px]" />}
                          {pg.title}
                          <span className="ml-2 font-normal normal-case tracking-normal">{pg.rows.length} ligne(s) · {fmt(sum(pg.rows))}</span>
                        </td>
                      </tr>
                    )}
            {!collapsed.has(`p:${g.key}:${pg.key}`) && pg.rows.map((l) => (
              <tr key={l.item.id} className="align-middle">
                <td className="min-w-56 max-w-80 px-3 py-2">
                  <p className="whitespace-normal break-words font-medium leading-snug">{model.fullLabel(l.item.id)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {grouped ? null : <>{l.pole} · {l.sequence}</>}
                    {l.item.amountStatus === "to_estimate" && (grouped ? "À estimer " : " · à estimer")}
                  </p>
                </td>
                <td className="px-2 py-2">
                  {l.priority
                    ? <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: PRIORITY_COLORS[l.priority] }}>{PRIORITY_SHORT[l.priority]}</span>
                    : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{l.item.amountStatus === "to_estimate" ? <span className="text-xs text-muted-foreground">à estimer</span> : fmt(l.amount)}</td>
                {REVIEW_QUESTIONS.map((q) => (
                  <td key={q.key} className="px-1 py-2">
                    <ScorePicker value={l.review?.scores[q.key]} inherited={!!l.review?.inherited} label={`${q.short} — ${model.fullLabel(l.item.id)}`}
                      onPick={(v) => setScore(l, q.key, v)} />
                  </td>
                ))}
                <td className="px-2 py-2 text-right tabular-nums">
                  {l.total == null ? "—" : <span className={cn(!reviewComplete(l.review!.scores) && "text-muted-foreground")}
                    title={reviewComplete(l.review!.scores) ? undefined : "Notation incomplète"}>{l.total}/{REVIEW_MAX}</span>}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-xs">
                  {l.perPoint == null || l.item.amountStatus === "to_estimate" ? "—" : l.perPoint === Infinity ? "∞" : fmt(l.perPoint)}
                </td>
                <td className="px-2 py-2">
                  <span className={cn("whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium", VERDICT_STYLES[l.verdict])} title={VERDICT_HINTS[l.verdict]}>
                    {VERDICT_LABELS[l.verdict]}
                  </span>
                </td>
                <td className="px-1 py-2 text-center">
                  <input type="checkbox" className="size-4 accent-sky-600" checked={l.item.guestDependent}
                    aria-label={`% invités — ${model.fullLabel(l.item.id)}`}
                    onChange={(e) => setReview.mutate({ id: l.item.id, patch: { guestDependent: e.target.checked } }, { onError: () => toast.error("Non enregistré.") })} />
                </td>
                <td className="px-1 py-2 text-center">
                  <input type="checkbox" className="size-4 accent-amber-600" checked={l.item.diyPossible}
                    aria-label={`DIY envisageable — ${model.fullLabel(l.item.id)}`}
                    onChange={(e) => setReview.mutate({ id: l.item.id, patch: { diyPossible: e.target.checked } }, { onError: () => toast.error("Non enregistré.") })} />
                </td>
                <td className="px-3 py-2">
                  <Input key={`${l.item.id}-${l.item.reviewNote ?? ""}`} className="h-7 min-w-40 text-xs" placeholder="Ex : version DIY, louer…"
                    defaultValue={l.item.reviewNote ?? ""} aria-label={`Remarque — ${model.fullLabel(l.item.id)}`}
                    onBlur={(e) => {
                      const next = e.target.value.trim() || null
                      if (next !== (l.item.reviewNote ?? null)) {
                        setReview.mutate({ id: l.item.id, patch: { reviewNote: next } }, { onError: () => toast.error("Remarque non enregistrée.") })
                      }
                    }} />
                </td>
              </tr>
            ))}
                  </Fragment>
                ))}
              </Fragment>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={colCount} className="px-3 py-6 text-center text-sm text-muted-foreground">Aucune ligne.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScorePicker({ value, inherited, label, onPick }: {
  value: 0 | 1 | 2 | undefined
  inherited: boolean
  label: string
  onPick: (v: 0 | 1 | 2) => void
}) {
  return (
    <div className="mx-auto flex w-fit overflow-hidden rounded-md border border-border" role="radiogroup" aria-label={label}>
      {([0, 1, 2] as const).map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onPick(v)}
          title={inherited ? "Note du poste : cliquer donne à cette ligne ses propres notes" : undefined}
          className={cn("w-6 py-0.5 text-xs tabular-nums transition-colors",
            value === v
              ? inherited ? "bg-primary/30 italic text-foreground" : "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted")}>
          {v}
        </button>
      ))}
    </div>
  )
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}
