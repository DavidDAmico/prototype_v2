import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Login</h1>
        <form className="mt-4 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="block w-full mt-1 px-3 py-2 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="block w-full mt-1 px-3 py-2 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <Link href="/password-reset">
              <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                Passwort vergessen?
              </span>
            </Link>
            <Link href="/help">
              <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
                Hilfe
              </span>
            </Link>
          </div>

          <button
            type="submit"
            className="block w-full py-2 px-4 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Anmelden
          </button>
        </form>
      </div>
    </div>
  );
}
