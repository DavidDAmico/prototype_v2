"use client";

import { useState } from "react";
import { UserIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/reset-password", {
      method: "POST",
      body: JSON.stringify({ username }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    setMessage(data.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Passwort zurücksetzen</h1>
        <p className="mt-2 text-sm text-gray-600 text-center">
          Gib deinen Benutzernamen ein. Falls dieser existiert, senden wir eine E-Mail an deine hinterlegte Adresse.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Benutzername</label>
            <div className="mt-1 relative">
              <input
                type="text"
                placeholder="Dein Benutzername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <UserIcon className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-500 transition"
          >
            Passwort zurücksetzen
          </button>
        </form>

        {message && <p className="mt-4 text-center text-sm text-green-600">{message}</p>}

        {/* Zurück zur Startseite Button */}
        <div className="mt-4 text-center">
          <Link href="/">
            <button
              className="w-full py-2 px-4 rounded-lg bg-gray-600 text-white font-medium text-sm hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Zurück zur Startseite
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
