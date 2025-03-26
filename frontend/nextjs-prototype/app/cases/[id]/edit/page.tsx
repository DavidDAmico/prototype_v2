"use client";

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { use } from 'react';
import useAuth from "../../../lib/useAuth";
import LikertScale from "../../../components/LikertScale";

interface TechCriteriaMatrix {
  [techId: number]: {
    [criterionId: number]: number;
  };
}

interface CaseRound {
  id: number;
  round_number: number;
  created_at: string;
}

interface Case {
  id: number;
  project_id: number;
  case_type: string;
  show_results: boolean;
  created_at: string;
  name: string;
  rounds: CaseRound[];
  criteria: Array<{
    id: number;
    name: string;
    rating?: number;
    evaluations?: Array<{ user_id: number, technology_id: number, score: number, case_round_id: number }>;
  }>;
  technologies: Array<{
    id: number;
    name: string;
  }>;
}

interface User {
  user_id: number;
  email: string;
  name?: string;
}

export default function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<'criteria' | 'tech-matrix'>('criteria');
  const [currentTechIndex, setCurrentTechIndex] = useState(0);
  const [data, setData] = useState<Case | null>(null);
  const [techMatrix, setTechMatrix] = useState<TechCriteriaMatrix>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCriterionRating = (criterionId: number, rating: number) => {
    if (!data) return;

    setData({
      ...data,
      criteria: data.criteria.map(c => 
        c.id === criterionId ? { ...c, rating } : c
      )
    });
  };

  const handleTechCriterionRating = (techId: number, criterionId: number, rating: number) => {
    setTechMatrix(prev => ({
      ...prev,
      [techId]: {
        ...(prev[techId] || {}),
        [criterionId]: rating
      }
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch case data
        const response = await fetch(`http://localhost:9000/cases/${id}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch case data');
        }

        const caseData = await response.json();
        console.log("[Page] Fetched case data:", caseData);

        // Fetch evaluations for round 1
        const evalResponse = await fetch(`http://localhost:9000/cases/${id}/evaluations/1`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        let evaluations = [];
        if (evalResponse.ok) {
          const allEvaluations = await evalResponse.json();
          // Filter evaluations by current user
          evaluations = allEvaluations.filter((e: any) => e.user_id === user.user_id);
          console.log("[Page] Fetched evaluations for user:", evaluations);
        } else {
          console.error("[Page] Failed to fetch evaluations:", await evalResponse.text());
        }

        // Group evaluations by type (criteria vs tech matrix)
        const criteriaEvals = evaluations.filter((e: any) => e.technology_id === null);
        const techMatrixEvals = evaluations.filter((e: any) => e.technology_id !== null);

        console.log("[Page] Criteria evaluations:", criteriaEvals);
        console.log("[Page] Tech matrix evaluations:", techMatrixEvals);

        // Create criteria array with ratings
        const criteria = caseData.criteria.map((c: any, index: number) => {
          const evaluation = criteriaEvals.find((e: any) => e.criterion_id === index + 1);
          const rating = evaluation ? Number(evaluation.score) : undefined; // Convert Decimal to Number
          console.log(`[Page] Setting rating for criterion ${index + 1}:`, rating);
          return {
            ...c,
            id: index + 1,
            rating
          };
        });

        // Create tech matrix from evaluations
        const techMatrix = techMatrixEvals.reduce((acc: any, evaluation: any) => {
          const techId = evaluation.technology_id;
          const score = Number(evaluation.score); // Convert Decimal to Number
          if (!acc[techId]) {
            acc[techId] = {};
          }
          acc[techId][evaluation.criterion_id] = score;
          console.log(`[Page] Setting tech matrix value for tech ${techId}, criterion ${evaluation.criterion_id}:`, score);
          return acc;
        }, {});

        console.log("[Page] Mapped criteria:", criteria);
        console.log("[Page] Mapped tech matrix:", techMatrix);

        setData({
          ...caseData,
          criteria
        });
        setTechMatrix(techMatrix);
      } catch (error) {
        console.error('[Page] Error fetching case:', error);
        setErrorMessage('Fehler beim Laden der Falldaten');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const renderLikertScale = (criterion: any) => (
    <LikertScale
      key={criterion.id}
      value={criterion.rating || 0}
      onChange={(value) => handleCriterionRating(criterion.id, value)}
      type="importance"
    />
  );

  const renderTechLikertScale = (techId: number, criterionId: number) => {
    const value = techMatrix[techId]?.[criterionId] || 0;
    console.log(`[Page] Rendering tech scale for tech ${techId}, criterion ${criterionId}, value:`, value);
    return (
      <LikertScale
        key={`${techId}-${criterionId}`}
        value={value}
        onChange={(value) => handleTechCriterionRating(techId, criterionId, value)}
        type="importance"
      />
    );
  };

  const handleSave = async () => {
    if (!user || !data) return;

    try {
      setIsSaving(true);
      const roundId = 1;

      // Save criteria ratings
      const ratingsResponse = await fetch(`http://localhost:9000/cases/${id}/ratings`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.user_id,
          round_id: roundId,
          ratings: data.criteria.reduce((acc: any, criterion: any) => {
            if (criterion.rating !== undefined) {
              acc[criterion.id] = criterion.rating;
            }
            return acc;
          }, {})
        })
      });

      if (!ratingsResponse.ok) {
        throw new Error('Failed to save ratings');
      }

      // Save tech matrix evaluations
      const techResponse = await fetch(`http://localhost:9000/cases/${id}/evaluate-tech-criteria`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.user_id,
          round_id: roundId,
          tech_criteria_matrix: techMatrix
        })
      });

      if (!techResponse.ok) {
        throw new Error('Failed to save tech matrix');
      }

      router.push(`/success?action=evaluateCase&caseId=${id}&roundId=${roundId}`);
    } catch (error) {
      console.error('[Page] Error saving case:', error);
      setErrorMessage('Fehler beim Speichern der Bewertung');
    } finally {
      setIsSaving(false);
    }
  };

  const isTechEvaluated = (techId: number) => {
    if (!data) return false;
    return data.criteria.every(criterion => 
      (techMatrix[techId]?.[criterion.id] || 0) > 0
    );
  };

  if (!user) {
    return null; // Layout will handle the loading state
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Lade Case-Daten...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Keine Daten gefunden</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-semibold">Case bearbeiten</h1>
              <div className="text-lg font-medium text-gray-600">
                Runde 1
              </div>
            </div>

            {/* Basic Info */}
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-4">Basis-Informationen</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Case ID:</span>
                  <span className="ml-2">{data.id}</span>
                </div>
                <div>
                  <span className="text-gray-600">Typ:</span>
                  <span className="ml-2">{data.case_type}</span>
                </div>
                <div>
                  <span className="text-gray-600">Erstellt am:</span>
                  <span className="ml-2">{new Date(data.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                {errorMessage}
              </div>
            )}

            {step === 'criteria' ? (
              <div>
                <h2 className="text-lg font-medium mb-6">Kriterien Bewertung</h2>
                {data.criteria.map((criterion) => (
                  <div key={criterion.id} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {criterion.name}
                    </label>
                    {renderLikertScale(criterion)}
                  </div>
                ))}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep('tech-matrix')}
                    className="px-4 py-2 text-blue-600 hover:text-blue-700"
                  >
                    Weiter zur Technologie-Matrix
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex">
                {/* Vertical Navigation */}
                <div className="w-48 border-r border-gray-200 pr-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">Technologien</h3>
                  <div className="space-y-2">
                    {data.technologies.map((tech, index) => (
                      <button
                        key={tech.id}
                        onClick={() => setCurrentTechIndex(index)}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between ${
                          index === currentTechIndex
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate">{tech.name}</span>
                        <span>
                          {isTechEvaluated(tech.id) ? (
                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : index === currentTechIndex ? (
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matrix Content */}
                <div className="flex-1 pl-6">
                  <h2 className="text-lg font-medium mb-6">
                    {data.technologies[currentTechIndex].name} bewerten
                  </h2>
                  {data.criteria.map((criterion) => (
                    <div key={criterion.id} className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {criterion.name}
                      </label>
                      {renderTechLikertScale(data.technologies[currentTechIndex].id, criterion.id)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 'tech-matrix' && (
              <div className="mt-6 flex justify-between border-t border-gray-200 pt-6">
                <button
                  onClick={() => setStep('criteria')}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700"
                >
                  ← Zurück zu Kriterien
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  disabled={isSaving}
                >
                  {isSaving ? 'Speichere...' : 'Bewertungen speichern'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
