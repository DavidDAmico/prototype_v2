import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  user_id: number;
  role: string; // "user" oder "master"
}

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Funktion zum Erneuern des Access Tokens
  async function refreshToken() {
    try {
      const res = await fetch('http://localhost:5001/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Sendet Cookies mit
      });

      if (!res.ok) throw new Error('Token refresh failed');

      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Fehler beim Token-Refresh:', error);
      return null;
    }
  }

  useEffect(() => {
    async function fetchUser() {
      let token = localStorage.getItem("access_token");
      console.log("🔍 Aktueller Token in localStorage:", token);
  
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
  
      try {
        const res = await fetch("http://localhost:5001/auth/protected", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
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
        localStorage.removeItem("access_token");
        setUser(null);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
  
    fetchUser();
  }, []);
  

  return { user, loading, isMaster: user?.role === 'master' };
}
