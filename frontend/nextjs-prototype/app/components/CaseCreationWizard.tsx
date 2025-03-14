"use client";

import { useState, useEffect } from "react";

interface RegisteredUser {
  id: number;
  username: string;
  // Weitere Felder können hier ergänzt werden
}

interface CaseData {
  caseName: string;
  caseType: "internal" | "external";
  showResults: boolean;
  // Statt eines reinen Textfeldes speichern wir hier die IDs der ausgewählten Experten
  experts: number[];
  criteria: string[];
  technologies: string[];
  // Für jeden Experten (Index entspricht der Position in experts) werden 5 Charakteristika gespeichert
  expertCharacteristics: { [expertIndex: number]: { [key: string]: string } };
}

export default function CaseCreationWizard() {
  const [step, setStep] = useState(1);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [caseData, setCaseData] = useState<CaseData>({
    caseName: "",
    caseType: "internal",
    showResults: false,
    experts: [],
    criteria: [],
    technologies: [],
    expertCharacteristics: {},
  });

  // Registrierung der User aus dem Backend laden
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("http://localhost:9000/auth/users", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Fehler beim Laden der Nutzer");
        const data = await res.json();
        setRegisteredUsers(data.users); // Annahme: { users: [...] }
      } catch (error) {
        console.error(error);
        // Dummy-Daten falls API-Aufruf fehlschlägt
        setRegisteredUsers([
          { id: 1, username: "User1" },
          { id: 2, username: "User2" },
          { id: 3, username: "User3" },
        ]);
      }
    }
    fetchUsers();
  }, []);

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  // Allgemeine Eingabe-Handler für einfache Felder
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaseData({
      ...caseData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCaseTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaseData({
      ...caseData,
      caseType: e.target.value as "internal" | "external",
    });
  };

  // Experten dynamisch verwalten über Auswahl aus den registrierten Usern
  const addExpert = () => {
    if (caseData.experts.length < 30) {
      // Füge eine leere Auswahl (0 als Platzhalter) hinzu
      setCaseData({ ...caseData, experts: [...caseData.experts, 0] });
    }
  };

  const updateExpert = (index: number, userId: number) => {
    const updated = [...caseData.experts];
    updated[index] = userId;
    setCaseData({ ...caseData, experts: updated });
  };

  // Kriterien dynamisch verwalten
  const addCriterion = () => {
    if (caseData.criteria.length < 30) {
      setCaseData({ ...caseData, criteria: [...caseData.criteria, ""] });
    }
  };

  const updateCriterion = (index: number, value: string) => {
    const updated = [...caseData.criteria];
    updated[index] = value;
    setCaseData({ ...caseData, criteria: updated });
  };

  // Technologien dynamisch verwalten
  const addTechnology = () => {
    if (caseData.technologies.length < 30) {
      setCaseData({ ...caseData, technologies: [...caseData.technologies, ""] });
    }
  };

  const updateTechnology = (index: number, value: string) => {
    const updated = [...caseData.technologies];
    updated[index] = value;
    setCaseData({ ...caseData, technologies: updated });
  };

  // Experten-Charakteristika: 5 Felder pro Experte (z. B. Herkunft, Alter, Expertise, etc.)
  const characteristicLabels = [
    "Origin",
    "Age",
    "Expertise",
    "Characteristic 4",
    "Characteristic 5",
  ];

  const updateExpertCharacteristic = (
    expertIndex: number,
    label: string,
    value: string
  ) => {
    const prev = caseData.expertCharacteristics[expertIndex] || {};
    const updated = { ...prev, [label]: value };
    setCaseData({
      ...caseData,
      expertCharacteristics: {
        ...caseData.expertCharacteristics,
        [expertIndex]: updated,
      },
    });
  };

  // Rendering der einzelnen Schritte:
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Case Details</h2>
            <label className="block mb-2">
              Case Name (optional):
              <input
                type="text"
                name="caseName"
                value={caseData.caseName}
                onChange={handleInputChange}
                className="border p-2 w-full mt-1 rounded"
              />
            </label>
            <div className="mb-4">
              <label className="mr-4">
                <input
                  type="radio"
                  name="caseType"
                  value="internal"
                  checked={caseData.caseType === "internal"}
                  onChange={handleCaseTypeChange}
                  className="mr-1"
                />
                Internal Case
              </label>
              <label>
                <input
                  type="radio"
                  name="caseType"
                  value="external"
                  checked={caseData.caseType === "external"}
                  onChange={handleCaseTypeChange}
                  className="mr-1"
                />
                External Case
              </label>
            </div>
            {/* Unabhängig vom Falltyp soll der Master entscheiden, ob Ergebnisse angezeigt werden */}
            <label className="block mb-4">
              <input
                type="checkbox"
                name="showResults"
                checked={caseData.showResults}
                onChange={(e) =>
                  setCaseData({ ...caseData, showResults: e.target.checked })
                }
                className="mr-2"
              />
              Ergebnisse anzeigen
            </label>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Experten auswählen (max 30)
            </h2>
            {caseData.experts.map((expertId, idx) => (
              <div key={idx} className="mb-2">
                <label className="block mb-1">Expert {idx + 1}:</label>
                <select
                  value={expertId}
                  onChange={(e) =>
                    updateExpert(idx, Number(e.target.value))
                  }
                  className="border p-2 w-full rounded"
                >
                  <option value={0}>-- Bitte auswählen --</option>
                  {registeredUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button
              type="button"
              onClick={addExpert}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Experten hinzufügen
            </button>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Kriterien (max 30)</h2>
            {caseData.criteria.map((criterion, idx) => (
              <input
                key={idx}
                type="text"
                value={criterion}
                placeholder={`Criterion ${idx + 1}`}
                onChange={(e) => updateCriterion(idx, e.target.value)}
                className="border p-2 mt-2 w-full rounded"
              />
            ))}
            <button
              type="button"
              onClick={addCriterion}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Kriterium hinzufügen
            </button>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Technologien (max 30)</h2>
            {caseData.technologies.map((tech, idx) => (
              <input
                key={idx}
                type="text"
                value={tech}
                placeholder={`Technology ${idx + 1}`}
                onChange={(e) => updateTechnology(idx, e.target.value)}
                className="border p-2 mt-2 w-full rounded"
              />
            ))}
            <button
              type="button"
              onClick={addTechnology}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Technologie hinzufügen
            </button>
          </div>
        );
      case 5:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Experten-Charakteristika
            </h2>
            {caseData.experts.map((_, idx) => (
              <div key={idx} className="mt-4 p-4 border rounded">
                <h3 className="font-semibold mb-2">Expert {idx + 1}</h3>
                {characteristicLabels.map((label, charIdx) => (
                  <div key={charIdx} className="mb-2">
                    <label className="mr-2">{label}:</label>
                    <input
                      type="text"
                      value={
                        caseData.expertCharacteristics[idx]?.[label] || ""
                      }
                      onChange={(e) =>
                        updateExpertCharacteristic(idx, label, e.target.value)
                      }
                      className="border p-2 w-full rounded"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      case 6:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Gruppenzuweisung & Zusammenfassung
            </h2>
            <p>
              Hier kannst du die Experten in Gruppen zusammenfassen und die
              Ergebnisse der verschiedenen Runden vergleichen. (Platzhalter)
            </p>
          </div>
        );
      default:
        return <div>Unbekannter Schritt</div>;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hier kannst du den kompletten Datensatz an deinen Backend-Endpoint senden
    console.log("Case-Daten:", caseData);
    // Beispiel: fetch("http://localhost:5000/cases/create", { method: "POST", ... })
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-3xl mx-auto space-y-6">
      {renderStep()}
      <div className="flex justify-between">
        {step > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="px-4 py-2 bg-gray-400 text-white rounded"
          >
            Zurück
          </button>
        )}
        {step < 6 && (
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Weiter
          </button>
        )}
        {step === 6 && (
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Case abschließen
          </button>
        )}
      </div>
    </form>
  );
}
