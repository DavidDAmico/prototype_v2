import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  user_id: number;
  role: string; // "user" oder "master"
}

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("http://localhost:9000/auth/protected", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          // Wichtig: Cookies (inkl. JWT) werden automatisch mitgesendet
          credentials: "include",
        });

        console.log("📡 Antwort von /protected:", res);

        if (!res.ok) {
          throw new Error("Token invalid or expired");
        }

        const data = await res.json();
        console.log("✅ User-Daten erhalten:", data);
        setUser(data.user);
      } catch (error) {
        console.error("❌ Fehler beim Abruf der User-Daten:", error);
        setUser(null);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  return { user, loading, isMaster: user?.role === "master" };
}
