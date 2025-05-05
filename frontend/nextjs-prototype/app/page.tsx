import Link from 'next/link';
import Image from 'next/image';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-background text-foreground transition-none">
      {/* Header */}
      <div className="flex w-full max-w-6xl justify-between items-center py-6 bg-gray-100 dark:bg-header-background px-4 rounded-lg shadow-md">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Image
            src="/logo.svg"  // Pfad zum SVG-Logo in /public/
            width={50}         // Logo-Größe in Pixeln
            height={50}
            alt="Prototype Logo"
            className="w-12 h-12" // Tailwind-Klassen für responsive Größe
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-blue-400">Evaluation tool for early stage emerging technologies</h1>
        </div>

        {/* Login Button */}
        <Link
          href="/login"
          className="flex items-center gap-3 rounded-lg bg-blue-600 dark:bg-blue-500 px-6 py-2 text-white text-sm font-medium transition hover:bg-blue-500 dark:hover:bg-blue-400"
        >
          <span>Login</span>
          <ArrowRightIcon className="w-5" />
        </Link>
      </div>
      
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center max-w-6xl mt-10">
        {/* Text Content */}
        <div className="md:w-2/5 text-center md:text-left p-6">
        <h2 className="text-4xl font-bold text-foreground dark:text-white">
          Welcome<span className="text-blue-600 dark:text-blue-400">!</span>
        </h2>

        <p className="mt-4 text-foreground dark:text-white">
          If you have any further questions, please contact Max Rettenmeier.
        </p>





        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-3 bg-gray-900 dark:bg-gray-700 text-white px-6 py-3 rounded-lg transition hover:bg-gray-700 dark:hover:bg-gray-600"
        >
          <span>More informations</span>
          <ArrowRightIcon className="w-5" />
        </Link>


        </div>
        
        {/* Hero Image */}
        <div className="md:w-3/5 flex justify-center p-6">
          <Image
            src="/hero-desktop.png"
            width={1000}
            height={600}
            className="hidden md:block rounded-lg shadow-lg dark:shadow-gray-900"
            alt="Hero Image Desktop"
          />
          <Image
            src="/hero-mobile.png"
            width={500}
            height={600}
            className="block md:hidden rounded-lg shadow-lg dark:shadow-gray-900"
            alt="Hero Image Mobile"
          />
        </div>
      </div>
    </main>
  );
}
