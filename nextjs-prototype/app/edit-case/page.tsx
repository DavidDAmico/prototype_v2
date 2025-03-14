"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import useAuth from "../lib/useAuth";

interface Case {
  id: number;
  project_id: number;
  case_name?: string;
  case_type: "internal" | "external";
  show_results: boolean;
  experts?: number[];
  criteria?: string[];
  technologies?: string[];
  closed?: boolean;
  created_at: string;
}

interface User {
  id: number;
  username: string;
}

export default function EditCasePage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [availableCases, setAvailableCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

  // Formularfelder (werden nach Auswahl eines Falls geladen)
  const [caseName, setCaseName] = useState("");
  const [caseType, setCaseType] = useState<"intern" | "extern">("intern");
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [criteria, setCriteria] = useState<string[]>([""]);
  const [technologies, setTechnologies] = useState<string[]>([""]);
  const [isClosed, setIsClosed] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Experten-Auswahl
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // CSRF-Cookie lesen
  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  }

  // Lade verfügbare Cases für den aktuell eingeloggten Master
  useEffect(() => {
    if (user && (user as any).user_id) {
      async function fetchCases() {
        try {
          const res = await fetch(
            `http://localhost:9000/cases/assigned/${(user as any).user_id}`,
            { credentials: "include" }
          );
          if (!res.ok) {
            throw new Error("Fehler beim Laden der Cases");
          }
          const data = await res.json();
          setAvailableCases(data);
          if (data.length > 0) {
            setSelectedCaseId(data[0].id);
          }
        } catch (error: any) {
          console.error(error.message);
        }
      }
      fetchCases();
    }
  }, [user]);

  // Lade alle User für die Expertenauswahl
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("http://localhost:9000/auth/users", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Fehler beim Laden der User");
        const data = await res.json();
        setAllUsers(data.users);
      } catch (error) {
        console.error(error);
      }
    }
    fetchUsers();
  }, []);

  // Schließt das Dropdown, wenn außerhalb geklickt wird
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Wenn ein Case ausgewählt wurde, lade dessen Daten und befülle die Formularfelder
  useEffect(() => {
    if (!selectedCaseId) return;
    async function fetchCaseDetails() {
      setFormLoading(true);
      try {
        const res = await fetch(
          `http://localhost:9000/cases/${selectedCaseId}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          throw new Error("Fehler beim Laden der Falldaten");
        }
        const data: Case = await res.json();
        setCaseName(data.case_name || "");
        setCaseType(data.case_type === "internal" ? "intern" : "extern");
        setShowEvaluation(data.show_results);
        setSelectedUserIds(data.experts || []);
        setCriteria(data.criteria && data.criteria.length > 0 ? data.criteria : [""]);
        setTechnologies(data.technologies && data.technologies.length > 0 ? data.technologies : [""]);
        setIsClosed(data.closed || false);
      } catch (error: any) {
        console.error("Fehler beim Laden des Falls:", error.message);
      } finally {
        setFormLoading(false);
      }
    }
    fetchCaseDetails();
  }, [selectedCaseId]);

  // Filtere die Experten basierend auf dem Suchbegriff
  const filteredUsers = allUsers.filter((user) =>
    user.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Handler für dynamisches Hinzufügen/Entfernen von Kriterien
  const addCriterion = () => {
    if (criteria.length < 30) setCriteria([...criteria, ""]);
  };
  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  // Handler für dynamisches Hinzufügen/Entfernen von Technologien
  const addTechnology = () => {
    if (technologies.length < 30) setTechnologies([...technologies, ""]);
  };
  const removeTechnology = (index: number) => {
    setTechnologies(technologies.filter((_, i) => i !== index));
  };

  // Handler für den Submit: Fall aktualisieren
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCaseId) return;
    const projectId = 1; // Beispiel: feste Projekt-ID
    const mappedCaseType = caseType === "intern" ? "internal" : "external";
    const payload = {
      project_id: projectId,
      case_name: caseName.trim() || null,
      case_type: mappedCaseType,
      show_results: showEvaluation,
      experts: selectedUserIds,
      criteria,
      technologies,
      closed: isClosed,
    };
    console.log("Update Case mit Payload:", payload);
    try {
      const res = await fetch(`http://localhost:9000/cases/${selectedCaseId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Fehler beim Aktualisieren des Falls");
      }
      alert("Case erfolgreich aktualisiert!");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Fehler beim Aktualisieren des Falls:", error.message);
      alert("Fehler beim Aktualisieren des Cases. Siehe Konsole.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Lade User-Daten...</p>
      </div>
    );
  }

  return (
    <div className="fixed-blue-frame bg-blue-100 dark:bg-blue-200 p-6 rounded-lg space-y-6 text-black">
      {/* Dropdown zur Fall-Auswahl */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Wähle einen Case zum Bearbeiten:
        </label>
        <select
          value={selectedCaseId || ""}
          onChange={(e) => setSelectedCaseId(Number(e.target.value))}
          className="w-full p-2 border rounded-md focus:ring-blue-300 focus:border-blue-300"
        >
          <option value="" disabled>
            -- Bitte auswählen --
          </option>
          {availableCases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.case_name ? c.case_name : `Case ${c.id}`} (Erstellt:{" "}
              {new Date(c.created_at).toLocaleDateString("de-DE")})
            </option>
          ))}
        </select>
      </div>

      {selectedCaseId && formLoading && <p>Lade Falldaten...</p>}

      {selectedCaseId && !formLoading && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold text-center">Case bearbeiten</h2>
          {isClosed && (
            <p className="text-red-600 font-semibold text-center">
              Dieser Case ist geschlossen – Änderungen sind nicht möglich.
            </p>
          )}

          {/* Basis-Informationen */}
          <div className="space-y-4">
            <p className="font-semibold">Basis-Informationen</p>
            <div>
              <label className="block text-sm font-medium mb-1">
                Case Name:
              </label>
              <input
                type="text"
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                disabled={isClosed}
                className="w-full p-2 rounded border border-gray-300"
                placeholder="z.B. 'Marktstudie Q4'"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Case-Typ:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    value="intern"
                    checked={caseType === "intern"}
                    onChange={() => setCaseType("intern")}
                    disabled={isClosed}
                  />
                  Intern
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    value="extern"
                    checked={caseType === "extern"}
                    onChange={() => setCaseType("extern")}
                    disabled={isClosed}
                  />
                  Extern
                </label>
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showEvaluation}
                  onChange={(e) => setShowEvaluation(e.target.checked)}
                  disabled={isClosed}
                />
                <span>Ergebnisse anzeigen?</span>
              </label>
            </div>
            {/* Status-Toggle */}
            <div>
              <label className="block text-sm font-medium">Case Status</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="caseStatus"
                    value="open"
                    checked={!isClosed}
                    onChange={() => setIsClosed(false)}
                  />
                  Offen
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="caseStatus"
                    value="closed"
                    checked={isClosed}
                    onChange={() => setIsClosed(true)}
                  />
                  Geschlossen
                </label>
              </div>
              {isClosed && (
                <p className="text-red-600 text-sm mt-2">
                  Der Case ist geschlossen – Änderungen sind nicht möglich.
                </p>
              )}
            </div>
          </div>

          {/* Experten-Auswahl */}
          <div className="space-y-4">
            <p className="font-semibold">Experten auswählen</p>
            {/* Anzeige aktuell zugewiesener Experten als Chips */}
            {selectedUserIds.length > 0 && (
              <div className="mb-2">
                <p className="text-sm font-medium">Aktuell zugewiesen:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedUserIds.map((id) => {
                    const assignedUser = allUsers.find((u) => u.id === id);
                    return assignedUser ? (
                      <span
                        key={id}
                        className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-sm"
                      >
                        {assignedUser.username}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            <div className="max-h-60 overflow-y-auto border rounded p-2 bg-white">
              {allUsers.length === 0 ? (
                <p className="text-gray-600">Keine User gefunden.</p>
              ) : (
                allUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 py-1 px-2 hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserIds((prev) => [...prev, user.id]);
                        } else {
                          setSelectedUserIds((prev) =>
                            prev.filter((id) => id !== user.id)
                          );
                        }
                      }}
                      disabled={isClosed}
                    />
                    <span>
                      {user.username} (ID: {user.id})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Kriterien */}
          <div className="space-y-4">
            <p className="font-semibold">Kriterien</p>
            <div className="space-y-2">
              {criteria.map((crit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Kriterium #${index + 1}`}
                    value={crit}
                    onChange={(e) => {
                      const updated = [...criteria];
                      updated[index] = e.target.value;
                      setCriteria(updated);
                    }}
                    disabled={isClosed}
                    className="p-2 rounded border border-gray-300 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeCriterion(index)}
                    disabled={isClosed}
                    className="bg-red-500 hover:bg-red-600 text-white rounded p-2"
                  >
                    <Image
                      src="/icons/trash.png"
                      alt="Remove"
                      width={16}
                      height={16}
                    />
                  </button>
                </div>
              ))}
            </div>
            {criteria.length < 30 && (
              <button
                type="button"
                onClick={addCriterion}
                disabled={isClosed}
                className="bg-white text-blue-600 rounded hover:bg-gray-200 transition px-3 py-1 flex items-center gap-2"
              >
                <Image src="/icons/plus.png" alt="Add" width={16} height={16} />
                <span>Kriterium hinzufügen</span>
              </button>
            )}
          </div>

          {/* Technologien */}
          <div className="space-y-4">
            <p className="font-semibold">Technologien</p>
            <div className="space-y-2">
              {technologies.map((tech, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Technologie #${index + 1}`}
                    value={tech}
                    onChange={(e) => {
                      const updated = [...technologies];
                      updated[index] = e.target.value;
                      setTechnologies(updated);
                    }}
                    disabled={isClosed}
                    className="p-2 rounded border border-gray-300 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeTechnology(index)}
                    disabled={isClosed}
                    className="bg-red-500 hover:bg-red-600 text-white rounded p-2"
                  >
                    <Image
                      src="/icons/trash.png"
                      alt="Remove"
                      width={16}
                      height={16}
                    />
                  </button>
                </div>
              ))}
            </div>
            {technologies.length < 30 && (
              <button
                type="button"
                onClick={addTechnology}
                disabled={isClosed}
                className="bg-white text-blue-600 rounded hover:bg-gray-200 transition px-3 py-1 flex items-center gap-2"
              >
                <Image src="/icons/plus.png" alt="Add" width={16} height={16} />
                <span>Technologie hinzufügen</span>
              </button>
            )}
          </div>

          {/* Submit-Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isClosed}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition"
              title="Case speichern"
            >
              Speichern
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
