"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

function getBreadcrumbs(pathname: string) {
  const segments = pathname.replace("/dashboard", "").split("/").filter(Boolean);
  const crumbs = [{ label: "Dashboard", href: "/dashboard" }];
  let path = "/dashboard";
  for (const seg of segments) {
    path += `/${seg}`;
    crumbs.push({
      label: seg.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      href: path,
    });
  }
  return crumbs;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

  return (
    <div className="flex min-h-screen bg-white text-[#4B4B4B]">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-[#FFFFFF] bg-gradient-to-br from-[#FFFFFF] via-[#FFFFFF] to-[#F4F8FB]">
        {/* Top header */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#A4C8E1]/20 glass sticky top-0 z-20">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-1 text-sm">
            {crumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-[#A4C8E1] flex-shrink-0" />
                )}
                {i === crumbs.length - 1 ? (
                  <span className="text-[#4682B4] font-semibold">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-[#4B4B4B] hover:text-[#4682B4] transition-colors font-medium"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              id="notifications-btn"
              className="relative p-2 rounded-lg text-[#4B4B4B] hover:text-[#4682B4] hover:bg-[#A4C8E1]/10 transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#4682B4] animate-pulse" />
            </button>

            {/* Status badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#4682B4]/10 border border-[#4682B4]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-[#4682B4]">API Online</span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
