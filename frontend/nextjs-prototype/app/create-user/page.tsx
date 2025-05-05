"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface FormData {
  username: string;
  password: string;
  role: "user" | "master";
  customFields: string[];
}

export default function CreateUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    username: "", 
    password: "",
    role: "user",
    customFields: [] 
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name.startsWith('customField')) {
      const index = parseInt(e.target.name.replace('customField', ''));
      const newCustomFields = [...formData.customFields];
      newCustomFields[index] = e.target.value;
      setFormData({ ...formData, customFields: newCustomFields });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const addCustomField = () => {
    if (formData.customFields.length < 5) {
      setFormData({
        ...formData,
        customFields: [...formData.customFields, ""]
      });
    }
  };

  const removeCustomField = (index: number) => {
    const newCustomFields = formData.customFields.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      customFields: newCustomFields
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.username)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");

    try {
      const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
        return null;
      };
      const csrfToken = getCookie("csrf_access_token");

      const res = await fetch("http://localhost:9000/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: formData.role,
          customFields: formData.customFields.filter(field => field.trim() !== "")
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error creating user.");
      }

      router.push("/success?action=createUser");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="bg-blue-100 dark:bg-blue-200 p-8 rounded-lg shadow-lg w-full max-w-md text-white">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100 text-center">
          Create User
        </h2>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
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
                placeholder="name@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black">
                Password <span className="text-red-600">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                required
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

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-black">
                  Custom Fields (optional)
                </label>
                <span className="text-sm text-gray-500">
                  {formData.customFields.filter(field => field.trim() !== "").length}/5 Fields
                </span>
              </div>
              {formData.customFields.map((field, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    name={`customField${index}`}
                    value={field}
                    onChange={handleChange}
                    placeholder={`Custom Field #${index + 1}`}
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

            <div className="flex justify-center pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Create User
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
