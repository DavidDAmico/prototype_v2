export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground p-6">
      <main className="flex-grow">{children}</main>
    </div>
  );
}
