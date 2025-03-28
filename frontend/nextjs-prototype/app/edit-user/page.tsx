"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface User {
  id: number;
  username: string;  // This is the email
  role: string;
  customFields: string[];
}

interface FormData {
  username: string;  // This is the email
  role: string;
  customFields: string[];
  newPassword: string;
}

export default function EditUserPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [userData, setUserData] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: "",  // This is the email
    role: "",
    customFields: [],
    newPassword: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        if (!res.ok) throw new Error("Error loading users");
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
          throw new Error("Error loading user details");
        const data = await res.json();
        setUserData(data.user);
        setFormData({
          username: data.user.username,
          role: data.user.role,
          customFields: data.user.customFields || [],
          newPassword: ""
        });
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

  // Click-Handler für das Dropdown
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId);
    setDropdownOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('customField')) {
      const index = parseInt(name.replace('customField', ''));
      const newCustomFields = [...formData.customFields];
      newCustomFields[index] = value;
      setFormData(prev => ({ ...prev, customFields: newCustomFields }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addCustomField = () => {
    if (formData.customFields.length < 5) {
      setFormData(prev => ({
        ...prev,
        customFields: [...prev.customFields, ""]
      }));
    }
  };

  const removeCustomField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username) {
      setError("Email address is required");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.username)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      const csrfToken = getCookie("csrf_access_token");

      const res = await fetch("http://localhost:9000/admin/edit-user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: selectedUserId,
          username: formData.username,
          role: formData.role,
          new_password: formData.newPassword || undefined,
          customFields: formData.customFields.filter(field => field.trim() !== "")
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error updating user");
      }

      const data = await res.json();
      
      // Update user list and display
      const updatedUser: User = {
        id: selectedUserId,
        username: formData.username,
        role: formData.role,
        customFields: formData.customFields
      };
      setUserData(updatedUser);
      setUsers(prev => prev.map(u => u.id === selectedUserId ? updatedUser : u));
      
      // Weiterleitung zur Success-Seite
      router.push("/success?action=editUser");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // User löschen
  const handleDelete = async (userId: number) => {
    if (!confirm("Do you really want to delete this user?")) return;
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
        console.error("Error deleting user:", text);
        throw new Error("Error deleting user.");
      }
      setSuccess("User deleted successfully!");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (userId === selectedUserId) {
        setUserData(null);
        setSelectedUserId(0);
      }
      // Weiterleitung zur Success-Seite
      router.push("/success?action=deleteUser");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="bg-blue-100 dark:bg-blue-200 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100 text-center">
          Edit User
        </h2>

        {/* User Selection Dropdown */}
        <div className="relative mb-6" ref={dropdownRef}>
          <div
            className="p-3 border rounded-lg bg-white cursor-pointer flex justify-between items-center"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span>{userData?.username || "Select a user"}</span>
            <svg
              className={`w-5 h-5 transform transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Search input */}
          {dropdownOpen && (
            <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg">
              <input
                type="text"
                placeholder="Search users..."
                className="w-full p-2 border-b"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleUserSelect(user.id)}
                  >
                    {user.username}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {selectedUserId !== 0 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Email field */}
              <div>
                <label className="block text-sm font-medium text-black">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Role field */}
              <div>
                <label className="block text-sm font-medium text-black">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="master">Master</option>
                </select>
              </div>

              {/* New Password field */}
              <div>
                <label className="block text-sm font-medium text-black">
                  New Password (optional)
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                />
                <div className="mt-2 flex items-center">
                  <input
                    id="show-password"
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                    className="mr-2"
                  />
                  <label htmlFor="show-password" className="text-sm text-gray-700">
                    Show password
                  </label>
                </div>
              </div>

              {/* Custom Fields Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-black">
                    Custom Fields (optional)
                  </label>
                  <span className="text-sm text-gray-500">
                    {formData.customFields.filter(field => field.trim() !== "").length}/5 fields
                  </span>
                </div>
                {formData.customFields.map((field, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      name={`customField${index}`}
                      value={field}
                      onChange={handleChange}
                      placeholder={`Custom Field ${index + 1}`}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField(index)}
                      className="custom-action-button p-2 rounded-lg bg-white text-gray-700 hover:bg-red-500 hover:text-white transition border border-gray-300"
                    >
                      <Image
                        src="/icons/delete.png"
                        alt="Remove"
                        width={16}
                        height={16}
                      />
                    </button>
                  </div>
                ))}
                {formData.customFields.length < 5 && (
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="custom-action-button flex items-center gap-2 p-2 rounded-lg bg-white text-gray-700 hover:bg-green-500 hover:text-white transition border border-gray-300"
                  >
                    <div className="flex items-center">
                      <Image
                        src="/icons/create-case.png"
                        alt="Add"
                        width={16}
                        height={16}
                      />
                      <span className="ml-2">Add Field</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-4">
              {/* Save Button */}
              <button
                type="submit"
                className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white hover:bg-green-600 transition text-white"
                title="Save Changes"
              >
                <Image
                  src="/icons/save.png"
                  alt="Save"
                  width={20}
                  height={20}
                  className="icon-save"
                />
              </button>
              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDelete(selectedUserId)}
                className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white hover:bg-red-600 transition text-white"
                title="Delete User"
              >
                <Image
                  src="/icons/delete.png"
                  alt="Delete"
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
