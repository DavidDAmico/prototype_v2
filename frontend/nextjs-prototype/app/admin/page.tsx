"use client";

import Link from "next/link";
import Image from "next/image";
import { ChartBarIcon, ChartPieIcon } from "@heroicons/react/24/outline";

export default function AdminDashboard() {
  return (
    <div className="p-8 w-full text-black">
      <div className="flex flex-col md:flex-row items-start gap-8 max-w-6xl mx-auto">
        {/* Linke Spalte: Benutzerverwaltung */}
        <div className="flex-1 bg-blue-100 dark:bg-blue-200 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-bold text-center mb-4">User administration</h2>
          <Link
            href="/create-user"
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition text-center"
          >
            <div className="w-8 flex justify-start">
              <Image
                src="/icons/add-user.png"
                alt="Add User Icon"
                width={20}
                height={20}
              />
            </div>
            <span>Create a new user</span>
          </Link>
          <Link
            href="/edit-user"
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition text-center"
          >
            <div className="w-8 flex justify-start">
              <Image
                src="/icons/edit.png"
                alt="Edit User Icon"
                width={20}
                height={20}
              />
            </div>
            <span>Edit user</span>
          </Link>
        </div>

        {/* Rechte Spalte: Caseverwaltung */}
        <div className="flex-2 bg-blue-100 dark:bg-blue-200 p-6 rounded-lg space-y-4">
          <h2 className="text-2xl font-bold text-center mb-4">Case administration</h2>
          <Link
            href="/create-case"
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition text-center"
          >
            <div className="w-8 flex justify-start">
              <Image
                src="/icons/create-case.png"
                alt="Create Case Icon"
                width={20}
                height={20}
              />
            </div>
            <span>Create a new case</span>
          </Link>
          <Link
            href="/edit-case"
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition text-center"
          >
            <div className="w-8 flex justify-start">
              <Image
                src="/icons/edit-case.png"
                alt="Edit Case Icon"
                width={20}
                height={20}
              />
            </div>
            <span>Edit a case</span>
          </Link>
          <Link
            href="/admin/cases-overview"
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition text-center"
          >
            <div className="w-8 flex justify-start">
              <ChartBarIcon className="w-5 h-5 text-blue-600" />
            </div>
            <span>Cases Overview</span>
          </Link>
          <Link
            href="/admin/round-analysis"
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition text-center"
          >
            <div className="w-8 flex justify-start">
              <ChartPieIcon className="w-5 h-5 text-blue-600" />
            </div>
            <span>Round Analysis</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
