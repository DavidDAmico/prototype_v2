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

export default function EditUserPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [userData, setUserData] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // CSRF Cookie lesen
  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null;
    }
    return null;
  }

  // Nutzerliste laden
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("http://localhost:5001/auth/users", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Fehler beim Laden der Nutzer");
        const data = await res.json();
        setUsers(data.users);
        if (data.users.length > 0) {
          setSelectedUserId(data.users[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchUsers();
  }, []);

  // Benutzerdetails laden
  useEffect(() => {
    async function fetchUserDetails() {
      if (selectedUserId === 0) return;
      try {
        const res = await fetch(
          `http://localhost:5001/auth/user/${selectedUserId}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Fehler beim Laden der Benutzerdetails");
        const data = await res.json();
        setUserData(data.user);
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchUserDetails();
  }, [selectedUserId]);

  // Auswahl im Dropdown
  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUserId(Number(e.target.value));
  };

  // Eingaben ändern
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (userData) {
      setUserData({ ...userData, [e.target.name]: e.target.value });
    }
  };

  // User speichern
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setError("");
    setSuccess("");

    try {
      const csrfToken = getCookie("csrf_access_token");
      const res = await fetch("http://localhost:5001/admin/edit-user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Bearbeiten des Users.");
      }
      setSuccess("Benutzerdaten erfolgreich aktualisiert!");
      setTimeout(() => router.push("/admin"), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // User löschen
  const handleDelete = async (userId: number) => {
    if (!confirm("Möchten Sie diesen Benutzer wirklich löschen?")) return;
    setError("");
    setSuccess("");

    try {
      const csrfToken = getCookie("csrf_access_token");
      const res = await fetch(`http://localhost:5001/admin/delete-user/${userId}`, {
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

      // Benutzer aus dem State entfernen
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (userId === selectedUserId) {
        setUserData(null);
        setSelectedUserId(0);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="fixed-blue-frame p-8 rounded-lg shadow-lg max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Benutzer bearbeiten / löschen
        </h2>
        {error && <p className="mb-4 text-red-700 text-center">{error}</p>}
        {success && <p className="mb-4 text-green-700 text-center">{success}</p>}

        {/* Benutzer auswählen */}
        <div className="mb-4">
          <label className="block text-sm font-medium">
            Benutzer auswählen:
          </label>
          <select
            value={selectedUserId}
            onChange={handleUserSelect}
            className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
          >
            <option value={0} disabled>
              -- Bitte auswählen --
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username} (ID: {user.id})
              </option>
            ))}
          </select>
        </div>

        {/* Formular */}
        {userData && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={userData.username}
                onChange={handleChange}
                required
                className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={userData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                Rolle
              </label>
              <select
                name="role"
                value={userData.role}
                onChange={handleChange}
                className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
              >
                <option value="user">User</option>
                <option value="master">Master</option>
              </select>
            </div>

            <div className="flex justify-center gap-4">
              {/* Speichern-Button (Icon) – grün hinterlegt */}
              <button
                type="submit"
                className="flex items-center justify-center p-2 rounded-lg bg-green-500 hover:bg-green-600 transition"
                title="Änderungen speichern"
              >
                <Image
                  src="/icons/save.png"
                  alt="Speichern"
                  width={20}
                  height={20}
                  className="icon-save"
                />
              </button>

              {/* Löschen-Button (Icon) – rot hinterlegt */}
              <button
                type="button"
                onClick={() => handleDelete(userData.id)}
                className="delete-button flex items-center justify-center p-2 rounded-lg bg-red-500 hover:bg-red-600 transition"
                title="Benutzer löschen"
              >
                <Image
                  src="/icons/delete.png"
                  alt="Löschen"
                  width={20}
                  height={20}
                  className="icon-delete"
                />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
