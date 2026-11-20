import { NavLink } from "react-router-dom"

import { NAV_ITEMS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/hooks/use-permissions"

export function Sidebar() {
  const { can, role } = usePermissions()
  const visibleItems = NAV_ITEMS.filter(
    (item) => can(item.capability) && (!item.visibleToRoles || (role && item.visibleToRoles.includes(role)))
  )

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex items-center gap-2 px-6 py-6">
        <span
          className="text-3xl font-normal"
          style={{ fontFamily: "'Nickainley', serif", color: "#7a272c" }}
        >
          Jordan &amp; Sarah
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              )
            }
          >
            <item.icon className="size-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
