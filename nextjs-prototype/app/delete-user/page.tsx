"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function DeleteUserPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("http://localhost:9000/auth/users", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Fehler beim Laden der Nutzer");
        const data = await res.json();
        setUsers(data.users);
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchUsers();
  }, []);

  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null;
    }
    return null;
  }

  const handleDelete = async (userId: number) => {
    if (!confirm("Möchten Sie diesen Benutzer wirklich löschen?")) return;
    try {
      const csrfToken = getCookie("csrf_access_token");

      const res = await fetch(`http://localhost:9000/admin/delete-user/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Löschen des Users.");
      }
      setSuccess("Benutzer erfolgreich gelöscht!");
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const masters = users.filter((user) => user.role === "master");
  const normalUsers = users.filter((user) => user.role === "user");

  return (
    <div className="flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-8">Benutzer löschen</h2>
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
        {/* Linke Spalte: Master */}
        <div className="flex-1 bg-blue-100 dark:bg-blue-200 p-8 rounded-lg shadow-lg text-black">
          <h3 className="text-xl font-semibold mb-4">Master</h3>
          {masters.length === 0 ? (
            <p>Keine Master gefunden.</p>
          ) : (
            <div className="space-y-4">
              {masters.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between bg-white text-gray-900 p-4 rounded shadow"
                >
                  <div>
                    <p className="font-bold">{user.username}</p>
                    <p className="text-sm">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="delete-button"
                  >
                    <Image
                      src="/icons/delete.png"
                      alt="Löschen"
                      width={20}
                      height={20}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rechte Spalte: User */}
        <div className="flex-1 bg-blue-100 dark:bg-blue-200 p-8 rounded-lg shadow-lg text-black">
          <h3 className="text-xl font-semibold mb-4">User</h3>
          {normalUsers.length === 0 ? (
            <p>Keine User gefunden.</p>
          ) : (
            <div className="space-y-4">
              {normalUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between bg-white text-gray-900 p-4 rounded shadow"
                >
                  <div>
                    <p className="font-bold">{user.username}</p>
                    <p className="text-sm">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="delete-button"
                  >
                    <Image
                      src="/icons/delete.png"
                      alt="Löschen"
                      width={20}
                      height={20}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && <p className="mt-4 text-red-200">{error}</p>}
      {success && <p className="mt-4 text-green-200">{success}</p>}
      <style jsx>{`
        .delete-button {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
          transition: background 0.2s;
        }
        .delete-button:hover {
          background: red !important;
        }
      `}</style>
    </div>
  );
}
