"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface ActionConfig {
  title: string;
  createNewText: string;
  createNewPath: string;
}

const getActionConfig = (action: string | null): ActionConfig => {
  switch (action) {
    case "createUser":
      return {
        title: "Benutzer erfolgreich erstellt",
        createNewText: "Einen weiteren User erstellen",
        createNewPath: "/create-user"
      };
    case "editUser":
      return {
        title: "Benutzer erfolgreich bearbeitet",
        createNewText: "Einen weiteren User bearbeiten",
        createNewPath: "/edit-user"
      };
    case "deleteUser":
      return {
        title: "Benutzer erfolgreich gelöscht",
        createNewText: "Einen weiteren User bearbeiten",
        createNewPath: "/edit-user"
      };
    case "createCase":
      return {
        title: "Fall erfolgreich erstellt",
        createNewText: "Einen weiteren Fall erstellen",
        createNewPath: "/create-case"
      };
    case "editCase":
      return {
        title: "Fall erfolgreich bearbeitet",
        createNewText: "Einen weiteren Fall bearbeiten",
        createNewPath: "/cases"
      };
    default:
      return {
        title: "Aktion erfolgreich",
        createNewText: "Zurück",
        createNewPath: "/dashboard"
      };
  }
};

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const action = searchParams.get("action");
  const config = getActionConfig(action);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="fixed-blue-frame rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-2xl font-semibold text-gray-900">
            {config.title}
          </h2>
          <p className="mt-2 text-gray-600">
            Die Aktion wurde erfolgreich ausgeführt.
          </p>

          <div className="mt-8 space-y-4">
            <Link
              href={config.createNewPath}
              className="block w-full px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold border border-gray-300"
            >
              {config.createNewText}
            </Link>
            <Link
              href="/dashboard"
              className="block w-full px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold border border-gray-300"
            >
              Zurück zum Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
