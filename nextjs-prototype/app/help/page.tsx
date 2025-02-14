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

        {/* Zurück zur Hauptseite Button */}
        <div className="mt-6 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-3 bg-blue-600 text-white px-6 py-3 rounded-lg transition hover:bg-blue-500"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Zurück zur Hauptseite</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
