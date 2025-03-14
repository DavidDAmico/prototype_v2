"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password) {
      setError("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }
    setError("");

    function getCookie(name: string): string | null {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2)
        return parts.pop()?.split(";").shift() || null;
      return null;
    }
    const csrfToken = getCookie("csrf_access_token");

    try {
      const res = await fetch("http://localhost:9000/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Anlegen des Users.");
      }
      setSuccess("Benutzer wurde erfolgreich angelegt!");
      setTimeout(() => router.push("/admin"), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="bg-blue-100 dark:bg-blue-200 p-8 rounded-lg shadow-lg w-full max-w-md text-white">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Neuen Benutzer anlegen
        </h2>
        {error && <p className="mb-4 text-red-200 text-center">{error}</p>}
        {success && <p className="mb-4 text-green-200 text-center">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Username <span className="text-red-200">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Email <span className="text-red-200">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Passwort <span className="text-red-200">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Rolle</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full bg-white text-gray-900 border p-2 rounded-md focus:ring-blue-300 focus:border-blue-300"
            >
              <option value="user">User</option>
              <option value="master">Master</option>
            </select>
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-200 transition font-semibold"
            >
              Benutzer anlegen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
