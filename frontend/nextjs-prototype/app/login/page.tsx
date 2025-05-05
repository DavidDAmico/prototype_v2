"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.target as HTMLFormElement);
    const username = formData.get("username");
    const password = formData.get("password");

    console.log("🔄 Login started with:", { username, password });

    try {
      const res = await fetch("http://localhost:9000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important: include credentials so cookies can be set!
        body: JSON.stringify({ username, password }),
      });

      console.log("📡 Response received from backend:", res);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Error from backend:", errorData);
        throw new Error(errorData.error || "Login failed");
      }

      console.log("✅ Login successful – Cookies have been set.");
      console.log("🔀 Redirecting to /dashboard...");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("❌ Error during login:", error.message);
      setError(error.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-md bg-background text-foreground rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-foreground">Login</h1>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <form className="mt-4 space-y-4" onSubmit={handleLogin}>
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-foreground"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="block w-full mt-1 px-3 py-2 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-input-background text-input-text border-input-border"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="block w-full mt-1 px-3 py-2 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-input-background text-input-text border-input-border"
            />
            <div className="mt-2 flex items-center">
              <input
                id="show-password"
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
                className="mr-2"
              />
              <label htmlFor="show-password" className="text-sm text-foreground">
                Show password
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="block w-full py-2 px-4 rounded-lg text-white font-medium text-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            style={{ backgroundColor: "#2563eb", color: "white" }}
          >
            Login
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/">
            <button
              className="w-full py-2 px-4 rounded-lg text-white font-medium text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              style={{ backgroundColor: "#374151", color: "white" }}
            >
              Back to homepage
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
