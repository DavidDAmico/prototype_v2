"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Interface für User (Experten)
interface User {
  id: number;
  username: string;
}

export default function CreateCasePage() {
  const router = useRouter();

  // Schritt im Wizard (1 bis 5)
  const [step, setStep] = useState(1);

  // Schritt 1: Basis-Informationen
  const [caseName, setCaseName] = useState("");
  const [caseType, setCaseType] = useState<"intern" | "extern">("intern");
  const [showEvaluation, setShowEvaluation] = useState(false);

  // Schritt 2: Experten – alle vorhandenen User
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Gefilterte User basierend auf dem Suchbegriff
  const filteredUsers = allUsers.filter((user) =>
    user.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Schritt 3: Kriterien (dynamisch) – initial ein leeres Feld
  const [criteria, setCriteria] = useState<string[]>([""]);

  // Schritt 4: Technologien (dynamisch) – initial ein leeres Feld
  const [technologies, setTechnologies] = useState<string[]>([""]);

  // User laden – alle User (auch Master)
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("http://localhost:9000/auth/users", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Fehler beim Laden der User");
        const data = await res.json();
        setAllUsers(data.users);
      } catch (error: any) {
        console.error(error.message);
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

  // Navigation zwischen den Schritten
  function nextStep() {
    setStep((prev) => Math.min(prev + 1, 5));
  }
  function prevStep() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  // Dynamisches Hinzufügen/Entfernen von Kriterien
  function addCriterion() {
    if (criteria.length < 30) {
      setCriteria([...criteria, ""]);
    }
  }
  function removeCriterion(index: number) {
    setCriteria(criteria.filter((_, i) => i !== index));
  }

  // Dynamisches Hinzufügen/Entfernen von Technologien
  function addTechnology() {
    if (technologies.length < 30) {
      setTechnologies([...technologies, ""]);
    }
  }
  function removeTechnology(index: number) {
    setTechnologies(technologies.filter((_, i) => i !== index));
  }

  // Abschicken: Case speichern (nur die vom Backend erwarteten Felder)
  async function handleSubmit() {
    const projectId = 1; // Beispiel: feste Projekt-ID, passe an
    // Mapping: "intern" -> "internal", "extern" -> "external"
    const mappedCaseType = caseType === "intern" ? "internal" : "external";

    const payload = {
      project_id: projectId,
      case_type: mappedCaseType,
      show_results: showEvaluation,
      assigned_users: selectedUserIds, // Hier werden die ausgewählten User übermittelt
    };

    console.log("Erstelle Case mit Payload:", payload);

    try {
      const res = await fetch("http://localhost:9000/cases/create", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Fehler beim Erstellen des Cases");
      }
      alert("Case wurde erfolgreich erstellt!");
      router.push("/admin");
    } catch (error: any) {
      console.error(error.message);
      alert("Fehler beim Speichern des Cases. Siehe Konsole.");
    }
  }

  return (
    <div className="fixed-blue-frame bg-blue-100 dark:bg-blue-200 p-6 rounded-lg space-y-6 text-black">
      <h2 className="text-2xl font-bold text-center">Case-Erstellung</h2>

      {/* Schrittanzeige */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((num) => (
          <div
            key={num}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === num
                ? "bg-blue-600 text-white"
                : "bg-gray-300 text-black"
            }`}
          >
            {num}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="font-semibold">Schritt 1: Basis-Informationen</p>
          <div>
            <label className="block text-sm font-medium mb-1">
              Case Name (optional):
            </label>
            <input
              type="text"
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              className="w-full p-2 rounded border border-gray-300"
              placeholder="z.B. 'Marktstudie Q4'"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Case-Typ:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  value="intern"
                  checked={caseType === "intern"}
                  onChange={() => setCaseType("intern")}
                />
                Intern
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  value="extern"
                  checked={caseType === "extern"}
                  onChange={() => setCaseType("extern")}
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
              />
              <span>Auswertung anzeigen?</span>
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4" ref={dropdownRef}>
          <p className="font-semibold">Schritt 2: Experten auswählen</p>
          <p>Wähle die User, die an diesem Case teilnehmen sollen.</p>
          {/* Custom Multi-Select Dropdown */}
          <div className="relative">
            <div
              className="border rounded p-2 cursor-pointer"
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              {selectedUserIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedUserIds.map((id) => {
                    const user = allUsers.find((u) => u.id === id);
                    return (
                      <div
                        key={id}
                        className="bg-blue-200 text-blue-800 px-2 py-1 rounded"
                      >
                        {user ? user.username : id}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-gray-500">Experten auswählen...</span>
              )}
            </div>
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full border rounded bg-white">
                <input
                  type="text"
                  placeholder="User suchen..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full p-2 border-b"
                />
                <ul className="max-h-60 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <li
                      key={user.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        // Toggle selection
                        if (selectedUserIds.includes(user.id)) {
                          setSelectedUserIds(
                            selectedUserIds.filter((id) => id !== user.id)
                          );
                        } else {
                          setSelectedUserIds([...selectedUserIds, user.id]);
                        }
                      }}
                    >
                      {user.username} (ID: {user.id})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="font-semibold">Schritt 3: Kriterien</p>
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
                  className="p-2 rounded border border-gray-300 flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeCriterion(index)}
                  className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white text-black transition hover:bg-red-500 hover:text-white"
                >
                  <Image
                    src="/icons/delete.png"
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
              className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white text-black transition hover:bg-green-500 hover:text-white"
              title="Kriterium hinzufügen"
            >
              <Image
                src="/icons/create-case.png"
                alt="Add Criterion"
                width={16}
                height={16}
              />
            </button>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="font-semibold">Schritt 4: Technologien</p>
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
                  className="p-2 rounded border border-gray-300 flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeTechnology(index)}
                  className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white text-black transition hover:bg-red-500 hover:text-white"
                  title="Technologie entfernen"
                >
                  <Image
                    src="/icons/delete.png"
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
              className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white text-black transition hover:bg-green-500 hover:text-white"
              title="Technologie hinzufügen"
            >
              <Image
                src="/icons/create-case.png"
                alt="Add Technology"
                width={16}
                height={16}
              />
            </button>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <p className="font-semibold">Schritt 5: Übersicht &amp; Speichern</p>
          <div className="bg-white p-4 rounded shadow space-y-2">
            <p>
              <strong>Case Name:</strong> {caseName || "(kein Name)"}
            </p>
            <p>
              <strong>Typ:</strong> {caseType}
            </p>
            <p>
              <strong>Auswertung anzeigen:</strong>{" "}
              {showEvaluation ? "Ja" : "Nein"}
            </p>
            <p>
              <strong>Experten:</strong>{" "}
              {selectedUserIds.length > 0
                ? selectedUserIds.join(", ")
                : "(keine)"}
            </p>
            <p>
              <strong>Kriterien:</strong>{" "}
              {criteria.length > 0 ? criteria.join(", ") : "(keine)"}
            </p>
            <p>
              <strong>Technologien:</strong>{" "}
              {technologies.length > 0 ? technologies.join(", ") : "(keine)"}
            </p>
          </div>
          <p className="text-gray-700">
            Wenn alles passt, klicke auf <em>Speichern</em>.
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition"
              title="Case speichern"
            >
              Speichern
            </button>
          </div>
        </div>
      )}

      {/* Navigation zwischen den Schritten als Action-Buttons */}
      <div className="flex justify-between mt-6">
        <div className="flex items-center">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white text-blue-600 transition hover:bg-blue-600 hover:text-white"
              title="Vorheriger Schritt"
            >
              <Image
                src="/icons/left-arrow.png"
                alt="Back"
                width={20}
                height={20}
              />
            </button>
          ) : (
            // Platzhalter, damit der Next-Button rechts ausgerichtet bleibt
            <div className="w-10" />
          )}
        </div>
        <div className="flex items-center">
          {step < 5 && (
            <button
              onClick={nextStep}
              className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white text-blue-600 transition hover:bg-blue-600 hover:text-white"
              title="Nächster Schritt"
            >
              <Image
                src="/icons/right-arrow.png"
                alt="Next"
                width={20}
                height={20}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
