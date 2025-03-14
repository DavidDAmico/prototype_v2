"use client";

import { useEffect, useState, useRef } from "react";
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
  const [newPassword, setNewPassword] = useState(""); // Neues Passwort
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // CSRF-Cookie lesen
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
        const res = await fetch("http://localhost:9000/auth/users", {
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

  // Benutzerdetails laden und neues Passwortfeld zurücksetzen
  useEffect(() => {
    async function fetchUserDetails() {
      if (selectedUserId === 0) return;
      try {
        const res = await fetch(
          `http://localhost:9000/auth/user/${selectedUserId}`,
          { credentials: "include" }
        );
        if (!res.ok)
          throw new Error("Fehler beim Laden der Benutzerdetails");
        const data = await res.json();
        setUserData(data.user);
        setNewPassword(""); // Neues Passwortfeld zurücksetzen
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchUserDetails();
  }, [selectedUserId]);

  // Filtert die Nutzer basierend auf dem Suchbegriff
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(search.toLowerCase())
  );

  // Schließt das Dropdown, wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auswahl im Dropdown
  const handleUserSelect = (user: User) => {
    setUserData(null); // Alte Daten löschen
    setSelectedUserId(user.id);
    setDropdownOpen(false);
    setSearch("");
  };

  // Änderungen im Formular übernehmen
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (userData) {
      setUserData({ ...userData, [e.target.name]: e.target.value });
    }
  };

  // User speichern – komplette Nutzerdaten werden gesendet.
  // Falls ein neues Passwort eingegeben wurde, wird es als "new_password" mitgegeben.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setError("");
    setSuccess("");

    try {
      const csrfToken = getCookie("csrf_access_token");
      const payload = {
        user_id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        ...(newPassword && { new_password: newPassword }),
      };
      const res = await fetch("http://localhost:9000/admin/edit-user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Fehlerhafte Antwort:", text);
        throw new Error("Fehler beim Bearbeiten des Users.");
      }
      const data = await res.json();
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
      const res = await fetch(
        `http://localhost:9000/admin/delete-user/${userId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrfToken || "",
          },
          credentials: "include",
        }
      );
      if (!res.ok) {
        const text = await res.text();
        console.error("Fehlerhafte Antwort beim Löschen:", text);
        throw new Error("Fehler beim Löschen des Users.");
      }
      setSuccess("Benutzer erfolgreich gelöscht!");
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

        {/* Custom Dropdown zur Benutzerauswahl */}
        <div className="relative mb-4" ref={dropdownRef}>
          <label className="block text-sm font-medium">Benutzer auswählen:</label>
          <div
            className="border rounded p-2 cursor-pointer"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            {selectedUserId !== 0 ? (
              <span>
                {users.find((u) => u.id === selectedUserId)?.username || "Ausgewählt"}
              </span>
            ) : (
              <span className="text-gray-500">-- Bitte auswählen --</span>
            )}
          </div>
          {dropdownOpen && (
            <div className="absolute z-10 mt-1 w-full border rounded bg-white">
              <input
                type="text"
                placeholder="Benutzer suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-2 border-b"
              />
              <ul className="max-h-60 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <li
                    key={user.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleUserSelect(user)}
                  >
                    {user.username} (ID: {user.id})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Formular zum Bearbeiten */}
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
            {/* Neues Passwort-Feld */}
            <div>
              <label className="block text-sm font-medium">
                Neues Passwort (optional)
              </label>
              <input
                type="password"
                name="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
                placeholder="Neues Passwort"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Rolle</label>
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
              {/* Speichern-Button */}
              <button
                type="submit"
                className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white hover:bg-green-600 transition text-white"
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
              {/* Löschen-Button */}
              <button
                type="button"
                onClick={() => handleDelete(userData.id)}
                className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white hover:bg-red-600 transition text-white"
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
