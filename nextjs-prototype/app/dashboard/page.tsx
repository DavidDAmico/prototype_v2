"use client";

import { useEffect, useState } from "react";
import useAuth from "../lib/useAuth";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Project {
  id: number;
  name: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // Beispiel-Daten → Später durch echten API-Call ersetzen
      setProjects([{ id: 1, name: "Projekt 1" }, { id: 2, name: "Projekt 2" }]);
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
      await fetch("http://localhost:5001/auth/logout", {
        method: "POST",
        credentials: "include", // ✅ Cookies senden
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
  
      localStorage.removeItem("access_token"); // Lösche Token
      router.push("/"); // Zur Startseite weiterleiten
    } catch (error) {
      console.error("Fehler beim Logout:", error);
    }
  };
  

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-background text-foreground transition-none">
      {/* Header */}
      <div className="flex w-full max-w-6xl justify-between items-center py-6 bg-gray-100 dark:bg-header-background px-4 rounded-lg shadow-md">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Image
            src="/logo.svg"
            width={50}
            height={50}
            alt="Prototype Logo"
            className="w-12 h-12"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-blue-400">
            Your Projects Dashboard
          </h1>
        </div>

        {/* Buttons (Admin für Master + Logout für alle) */}
        <div className="flex gap-4">
          {user.role === "master" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg bg-blue-600 dark:bg-blue-500 px-6 py-2 text-white text-sm font-medium transition hover:bg-blue-500 dark:hover:bg-blue-400"
            >
              <span>Admin Bereich</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg bg-red-600 dark:bg-red-500 px-6 py-2 text-white text-sm font-medium transition hover:bg-red-500 dark:hover:bg-red-400"
          >
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Hero Section → Übersicht über Projekte */}
      <div className="flex flex-col md:flex-row items-center max-w-6xl mt-10">
        {/* Text Content */}
        <div className="md:w-2/5 text-center md:text-left p-6">
          <h2 className="text-4xl font-bold text-foreground dark:text-white">
            Welcome back, {user.role === "master" ? "Master" : "User"}!
          </h2>

          <p className="mt-4 text-foreground dark:text-white">
            Here you can manage your projects and evaluations.
          </p>

          {/* Falls noch keine Projekte existieren */}
          {projects.length === 0 && (
            <p className="mt-4 text-gray-500">No projects available yet.</p>
          )}
        </div>

        {/* Projekt-Liste als Cards */}
        <div className="md:w-3/5 flex flex-wrap gap-4 justify-center p-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-lg w-64 text-center"
            >
              {project.name}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
