import { supabase } from "@/supabase/client"
import { tbl } from "@/lib/event"

const db = supabase! as any

export type BudgetItem = {
  id: string
  parentId: string | null
  sequenceId: string | null
  /** Pôle (mêmes pôles que les missions) : regroupement principal du budget. */
  poleId: string | null
  /** Ancienne catégorie libre, conservée mais plus affichée. */
  category: string
  label: string
  quantity: number | null
  unitPrice: number | null
  estimatedTotal: number | null
  actualTotal: number | null
  vendor: string | null
  paidDate: string | null
  account: string | null
  origin: string | null
  itemType: string | null
  notes: string | null
  /** Un acompte est demandé pour cette ligne. */
  depositRequired: boolean
  /** Priorité MoSCoW ; null sur un sous-poste = celle du poste. */
  priority: Priority | null
  /** Estimé, pas encore estimable (0 € signalé) ou inclus dans une autre ligne (0 €). */
  amountStatus: AmountStatus
  /** Ligne qui inclut celle-ci (amountStatus = included). */
  includedInId: string | null
  /** Le montant dépend du nombre d'invités (étiquette, sans calcul). */
  guestDependent: boolean
  /** Seconde passe : notes de 0 à 2 par question ; null = pas encore notée (un sous-poste reprend alors son poste). */
  reviewScores: ReviewScores | null
  reviewNote: string | null
  /** Seconde passe : on pourrait le faire nous-mêmes (étiquette). */
  diyPossible: boolean
  sortOrder: number
}

export type ReviewKey = "souvenir" | "signature" | "absence" | "confort" | "trace" | "duree"
export type ReviewScores = Partial<Record<ReviewKey, 0 | 1 | 2>>

export type Priority = "must" | "should" | "could"
export type AmountStatus = "estimated" | "to_estimate" | "included"

export type BudgetQuote = {
  id: string
  itemId: string
  vendorName: string | null
  price: number | null
  notes: string | null
  url: string | null
  validUntil: string | null
  isSelected: boolean
  createdAt: string
}

function fromRow(r: any): BudgetItem {
  return {
    id:             r.id,
    parentId:       r.parent_id ?? null,
    sequenceId:     r.sequence_id,
    poleId:         r.pole_id ?? null,
    category:       r.category ?? "",
    label:          r.label,
    quantity:       r.quantity,
    unitPrice:      r.unit_price,
    estimatedTotal: r.estimated_total,
    actualTotal:    r.actual_total,
    vendor:         r.vendor,
    paidDate:       r.paid_date,
    account:        r.account,
    origin:         r.origin,
    itemType:       r.item_type,
    notes:          r.notes,
    depositRequired: r.deposit_required ?? false,
    priority:       r.priority ?? null,
    amountStatus:   r.amount_status ?? "estimated",
    includedInId:   r.included_in_id ?? null,
    guestDependent: r.guest_dependent ?? false,
    reviewScores:   r.review_scores ?? null,
    reviewNote:     r.review_note ?? null,
    diyPossible:    r.diy_possible ?? false,
    sortOrder:      r.sort_order ?? 0,
  }
}

function fromQuoteRow(r: any): BudgetQuote {
  return {
    id:          r.id,
    itemId:      r.item_id,
    vendorName:  r.vendor_name,
    price:       r.price,
    notes:       r.notes,
    url:         r.url,
    validUntil:  r.valid_until,
    isSelected:  r.is_selected,
    createdAt:   r.created_at,
  }
}

