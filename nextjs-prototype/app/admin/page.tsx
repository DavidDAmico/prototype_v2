import useAuth from '../lib/useAuth';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <p className="text-foreground">Lädt...</p>;
  if (!user || user.role !== 'master') {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 transition-colors">
      <h1 className="text-2xl font-bold">Admin-Bereich</h1>
      <p className="mt-4">Hier kannst du neue Projekte erstellen:</p>

      <button className="mt-6 px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-500 dark:hover:bg-green-400 transition">
        Neues Projekt anlegen
      </button>
    </div>
  );
}
