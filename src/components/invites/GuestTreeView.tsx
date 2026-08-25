import { useMemo } from "react"
import { Link2 } from "lucide-react"

import type { Guest } from "@/types/domain"

// ── Tree model ────────────────────────────────────────────────────────────────

export interface GuestTreeNode {
  primary: Guest
  partner: Guest | null
  children: GuestTreeNode[]
}

export function buildGuestTree(guests: Guest[]): GuestTreeNode[] {
  const guestById = new Map(guests.map(g => [g.id, g]))
  const guestIds = new Set(guests.map(g => g.id))

  // Map parentId → direct children within this guest list
  const childrenByParentId = new Map<string, Guest[]>()
  const childIds = new Set<string>()
  for (const g of guests) {
    if (g.parentId && guestIds.has(g.parentId)) {
      const list = childrenByParentId.get(g.parentId) ?? []
      list.push(g)
      childrenByParentId.set(g.parentId, list)
      childIds.add(g.id)
    }
  }

  const consumed = new Set<string>()

  function buildNode(guest: Guest): GuestTreeNode {
    // Partner: pairedWithId pointing to someone in this list, not yet consumed
    const partner =
      guest.pairedWithId &&
      guestIds.has(guest.pairedWithId) &&
      !consumed.has(guest.pairedWithId)
        ? (guestById.get(guest.pairedWithId) ?? null)
        : null
    if (partner) consumed.add(partner.id)

    // Children of primary + partner, deduplicated
    const seen = new Set<string>()
    const rawChildren = [
      ...(childrenByParentId.get(guest.id) ?? []),
      ...(partner ? (childrenByParentId.get(partner.id) ?? []) : []),
    ].filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })

    // Sort: minors by age asc, then alphabetically
    rawChildren.sort((a, b) => {
      const aAge = a.childAge ?? 99
      const bAge = b.childAge ?? 99
      return aAge !== bAge ? aAge - bAge : a.fullName.localeCompare(b.fullName, "fr")
    })

    return { primary: guest, partner, children: rawChildren.map(buildNode) }
  }

  // Conjoints d'un enfant : ils ne doivent pas être racine, ils apparaissent
  // en position imbriquée aux côtés de leur partenaire enfant.
  const partnerOfChild = new Set<string>()
  for (const g of guests) {
    if (childIds.has(g.id) && g.pairedWithId && guestIds.has(g.pairedWithId)) {
      partnerOfChild.add(g.pairedWithId)
    }
  }

  // Root nodes: guests that are not children and not the partner of a child
  const roots = guests
    .filter(g => !childIds.has(g.id) && !partnerOfChild.has(g.id))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "fr"))

  consumed.clear()
  const nodes: GuestTreeNode[] = []
  for (const g of roots) {
    if (consumed.has(g.id)) continue
    nodes.push(buildNode(g))
  }
  return nodes
}

// ── Row ───────────────────────────────────────────────────────────────────────

function TreeNodeRow({
  node,
  depth,
  renderGuest,
}: {
  node: GuestTreeNode
  depth: number
  renderGuest: (guest: Guest) => React.ReactNode
}) {
  return (
    <div className={depth > 0 ? "ml-2 border-l border-border pl-3" : undefined}>
      <div className="flex flex-wrap items-center gap-1.5 py-0.5">
        {renderGuest(node.primary)}
        {node.partner && (
          <>
            <Link2 className="size-3 shrink-0 text-muted-foreground/60" />
            {renderGuest(node.partner)}
          </>
        )}
      </div>
      {node.children.map(child => (
        <TreeNodeRow
          key={child.primary.id}
          node={child}
          depth={depth + 1}
          renderGuest={renderGuest}
        />
      ))}
    </div>
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

export function GuestTreeView({
  guests,
  renderGuest,
}: {
  guests: Guest[]
  renderGuest: (guest: Guest) => React.ReactNode
}) {
  const tree = useMemo(() => buildGuestTree(guests), [guests])
  if (tree.length === 0) return null

  return (
    <div>
      {tree.map(node => (
        <TreeNodeRow
          key={node.primary.id}
          node={node}
          depth={0}
          renderGuest={renderGuest}
        />
      ))}
    </div>
  )
}
