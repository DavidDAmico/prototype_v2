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
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;

    async function fetchUser() {
      try {
        const res = await fetch("http://localhost:9000/auth/protected", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!isMounted) return;
        console.log("📡 Antwort von /protected:", res);

        if (!res.ok) {
          throw new Error("Token invalid or expired");
        }

        const data = await res.json();
        if (!isMounted) return;
        
        console.log("✅ User-Daten erhalten:", data);
        setUser(data.user);
        setLoading(false);
      } catch (error) {
        if (!isMounted) return;
        
        console.error("❌ Fehler beim Abruf der User-Daten:", error);
        setUser(null);
        
        // Only redirect to login if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          router.push("/login");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [router]);

  return { user, loading, isMaster: user?.role === "master" };
}
