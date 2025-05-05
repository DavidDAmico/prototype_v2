"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number>(0);
  const [newPassword, setNewPassword] = useState("");
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
        if (data.users.length > 0) {
          setSelectedUser(data.users[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchUsers();
  }, []);

  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2)
      return parts.pop()?.split(";").shift() || null;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) {
      setError("Bitte wählen Sie einen Benutzer und geben Sie ein neues Passwort ein.");
      return;
    }
    setError("");
    try {
      const csrfToken = getCookie("csrf_access_token");
      const res = await fetch("http://localhost:9000/admin/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({ user_id: selectedUser, new_password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Ändern des Kennworts.");
      }
      setSuccess("Kennwort erfolgreich geändert!");
      setNewPassword("");
      setTimeout(() => router.push("/admin"), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="bg-blue-100 dark:bg-blue-200 p-8 rounded-lg shadow-lg w-full max-w-md text-white mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">Kennwort ändern</h2>
        {error && <p className="mb-4 text-red-200 text-center">{error}</p>}
        {success && <p className="mb-4 text-green-200 text-center">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Benutzer auswählen <span className="text-red-200">*</span>
            </label>
            <select
              name="selectedUser"
              value={selectedUser}
              onChange={(e) => setSelectedUser(Number(e.target.value))}
              className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username} (ID: {user.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Neues Kennwort <span className="text-red-200">*</span>
            </label>
            <input
              type="password"
              name="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
            />
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-200 transition font-semibold"
            >
              Kennwort ändern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
