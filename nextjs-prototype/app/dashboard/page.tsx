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
  // Weitere Felder ergänzen, falls benötigt
}

interface AuthUser {
  user_id: number;
  role: string;
  username?: string;
  // weitere Felder
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
          const res = await fetch(
            `http://localhost:9000/cases/assigned/${(user as AuthUser).user_id}`,
            {
              credentials: "include",
            }
          );
          if (!res.ok) {
            throw new Error("Fehler beim Laden der zugewiesenen Cases");
          }
          const data = await res.json();
          setAssignedCases(data);
        } catch (error: any) {
          console.error(error.message);
        }
      }

      async function fetchCaseHistory() {
        try {
          const res = await fetch(
            `http://localhost:9000/cases/history/${(user as AuthUser).user_id}`,
            {
              credentials: "include",
            }
          );
          if (!res.ok) {
            throw new Error("Fehler beim Laden der Case-Historie");
          }
          const data = await res.json();
          setCaseHistory(data);
        } catch (error: any) {
          console.error(error.message);
        }
      }

      fetchAssignedCases();
      fetchCaseHistory();
    }
  }, [user]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground text-lg">Lädt...</p>
      </div>
    );

  if (!user)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground text-lg">Kein Zugriff</p>
      </div>
    );

  // Logout-Funktion
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
        throw new Error("Fehler beim Logout");
      }
      router.push("/");
    } catch (error) {
      console.error("Fehler beim Logout:", error);
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
              <span>Admin Bereich</span>
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

      {/* Anzeige der Cases */}
      <div className="max-w-6xl mt-10 w-full">
        <h2 className="text-2xl font-bold mb-4">Dir zugewiesene Cases</h2>
        {assignedCases.length === 0 ? (
          <p className="text-gray-500">
            Du hast aktuell keine zugewiesenen Cases.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedCases.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}/edit`}
                className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-lg text-center"
              >
                <p>Case ID: {c.id}</p>
                <p>Typ: {c.case_type}</p>
                <p>
                  Erstellt: {new Date(c.created_at).toLocaleDateString("de-DE")}
                </p>
              </Link>
            ))}
          </div>
        )}

        <h2 className="text-2xl font-bold mt-10 mb-4">Case Historie</h2>
        {caseHistory.length === 0 ? (
          <p className="text-gray-500">Noch keine abgeschlossenen Cases.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {caseHistory.map((c) => (
              <div
                key={c.id}
                className="p-4 bg-gray-300 dark:bg-gray-600 rounded-lg shadow-lg"
              >
                <p>Case ID: {c.id}</p>
                <p>Typ: {c.case_type}</p>
                <p>
                  Abgeschlossen:{" "}
                  {new Date(c.created_at).toLocaleDateString("de-DE")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
