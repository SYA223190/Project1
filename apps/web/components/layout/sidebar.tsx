"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  ShoppingCart,
  CreditCard,
  Landmark,
  Clock,
  BookOpen,
  BarChart3,
  FolderOpen,
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: Array<{ label: string; href: string }>;
}

function getNavItems(orgId: string): NavItem[] {
  const base = `/${orgId}`;
  return [
    { label: "Dashboard", href: `${base}/dashboard`, icon: LayoutDashboard },
    { label: "Items", href: `${base}/items`, icon: Package },
    { label: "Banking", href: `${base}/banking`, icon: Landmark },
    {
      label: "Sales",
      icon: FileText,
      children: [
        { label: "Quotes", href: `${base}/sales/quotes` },
        { label: "Sales Orders", href: `${base}/sales/sales-orders` },
        { label: "Delivery Notes", href: `${base}/sales/delivery-notes` },
        { label: "Invoices", href: `${base}/sales/invoices` },
        { label: "Credit Notes", href: `${base}/sales/credit-notes` },
        { label: "Payments Received", href: `${base}/sales/payments-received` },
        { label: "Recurring Invoices", href: `${base}/sales/recurring-invoices` },
      ],
    },
    {
      label: "Purchases",
      icon: ShoppingCart,
      children: [
        { label: "Purchase Orders", href: `${base}/purchases/purchase-orders` },
        { label: "Bills", href: `${base}/purchases/bills` },
        { label: "Vendor Credits", href: `${base}/purchases/vendor-credits` },
        { label: "Payments Made", href: `${base}/purchases/payments-made` },
        { label: "Expenses", href: `${base}/purchases/expenses` },
      ],
    },
    { label: "Customers", href: `${base}/customers`, icon: Users },
    { label: "Vendors", href: `${base}/vendors`, icon: Truck },
    {
      label: "Time Tracking",
      icon: Clock,
      children: [
        { label: "Projects", href: `${base}/time-tracking/projects` },
        { label: "Timesheets", href: `${base}/time-tracking/timesheets` },
      ],
    },
    {
      label: "Accountant",
      icon: BookOpen,
      children: [
        { label: "Manual Journals", href: `${base}/accountant/manual-journals` },
        { label: "Chart of Accounts", href: `${base}/accountant/chart-of-accounts` },
        { label: "Budgets", href: `${base}/accountant/budgets` },
        { label: "Currency Adjustments", href: `${base}/accountant/currency-adjustments` },
      ],
    },
    { label: "Reports", href: `${base}/reports`, icon: BarChart3 },
    { label: "Documents", href: `${base}/documents`, icon: FolderOpen },
    {
      label: "Automation",
      icon: Zap,
      children: [
        { label: "Workflow Rules", href: `${base}/automation/workflow-rules` },
        { label: "Schedules", href: `${base}/automation/schedules` },
      ],
    },
    { label: "Settings", href: `${base}/settings`, icon: Settings },
  ];
}

function NavGroup({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(isChildActive ?? false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isChildActive
            ? "bg-sidebar-accent text-white"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted"
        )}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="mt-0.5 ml-6 space-y-0.5">
          {item.children?.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "block px-3 py-1.5 rounded-lg text-sm transition-colors",
                pathname === child.href
                  ? "bg-sidebar-accent text-white font-medium"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted"
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ orgId, orgName }: { orgId: string; orgName: string }) {
  const pathname = usePathname();
  const navItems = getNavItems(orgId);

  return (
    <aside className="w-60 bg-sidebar flex-shrink-0 flex flex-col h-screen overflow-y-auto">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{orgName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <div className="text-sidebar-foreground font-semibold text-sm truncate">{orgName}</div>
            <div className="text-sidebar-foreground/50 text-xs">Switch org</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          if (item.children) {
            return <NavGroup key={item.label} item={item} />;
          }
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-sidebar-accent text-white"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
