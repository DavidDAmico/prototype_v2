export default function HelpLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center">
        {children}
      </div>
    );
  }
  