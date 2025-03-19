"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useAuth from "../../../lib/useAuth";
import Image from "next/image";

interface Case {
  id: number;
  project_id: number;
  case_type: string;
  show_results: boolean;
  created_at: string;
  criteria: {
    id: number;
    name: string;
    evaluations: Array<{
      user_id: number;
      score: number;
      created_at: string;
    }>;
  }[];
  technologies: {
    id: number;
    name: string;
  }[];
  rounds: {
    id: number;
    round_number: number;
    is_completed: boolean;
  }[];
}

interface TechCriteriaMatrix {
  [techId: number]: {
    [criterionId: number]: number;
  };
}

interface CriteriaEvaluations {
  [criterionId: number]: number;
}

interface Evaluation {
  criterion_id: number;
  score: number;
  technology_id: number | null;
}

interface User {
  user_id: number;
}

interface RoundResponse {
  id: number;
}

interface EditCasePageProps {
  // Add any props that EditCasePage component might receive
}

export default function EditCasePage(props: EditCasePageProps) {
  const params = useParams();
  const router = useRouter();
  const { user }: { user: User | null } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1 for criteria ratings, 2 for tech-criteria matrix
  const [criteriaEvaluations, setCriteriaEvaluations] = useState<CriteriaEvaluations>({});
  const [techCriteriaMatrix, setTechCriteriaMatrix] = useState<TechCriteriaMatrix>({});
  const [currentRound, setCurrentRound] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.user_id) return;

    const fetchCase = async () => {
      try {
        const res = await fetch(`http://localhost:9000/cases/${params.id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Case nicht gefunden");
        const data: Case = await res.json();
        setCaseData(data);
        
        // Set current round (use latest round or create first round)
        const latestRound = data.rounds.length > 0 
          ? data.rounds.reduce((prev, current) => 
              (current.round_number > prev.round_number) ? current : prev
            )
          : null;
        setCurrentRound(latestRound?.id || null);

        // Pre-fill existing evaluations if any
        if (latestRound) {
          const userEvals: CriteriaEvaluations = {};
          data.criteria.forEach(criterion => {
            const latestEval = criterion.evaluations
              .filter(e => e.user_id === user.user_id)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            if (latestEval) {
              userEvals[criterion.id] = latestEval.score;
            }
          });
          setCriteriaEvaluations(userEvals);
        }

        // Initialize tech-criteria matrix
        const matrix: TechCriteriaMatrix = {};
        data.technologies.forEach(tech => {
          matrix[tech.id] = {};
          data.criteria.forEach(criterion => {
            matrix[tech.id][criterion.id] = 0;
          });
        });
        setTechCriteriaMatrix(matrix);
      } catch (error) {
        console.error("Error fetching case:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [params.id, user?.user_id]);

  const handleCriteriaEvalChange = (criterionId: number, value: number): void => {
    setCriteriaEvaluations(prev => ({
      ...prev,
      [criterionId]: value
    }));
  };

  const handleTechCriteriaEvalChange = (techId: number, criterionId: number, value: number): void => {
    setTechCriteriaMatrix(prev => ({
      ...prev,
      [techId]: {
        ...prev[techId],
        [criterionId]: value
      }
    }));
  };

  const handleSaveEvaluations = async (): Promise<void> => {
    if (!currentRound) {
      // Create new round if none exists
      try {
        const res = await fetch(`http://localhost:9000/cases/${params.id}/add_round`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ round_number: 1 }),
        });
        if (!res.ok) throw new Error("Fehler beim Erstellen der Runde");
        const data: RoundResponse = await res.json();
        setCurrentRound(data.id);
      } catch (error) {
        console.error("Error creating round:", error);
        return;
      }
    }

    // Save evaluations based on current step
    try {
      if (step === 1) {
        // Save criteria evaluations
        const evaluationData: Evaluation[] = Object.entries(criteriaEvaluations).map(([criterionId, score]) => ({
          criterion_id: parseInt(criterionId),
          score,
          technology_id: null // Explicitly set to null for criteria-only evaluations
        }));

        const res = await fetch(`http://localhost:9000/cases/${params.id}/evaluate`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.user_id,
            round_id: currentRound,
            evaluations: evaluationData
          }),
        });

        if (!res.ok) {
          console.error("Warning: Some evaluations may not have been saved");
          // Don't throw error, just proceed to next step
        }

        // Move to next step
        setStep(2);
      } else {
        // Save tech-criteria matrix evaluations
        const res = await fetch(`http://localhost:9000/cases/${params.id}/evaluate-tech-criteria`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user?.user_id,
            round_id: currentRound,
            tech_criteria_matrix: techCriteriaMatrix
          }),
        });

        if (!res.ok) {
          throw new Error("Fehler beim Speichern der Technologie-Kriterien Matrix");
        }

        // Navigate back to dashboard
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error saving evaluations:", error);
      // Only show error popup for tech-criteria matrix errors
      if (step === 2) {
        alert("Fehler beim Speichern der Bewertungen");
      }
    }
  };

  if (loading) {
    return <div className="p-6">Lädt...</div>;
  }

  if (!caseData) {
    return <div className="p-6">Case nicht gefunden</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Case Details</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Basis-Informationen</h2>
          <p>Case ID: {caseData.id}</p>
          <p>Typ: {caseData.case_type}</p>
          <p>Erstellt am: {new Date(caseData.created_at).toLocaleDateString("de-DE")}</p>
        </div>

        {step === 1 ? (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Kriterien Bewertung</h2>
            <div className="space-y-4">
              {caseData.criteria.map(criterion => (
                <div key={criterion.id} className="border p-4 rounded">
                  <label className="block mb-2 font-medium">
                    {criterion.name}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={criteriaEvaluations[criterion.id] || 0}
                      onChange={(e) => handleCriteriaEvalChange(criterion.id, parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <span className="w-12 text-center">
                      {criteriaEvaluations[criterion.id]?.toFixed(1) || "0.0"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Technologie-Kriterien Matrix</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2"></th>
                    {caseData.technologies.map(tech => (
                      <th key={tech.id} className="border p-2">{tech.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {caseData.criteria.map(criterion => (
                    <tr key={criterion.id}>
                      <td className="border p-2 font-medium">{criterion.name}</td>
                      {caseData.technologies.map(tech => (
                        <td key={tech.id} className="border p-2">
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={techCriteriaMatrix[tech.id]?.[criterion.id] || 0}
                            onChange={(e) => handleTechCriteriaEvalChange(
                              tech.id,
                              criterion.id,
                              parseFloat(e.target.value)
                            )}
                            className="w-full"
                          />
                          <div className="text-center">
                            {techCriteriaMatrix[tech.id]?.[criterion.id]?.toFixed(1) || "0.0"}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-400"
            >
              Zurück
            </button>
          )}
          <button
            onClick={handleSaveEvaluations}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-500 ml-auto"
          >
            {step === 1 ? "Weiter" : "Bewertungen speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
