export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground p-6 transition-colors">
        <header className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-200">Admin-Bereich</h1>
        </header>
        <main className="flex-grow">{children}</main>
      </div>
    );
  }
  