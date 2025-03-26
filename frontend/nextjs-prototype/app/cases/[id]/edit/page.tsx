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
  const [currentTechIndex, setCurrentTechIndex] = useState(-1);
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

  const getTechCriterionRating = (techId: number, criterionId: number) => {
    return techMatrix[techId]?.[criterionId] || 0;
  };

  const calculateTechProgress = (techId: number) => {
    if (!data) return 0;
    const ratedCriteria = data.criteria.filter(criterion => 
      (techMatrix[techId]?.[criterion.id] || 0) > 0
    ).length;
    return ratedCriteria;
  };

  const calculateOverallProgress = () => {
    if (!data) return { completed: 0, total: 0 };
    const total = data.technologies.length * data.criteria.length;
    const completed = Object.keys(techMatrix).reduce((sum, techId) => {
      return sum + Object.values(techMatrix[parseInt(techId)] || {}).filter(rating => rating > 0).length;
    }, 0);
    return { completed, total };
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Vertical Navigation */}
      <div className="w-[280px] bg-white border-r border-gray-200 min-h-screen p-4">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-base font-medium">Bewertungsstatus</h2>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Kriterien */}
        <div 
          className="mb-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setCurrentTechIndex(-1)}
        >
          <div className="text-sm mb-1">Kriterien</div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">3/3 bewertet</span>
          </div>
          <div className="w-full bg-gray-100 h-1 rounded-full">
            <div className="bg-green-500 h-1 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Technologien */}
        <div className="mb-6">
          <div className="text-sm mb-1">Technologien</div>
          <div className="flex items-center gap-2 mb-2">
            {(() => {
              const { completed, total } = calculateOverallProgress();
              const isComplete = completed === total;
              return (
                <>
                  <div className={`w-2 h-2 rounded-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <span className="text-sm text-gray-600">{completed}/{total} vollständig</span>
                </>
              );
            })()}
          </div>
          <div className="w-full bg-gray-100 h-1 rounded-full">
            {(() => {
              const { completed, total } = calculateOverallProgress();
              const isComplete = completed === total;
              return (
                <div 
                  className={`${isComplete ? 'bg-green-500' : 'bg-blue-500'} h-1 rounded-full`}
                  style={{ width: `${(completed / total) * 100}%` }}
                />
              );
            })()}
          </div>
        </div>

        {/* Technology List */}
        {data.technologies.map((tech, index) => {
          const techProgress = calculateTechProgress(tech.id);
          const isTechComplete = techProgress === data.criteria.length;
          return (
            <div 
              key={tech.id} 
              className="mb-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setCurrentTechIndex(index)}
            >
              <div className={`p-3 rounded-lg ${index === currentTechIndex ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-gray-100'}`}>
                <div className="text-sm text-gray-600">{tech.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {techProgress}/{data?.criteria.length || 0} Kriterien
                </div>
                <div className="w-full bg-gray-100 h-1 rounded-full mt-2">
                  <div 
                    className={`${isTechComplete ? 'bg-green-500' : 'bg-blue-500'} h-1 rounded-full`}
                    style={{ width: `${(techProgress / (data?.criteria.length || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Main Content Area */}
        <div className="p-8">
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
          
          {currentTechIndex === -1 ? (
            /* Kriterien View */
            <div className="space-y-6">
              {data.criteria.map((criterion) => (
                <div key={criterion.id} className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium mb-4">{criterion.name}</h3>
                  <LikertScale
                    value={criterion.rating || 0}
                    onChange={(value) => handleCriterionRating(criterion.id, value)}
                    type="importance"
                  />
                </div>
              ))}
              <div className="mt-6 flex justify-end border-t border-gray-200 pt-6">
                <button
                  onClick={() => setCurrentTechIndex(0)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Zur Technologiebewertung
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            /* Technology View */
            <div className="space-y-6">
              {data.criteria.map((criterion) => (
                <div key={criterion.id} className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium mb-4">{criterion.name}</h3>
                  <LikertScale
                    value={getTechCriterionRating(data.technologies[currentTechIndex].id, criterion.id)}
                    onChange={(value) => handleTechCriterionRating(data.technologies[currentTechIndex].id, criterion.id, value)}
                    type="importance"
                  />
                </div>
              ))}
              <div className="mt-6 flex justify-end border-t border-gray-200 pt-6">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  disabled={isSaving}
                >
                  {isSaving ? 'Speichere...' : 'Bewertungen speichern'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