export const budgetService = {

  async listItems(): Promise<BudgetItem[]> {
    const { data, error } = await db
      .from(tbl("budget_items"))
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
    if (error) throw error
    return (data ?? []).map(fromRow)
  },

  async createItem(item: Omit<BudgetItem, "id" | "sortOrder">): Promise<BudgetItem> {
    const { data, error } = await db
      .from(tbl("budget_items"))
      .insert({
        parent_id:       item.parentId,
        sequence_id:     item.sequenceId,
        pole_id:         item.poleId,
        category:        item.category,
        label:           item.label,
        quantity:        item.quantity,
        unit_price:      item.unitPrice,
        estimated_total: item.estimatedTotal,
        actual_total:    item.actualTotal,
        vendor:          item.vendor,
        paid_date:       item.paidDate,
        account:         item.account,
        origin:          item.origin,
        item_type:       item.itemType,
        notes:           item.notes,
        deposit_required: item.depositRequired ?? false,
      })
      .select()
      .single()
    if (error) throw error
    return fromRow(data)
  },

  async updateItem(id: string, patch: Partial<Omit<BudgetItem, "id">>): Promise<void> {
    const row: Record<string, unknown> = {}
    if (patch.parentId       !== undefined) row.parent_id       = patch.parentId
    if (patch.sequenceId     !== undefined) row.sequence_id     = patch.sequenceId
    if (patch.poleId         !== undefined) row.pole_id         = patch.poleId
    if (patch.category       !== undefined) row.category        = patch.category
    if (patch.label          !== undefined) row.label           = patch.label
    if (patch.quantity       !== undefined) row.quantity        = patch.quantity
    if (patch.unitPrice      !== undefined) row.unit_price      = patch.unitPrice
    if (patch.estimatedTotal !== undefined) row.estimated_total = patch.estimatedTotal
    if (patch.actualTotal    !== undefined) row.actual_total    = patch.actualTotal
    if (patch.vendor         !== undefined) row.vendor          = patch.vendor
    if (patch.paidDate       !== undefined) row.paid_date       = patch.paidDate
    if (patch.account        !== undefined) row.account         = patch.account
    if (patch.origin         !== undefined) row.origin          = patch.origin
    if (patch.itemType       !== undefined) row.item_type       = patch.itemType
    if (patch.notes          !== undefined) row.notes           = patch.notes
    if (patch.depositRequired !== undefined) row.deposit_required = patch.depositRequired
    if (patch.priority       !== undefined) row.priority        = patch.priority
    if (patch.amountStatus   !== undefined) row.amount_status   = patch.amountStatus
    if (patch.includedInId   !== undefined) row.included_in_id  = patch.includedInId
    if (patch.guestDependent !== undefined) row.guest_dependent = patch.guestDependent
    if (patch.reviewScores   !== undefined) row.review_scores   = patch.reviewScores
    if (patch.reviewNote     !== undefined) row.review_note     = patch.reviewNote
    if (patch.diyPossible    !== undefined) row.diy_possible    = patch.diyPossible
    if (patch.sortOrder      !== undefined) row.sort_order      = patch.sortOrder
    if (Object.keys(row).length === 0) return
    const { error } = await db.from(tbl("budget_items")).update(row).eq("id", id)
    if (error) throw error
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await db.from(tbl("budget_items")).delete().eq("id", id)
    if (error) throw error
  },

  async listQuotesByItem(itemId: string): Promise<BudgetQuote[]> {
    const { data, error } = await db
      .from(tbl("budget_quotes"))
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true })
    if (error) throw error
    return (data ?? []).map(fromQuoteRow)
  },

  async createQuote(itemId: string, q: Pick<BudgetQuote, "vendorName" | "price" | "notes" | "url" | "validUntil">): Promise<BudgetQuote> {
    const { data, error } = await db
      .from(tbl("budget_quotes"))
      .insert({ item_id: itemId, vendor_name: q.vendorName, price: q.price, notes: q.notes, url: q.url, valid_until: q.validUntil })
      .select()
      .single()
    if (error) throw error
    return fromQuoteRow(data)
  },

  async updateQuote(id: string, q: Partial<Pick<BudgetQuote, "vendorName" | "price" | "notes" | "url" | "validUntil">>): Promise<void> {
    const row: Record<string, unknown> = {}
    if (q.vendorName !== undefined) row.vendor_name = q.vendorName
    if (q.price      !== undefined) row.price       = q.price
    if (q.notes      !== undefined) row.notes       = q.notes
    if (q.url        !== undefined) row.url         = q.url
    if (q.validUntil !== undefined) row.valid_until = q.validUntil
    if (Object.keys(row).length === 0) return
    const { error } = await db.from(tbl("budget_quotes")).update(row).eq("id", id)
    if (error) throw error
  },

  async deleteQuote(id: string): Promise<void> {
    const { error } = await db.from(tbl("budget_quotes")).delete().eq("id", id)
    if (error) throw error
  },

  async selectQuote(quoteId: string, itemId: string, price: number | null, vendorName: string | null): Promise<void> {
    await db.from(tbl("budget_quotes")).update({ is_selected: false }).eq("item_id", itemId)
    await db.from(tbl("budget_quotes")).update({ is_selected: true }).eq("id", quoteId)
    await db.from(tbl("budget_items")).update({ estimated_total: price, vendor: vendorName }).eq("id", itemId)
  },

  async listQuoteStatus(): Promise<Record<string, boolean>> {
    const { data, error } = await db
      .from(tbl("budget_quotes"))
      .select("item_id, is_selected")
    if (error) throw error
    const result: Record<string, boolean> = {}
    for (const row of (data ?? [])) {
      result[row.item_id] = result[row.item_id] === true || row.is_selected === true
    }
    return result
  },

  async deselectQuotes(itemId: string): Promise<void> {
    await db.from(tbl("budget_quotes")).update({ is_selected: false }).eq("item_id", itemId)
  },

  async duplicateItem(itemId: string): Promise<void> {
    const { data: orig, error: e1 } = await db.from(tbl("budget_items")).select("*").eq("id", itemId).single()
    if (e1) throw e1
    const { data: copy, error: e2 } = await db.from(tbl("budget_items")).insert({
      parent_id:       orig.parent_id,
      sequence_id:     orig.sequence_id,
      pole_id:         orig.pole_id,
      category:        orig.category,
      label:           `Copie de ${orig.label}`,
      quantity:        orig.quantity,
      unit_price:      orig.unit_price,
      estimated_total: orig.estimated_total,
      actual_total:    null,
      vendor:          orig.vendor,
      paid_date:       null,
      account:         orig.account,
      origin:          orig.origin,
      item_type:       orig.item_type,
      notes:           orig.notes,
      sort_order:      (orig.sort_order ?? 0) + 1,
    }).select().single()
    if (e2) throw e2
    const { data: kids, error: e3 } = await db.from(tbl("budget_items")).select("*").eq("parent_id", itemId)
    if (e3) throw e3
    if (kids && kids.length > 0) {
      const { error: e4 } = await db.from(tbl("budget_items")).insert(
        kids.map((c: any) => ({
          parent_id:       copy.id,
          sequence_id:     c.sequence_id,
          pole_id:         c.pole_id,
          category:        c.category,
          label:           c.label,
          quantity:        c.quantity,
          unit_price:      c.unit_price,
          estimated_total: c.estimated_total,
          actual_total:    null,
          vendor:          c.vendor,
          paid_date:       null,
          account:         c.account,
          origin:          c.origin,
          item_type:       c.item_type,
          notes:           c.notes,
          sort_order:      c.sort_order,
        }))
      )
      if (e4) throw e4
    }
  },

  async swapSortOrder(idA: string, sortOrderA: number, idB: string, sortOrderB: number): Promise<void> {
    await db.from(tbl("budget_items")).update({ sort_order: sortOrderB }).eq("id", idA)
    await db.from(tbl("budget_items")).update({ sort_order: sortOrderA }).eq("id", idB)
  },


  async renameCategory(oldName: string, newName: string): Promise<void> {
    const { error } = await db
      .from(tbl("budget_items"))
      .update({ category: newName })
      .eq("category", oldName)
    if (error) throw error
  },

  async importItems(items: Omit<BudgetItem, "id" | "sortOrder">[]): Promise<void> {
    const rows = items.map((item, i) => ({
      sequence_id:     item.sequenceId,
      pole_id:         item.poleId,
      category:        item.category,
      label:           item.label,
      quantity:        item.quantity,
      unit_price:      item.unitPrice,
      estimated_total: item.estimatedTotal,
      actual_total:    item.actualTotal,
      vendor:          item.vendor,
      paid_date:       item.paidDate,
      account:         item.account,
      origin:          item.origin,
      item_type:       item.itemType,
      notes:           item.notes,
      sort_order:      i,
    }))
    const { error } = await db.from(tbl("budget_items")).insert(rows)
    if (error) throw error
  },

  /** Supprime un poste et ses sous-postes (leurs versements et lignes de devis suivent en cascade). */
  async deletePoste(id: string): Promise<void> {
    const { error: e1 } = await db.from(tbl("budget_items")).delete().eq("parent_id", id)
    if (e1) throw e1
    const { error } = await db.from(tbl("budget_items")).delete().eq("id", id)
    if (error) throw error
  },

  // ── Devis groupés, lignes couvertes et échéanciers ─────────────────────────

  async listDevis(): Promise<BudgetDevis[]> {
    const { data, error } = await db.from(tbl("budget_devis")).select("*").order("created_at", { ascending: true })
    if (error) throw error
    return (data ?? []).map(fromDevisRow)
  },

  async listDevisLines(): Promise<DevisLine[]> {
    const { data, error } = await db.from(tbl("budget_devis_lines")).select("*")
    if (error) throw error
    return (data ?? []).map((r: any) => ({ devisId: r.devis_id, itemId: r.item_id, amount: num(r.amount) }))
  },

  async listPayments(): Promise<BudgetPayment[]> {
    const { data, error } = await db.from(tbl("budget_payments")).select("*")
      .order("sort_order", { ascending: true }).order("created_at", { ascending: true })
    if (error) throw error
    return (data ?? []).map(fromPaymentRow)
  },

  /** Enregistre un devis complet : en-tête, lignes couvertes (remplacées) et échéancier (remplacé). */
  async saveDevis(devis: DevisDraft): Promise<string> {
    const row = {
      vendor: devis.vendor, title: devis.title, quote_date: devis.quoteDate, valid_until: devis.validUntil,
      url: devis.url, notes: devis.notes, total_amount: devis.totalAmount, status: devis.status,
    }
    let id = devis.id
    if (id) {
      const { error } = await db.from(tbl("budget_devis")).update(row).eq("id", id)
      if (error) throw error
    } else {
      const { data, error } = await db.from(tbl("budget_devis")).insert(row).select("id").single()
      if (error) throw error
      id = data.id as string
    }
    const { error: e1 } = await db.from(tbl("budget_devis_lines")).delete().eq("devis_id", id)
    if (e1) throw e1
    if (devis.lines.length) {
      const { error } = await db.from(tbl("budget_devis_lines"))
        .insert(devis.lines.map((l) => ({ devis_id: id, item_id: l.itemId, amount: l.amount })))
      if (error) throw error
    }
    await replacePayments({ devis_id: id! }, devis.payments)
    return id!
  },

  async deleteDevis(id: string): Promise<void> {
    const { error } = await db.from(tbl("budget_devis")).delete().eq("id", id)
    if (error) throw error
  },

  /**
   * Enregistre un poste complet depuis sa fenêtre : le poste, ses sous-postes (créés, modifiés ou
   * supprimés) et l'échéancier propre de chaque ligne (remplacé).
   */
  async savePoste(draft: PosteDraft, plan: DevisPlan = { newDevis: [], links: [] }): Promise<{ posteId: string; idsByKey: Record<string, string> }> {
    const fields = (d: LineDraft, parentId: string | null, poleId: string | null) => ({
      parent_id: parentId, pole_id: poleId, sequence_id: d.sequenceId, label: d.label,
      quantity: d.quantity, unit_price: d.unitPrice, estimated_total: d.estimatedTotal, actual_total: d.actualTotal,
      vendor: d.vendor, account: d.account, origin: d.origin, notes: d.notes, deposit_required: d.depositRequired,
      priority: d.priority,
      amount_status: d.amountStatus, included_in_id: d.amountStatus === "included" ? d.includedInId : null,
      guest_dependent: d.guestDependent,
    })
    const save = async (d: LineDraft, parentId: string | null): Promise<string> => {
      const row = fields(d, parentId, draft.poste.poleId)
      if (d.id) {
        const { error } = await db.from(tbl("budget_items")).update(row).eq("id", d.id)
        if (error) throw error
        return d.id
      }
      const { data, error } = await db.from(tbl("budget_items")).insert({ ...row, category: "" }).select("id").single()
      if (error) throw error
      return data.id as string
    }
    const posteId = await save(draft.poste, null)
    const idsByKey: Record<string, string> = { [draft.poste.key]: posteId }
    // Poste à sous-postes : pas d'échéancier propre (une facture commune = un devis couvrant les sous-postes).
    await replacePayments({ item_id: posteId }, draft.subs.length ? [] : draft.poste.payments)
    for (const id of draft.removedSubIds) {
      const { error } = await db.from(tbl("budget_items")).delete().eq("id", id)
      if (error) throw error
    }
    for (const sub of draft.subs) {
      const subId = await save(sub, posteId)
      idsByKey[sub.key] = subId
      await replacePayments({ item_id: subId }, sub.payments)
    }

    // Devis : création des nouveaux, puis rattachements des lignes de ce poste (remplacés).
    const refToId = new Map<string, string>()
    for (const d of plan.newDevis) {
      const { data, error } = await db.from(tbl("budget_devis")).insert({
        vendor: d.vendor, title: d.title, total_amount: d.totalAmount, status: d.status,
      }).select("id").single()
      if (error) throw error
      refToId.set(d.ref, data.id as string)
    }
    const lineIds = Object.values(idsByKey)
    const { error: e1 } = await db.from(tbl("budget_devis_lines")).delete().in("item_id", lineIds)
    if (e1) throw e1
    const rows = plan.links
      .filter((l) => idsByKey[l.lineKey])
      .map((l) => ({ devis_id: refToId.get(l.devisRef) ?? l.devisRef, item_id: idsByKey[l.lineKey], amount: l.amount }))
    if (rows.length) {
      const { error } = await db.from(tbl("budget_devis_lines")).insert(rows)
      if (error) throw error
    }
    return { posteId, idsByKey }
  },
}

