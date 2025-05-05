"use client";

import { useEffect, useState } from "react";
import useAuth from "../lib/useAuth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Case {
  id: number;
  case_type: string;
  created_at: string;
  name?: string;
  current_round?: number;
  // Add more fields if needed
}

interface AuthUser {
  user_id: number;
  role: string;
  username?: string;
  // more fields
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

export default function DashboardPage() {
  const { user, loading } = useAuth(); // user wird als AuthUser erwartet
  const [assignedCases, setAssignedCases] = useState<Case[]>([]);
  const [caseHistory, setCaseHistory] = useState<Case[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (user && (user as AuthUser).user_id) {
      async function fetchAssignedCases() {
        try {
          console.log(`Fetching assigned cases for user ID: ${(user as AuthUser).user_id}`);
          const res = await fetch(
            `http://localhost:9000/cases/assigned/${(user as AuthUser).user_id}`,
            {
              credentials: "include",
            }
          );
          if (!res.ok) {
            throw new Error("Error loading assigned cases");
          }
          const data = await res.json();
          console.log("Assigned cases response:", data);
          setAssignedCases(data);
        } catch (error: any) {
          console.error("Error fetching assigned cases:", error.message);
        }
      }

      async function fetchCaseHistory() {
        try {
          console.log(`Fetching case history for user ID: ${(user as AuthUser).user_id}`);
          const res = await fetch(
            `http://localhost:9000/cases/history/${(user as AuthUser).user_id}`,
            {
              credentials: "include",
            }
          );
          if (!res.ok) {
            throw new Error("Error loading case history");
          }
          const data = await res.json();
          console.log("Case history response:", data);
          setCaseHistory(data);
        } catch (error: any) {
          console.error("Error fetching case history:", error.message);
        }
      }

      fetchAssignedCases();
      fetchCaseHistory();
    }
  }, [user]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground text-lg">Loading...</p>
      </div>
    );

  if (!user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground text-lg">Access Denied</p>
      </div>
    );

  // Logout function
  const handleLogout = async () => {
    try {
      const csrfToken = getCookie("csrf_access_token");
      const res = await fetch("http://localhost:9000/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
      });
      if (!res.ok) {
        throw new Error("Error during logout");
      }
      router.push("/");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-background text-foreground transition-none">
      {/* Header */}
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
            Dashboard
          </h1>
        </div>
        <div className="flex gap-4">
          {(user as AuthUser).role === "master" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg bg-blue-600 dark:bg-blue-500 px-6 py-2 text-white text-sm font-medium hover:bg-blue-500 dark:hover:bg-blue-400"
            >
              <span>Admin Area</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg bg-red-600 dark:bg-red-500 px-6 py-2 text-white text-sm font-medium hover:bg-red-500 dark:hover:bg-red-400"
          >
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl w-full mt-8">
        {/* Assigned Cases */}
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">Cases Assigned to You</h2>
          {assignedCases.length === 0 ? (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <p className="text-gray-500">
                You currently have no assigned cases.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedCases.map((case_) => (
                <Link
                  href={`/cases/${case_.id}/edit`}
                  key={case_.id}
                  className="block"
                >
                  <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{case_.name || `Case ${case_.id}`}</span>
                      <span className="text-sm text-blue-600 px-2 py-1 bg-blue-50 rounded">
                        {case_.case_type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(case_.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Case History */}
        <div>
          <h2 className="text-lg font-medium mb-4">Case History</h2>
          {caseHistory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseHistory.map((case_) => (
                <Link
                  href={`/cases/${case_.id}/view`}
                  key={case_.id}
                  className="block"
                >
                  <div className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{case_.name || `Case ${case_.id}`}</span>
                      <span className="text-sm text-green-600 px-2 py-1 bg-green-50 rounded">
                        Completed
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {new Date(case_.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-sm text-gray-500">
                        Round {case_.current_round}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <p className="text-gray-500">No completed cases yet.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
