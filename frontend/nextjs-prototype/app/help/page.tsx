import { EnvelopeIcon, PhoneIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

export default function HelpPage() {
  const contacts = [
    { name: 'John Doe', email: 'john.doe@example.com', phone: '+49 123 456 789' },
    { name: 'Jane Smith', email: 'jane.smith@example.com' },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Ansprechpartner</h1>
        <ul className="mt-4 space-y-6">
          {contacts.map((contact, index) => (
            <li
              key={index}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-gray-50 shadow-sm"
            >
              <div>
                <h2 className="text-lg font-medium text-gray-800">{contact.name}</h2>
                <p className="mt-1 flex items-center gap-2 text-gray-600">
                  <EnvelopeIcon className="h-5 w-5 text-blue-500" />
                  <a href={`mailto:${contact.email}`} className="hover:underline">
                    {contact.email}
                  </a>
                </p>
                {contact.phone && (
                  <p className="mt-1 flex items-center gap-2 text-gray-600">
                    <PhoneIcon className="h-5 w-5 text-green-500" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">
                      {contact.phone}
                    </a>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Zurück zur Startseite Button */}
        <div className="mt-4 text-center">
          <Link href="/">
            <button
              className="w-full py-2 px-4 rounded-lg bg-gray-600 text-white font-medium text-sm hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Zurück zur Startseite
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