async function replacePayments(owner: { item_id: string } | { devis_id: string }, payments: PaymentDraft[]): Promise<void> {
  const [key, value] = Object.entries(owner)[0]
  const { error } = await db.from(tbl("budget_payments")).delete().eq(key, value)
  if (error) throw error
  if (!payments.length) return
  const { error: e2 } = await db.from(tbl("budget_payments")).insert(payments.map((p, i) => ({
    ...owner, kind: p.kind, label: p.label, amount: p.amount, due_date: p.dueDate,
    paid: p.paid, paid_date: p.paidDate, account: p.account, sort_order: i,
  })))
  if (e2) throw e2
}

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v))

export type DevisStatus = "en_cours" | "retenu" | "refuse"

export type BudgetDevis = {
  id: string
  vendor: string | null
  title: string | null
  quoteDate: string | null
  validUntil: string | null
  url: string | null
  notes: string | null
  totalAmount: number | null
  status: DevisStatus
}

export type DevisLine = { devisId: string; itemId: string; amount: number | null }

export type PaymentKind = "acompte" | "solde" | "paiement"

export type BudgetPayment = {
  id: string
  itemId: string | null
  devisId: string | null
  kind: PaymentKind
  label: string | null
  amount: number | null
  dueDate: string | null
  paid: boolean
  paidDate: string | null
  account: string | null
}

