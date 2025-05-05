"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-background text-foreground transition-none">
      {/* Header in "DeleteUserLayout" style */}
      <div className="flex w-full max-w-6xl justify-between items-center py-6 bg-gray-100 dark:bg-header-background px-4 rounded-lg shadow-md gap-6">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            width={50}
            height={50}
            alt="Prototype Logo"
            className="w-12 h-12"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-blue-400">
            Admin Area
          </h1>
        </div>

        {/* Back to Dashboard */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg bg-blue-600 dark:bg-blue-500 px-6 py-2 text-white text-sm font-medium transition hover:bg-blue-500 dark:hover:bg-blue-400 ml-auto"
        >
          <span>Back to Dashboard</span>
          <ArrowRightIcon className="w-5" />
        </Link>
      </div>

      {/* Here the content (page.tsx) is rendered */}
      <div className="w-full max-w-6xl mt-10">
        {children}
      </div>
    </main>
  );
}
