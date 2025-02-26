"use client";

import { useState } from "react";
import Image from "next/image";

interface Expert {
  name: string;  // optionaler Klarname
  group: string; // Gruppenzuweisung
  // ggf. weitere Felder (Charakteristika etc.)
}

export default function CreateCasePage() {
  // Optionaler Name des Cases
  const [caseName, setCaseName] = useState("");

  // Case-Typ (intern/extern)
  const [caseType, setCaseType] = useState<"intern" | "extern">("intern");

  // Soll die Auswertung angezeigt werden?
  const [showEvaluation, setShowEvaluation] = useState(false);

  // Dynamische Arrays
  const [experts, setExperts] = useState<Expert[]>([]);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);

  // Hilfsfunktionen zum Hinzufügen/Entfernen (mit max. 30)
  function addExpert() {
    if (experts.length < 30) {
      setExperts([...experts, { name: "", group: "" }]);
    }
  }
  function removeExpert(index: number) {
    setExperts(experts.filter((_, i) => i !== index));
  }

  function addCriteria() {
    if (criteria.length < 30) {
      setCriteria([...criteria, ""]);
    }
  }
  function removeCriteria(index: number) {
    setCriteria(criteria.filter((_, i) => i !== index));
  }

  function addTechnology() {
    if (technologies.length < 30) {
      setTechnologies([...technologies, ""]);
    }
  }
  function removeTechnology(index: number) {
    setTechnologies(technologies.filter((_, i) => i !== index));
  }

  // Abschicken
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Beispiel-Objekt, das du an dein Backend schickst:
    const payload = {
      caseName: caseName.trim() || null, // optional
      caseType,
      showEvaluation,
      experts,        // Array von { name, group, ... }
      criteria,       // Array von strings
      technologies,   // Array von strings
    };

    console.log("Erstelle Case mit Daten:", payload);
    // TODO: POST an dein Backend, z.B.:
    /*
    const response = await fetch("/api/create-case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      // Fehlerbehandlung
    }
    */
    alert("Case wurde (fiktiv) erstellt!");
  }

  return (
    <div className="bg-blue-100 dark:bg-blue-200 p-6 rounded-lg space-y-4 text-black">
      <h2 className="text-2xl font-bold text-center">Case erstellen</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Case Name (optional) */}
        <div>
          <label className="block text-sm font-medium mb-1">Case Name (optional):</label>
          <input
            type="text"
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            className="w-full p-2 rounded border border-gray-300"
            placeholder="z.B. 'Marktstudie Q4' (optional)"
          />
        </div>

        {/* Case Typ: intern oder extern */}
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

        {/* Auswertung anzeigen? */}
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

        {/* Experten (dynamisch) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Experten (max. 30):
          </label>
          <div className="space-y-2">
            {experts.map((expert, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Expert #${index + 1} Name (optional)`}
                  value={expert.name}
                  onChange={(e) => {
                    const updated = [...experts];
                    updated[index].name = e.target.value;
                    setExperts(updated);
                  }}
                  className="p-2 rounded border border-gray-300 flex-1"
                />
                <input
                  type="text"
                  placeholder="Gruppe / Zuordnung"
                  value={expert.group}
                  onChange={(e) => {
                    const updated = [...experts];
                    updated[index].group = e.target.value;
                    setExperts(updated);
                  }}
                  className="p-2 rounded border border-gray-300 flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeExpert(index)}
                  className="bg-red-500 hover:bg-red-600 text-white rounded p-2"
                  title="Entfernen"
                >
                  <Image
                    src="/icons/trash.png"
                    alt="Remove Expert"
                    width={16}
                    height={16}
                  />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addExpert}
            className="mt-2 bg-white text-blue-600 rounded hover:bg-gray-200 transition px-3 py-1 flex items-center gap-2"
          >
            <Image
              src="/icons/add-user.png"
              alt="Add Expert"
              width={16}
              height={16}
            />
            <span>Expert hinzufügen</span>
          </button>
        </div>

        {/* Kriterien (dynamisch) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Kriterien (max. 30):
          </label>
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
                  onClick={() => removeCriteria(index)}
                  className="bg-red-500 hover:bg-red-600 text-white rounded p-2"
                  title="Entfernen"
                >
                  <Image
                    src="/icons/trash.png"
                    alt="Remove Criterion"
                    width={16}
                    height={16}
                  />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCriteria}
            className="mt-2 bg-white text-blue-600 rounded hover:bg-gray-200 transition px-3 py-1 flex items-center gap-2"
          >
            <Image
              src="/icons/plus.png"
              alt="Add Criterion"
              width={16}
              height={16}
            />
            <span>Kriterium hinzufügen</span>
          </button>
        </div>

        {/* Technologien (dynamisch) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Technologien (max. 30):
          </label>
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
                  className="bg-red-500 hover:bg-red-600 text-white rounded p-2"
                  title="Entfernen"
                >
                  <Image
                    src="/icons/trash.png"
                    alt="Remove Technology"
                    width={16}
                    height={16}
                  />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTechnology}
            className="mt-2 bg-white text-blue-600 rounded hover:bg-gray-200 transition px-3 py-1 flex items-center gap-2"
          >
            <Image
              src="/icons/plus.png"
              alt="Add Technology"
              width={16}
              height={16}
            />
            <span>Technologie hinzufügen</span>
          </button>
        </div>

        {/* Submit-Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition font-semibold"
          >
            Case anlegen
          </button>
        </div>
      </form>
    </div>
  );
}