export type PaymentDraft = Omit<BudgetPayment, "id" | "itemId" | "devisId">

export type DevisDraft = Omit<BudgetDevis, "id"> & {
  id?: string
  lines: { itemId: string; amount: number | null }[]
  payments: PaymentDraft[]
}

/** Ligne (poste ou sous-poste) telle qu'éditée dans la fenêtre du poste. */
export type LineDraft = {
  id?: string
  key: string
  label: string
  sequenceId: string | null
  quantity: number | null
  unitPrice: number | null
  estimatedTotal: number | null
  actualTotal: number | null
  vendor: string | null
  account: string | null
  origin: string | null
  notes: string | null
  depositRequired: boolean
  priority: Priority | null
  amountStatus: AmountStatus
  includedInId: string | null
  guestDependent: boolean
  payments: PaymentDraft[]
}

/** Devis à créer et rattachements des lignes d'un poste, enregistrés avec le poste. */
export type DevisPlan = {
  newDevis: { ref: string; vendor: string | null; title: string | null; totalAmount: number | null; status: DevisStatus }[]
  /** devisRef : id d'un devis existant, ou ref d'un devis de newDevis. */
  links: { lineKey: string; devisRef: string; amount: number | null }[]
}

export type PosteDraft = {
  poste: LineDraft & { poleId: string | null }
  subs: LineDraft[]
  removedSubIds: string[]
}

function fromDevisRow(r: any): BudgetDevis {
  return {
    id: r.id, vendor: r.vendor, title: r.title, quoteDate: r.quote_date, validUntil: r.valid_until,
    url: r.url, notes: r.notes, totalAmount: num(r.total_amount), status: r.status,
  }
}

function fromPaymentRow(r: any): BudgetPayment {
  return {
    id: r.id, itemId: r.item_id, devisId: r.devis_id, kind: r.kind, label: r.label, amount: num(r.amount),
    dueDate: r.due_date, paid: !!r.paid, paidDate: r.paid_date, account: r.account,
  }
}
