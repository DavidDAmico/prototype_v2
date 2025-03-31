"use client";

import { useRouter } from 'next/navigation';
import React, { useState, useEffect, use } from 'react';
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
  users?: Array<{
    user_id: number;
    has_evaluated: boolean;
  }>;
}

interface User {
  user_id: number;
  email: string;
  name?: string;
}

export default function EditCasePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<'criteria' | 'tech-matrix'>('criteria');
  const [currentTechIndex, setCurrentTechIndex] = useState(0);
  const [data, setData] = useState<Case | null>(null);
  const [techMatrix, setTechMatrix] = useState<TechCriteriaMatrix>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [evaluations, setEvaluations] = useState<{
    criteriaEvaluations: any[];
    techMatrixEvaluations: any[];
  }>({ criteriaEvaluations: [], techMatrixEvaluations: [] });
  const [evaluationsToRedo, setEvaluationsToRedo] = useState<{
    criteria: number[];
    techMatrix: {techId: number, criterionId: number}[]
  }>({ criteria: [], techMatrix: [] });

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
        setLoading(true);
        setErrorMessage('');

        // 1. Hole Case-Daten
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
        
        // Aktuelle Runde setzen
        if (caseData.current_round) {
          setCurrentRound(caseData.current_round);
          console.log("[Page] Current round set to:", caseData.current_round);
        }

        // 2. Hole existierende Bewertungen
        const evaluationsResponse = await fetch(`http://localhost:9000/cases/${id}/evaluations`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!evaluationsResponse.ok) {
          if (evaluationsResponse.status === 404) {
            console.log('[Page] No evaluations found for case ID:', id);
            setEvaluations({ criteriaEvaluations: [], techMatrixEvaluations: [] });
            
            // Initialize case data with empty ratings
            const criteria = caseData.criteria.map((c: any) => ({
              ...c,
              rating: 0
            }));

            // Initialize empty tech matrix
            const techMatrix = caseData.technologies.reduce((acc: any, tech: any) => {
              acc[tech.id] = caseData.criteria.reduce((criteriaAcc: any, criterion: any) => {
                criteriaAcc[criterion.id] = 0;
                return criteriaAcc;
              }, {});
              return acc;
            }, {});

            setData({
              ...caseData,
              criteria
            });
            setTechMatrix(techMatrix);
            
            return;
          }
          throw new Error(`Failed to fetch evaluations: ${evaluationsResponse.status} ${evaluationsResponse.statusText}`);
        }

        const allEvaluations = await evaluationsResponse.json();
        console.log("[Page] Fetched all evaluations:", allEvaluations);
        
        // Extrahiere die Arrays aus dem Objekt
        const criteriaEvals = allEvaluations.criteriaEvaluations || [];
        const techMatrixEvals = allEvaluations.techMatrixEvaluations || [];
        
        // Filtere Evaluationen nach aktuellem Benutzer und Runde
        const filteredCriteriaEvals = criteriaEvals.filter((e: any) => 
          e.user_id === user.user_id && 
          String(e.round) === String(currentRound)
        );
        
        const filteredTechMatrixEvals = techMatrixEvals.filter((e: any) => 
          e.user_id === user.user_id && 
          String(e.round) === String(currentRound)
        );

        console.log("[Page] Criteria evaluations:", filteredCriteriaEvals);
        console.log("[Page] Tech matrix evaluations:", filteredTechMatrixEvals);

        setEvaluations({
          criteriaEvaluations: filteredCriteriaEvals,
          techMatrixEvaluations: filteredTechMatrixEvals
        });

        // 3. Wenn wir in Runde > 1 sind, hole die Bewertungen, die neu bewertet werden müssen
        if (caseData.current_round > 1 && user) {
          try {
            const reevalResponse = await fetch(`http://localhost:9000/cases/${id}/reevaluations/${user.user_id}`, {
              credentials: 'include',
            });
            
            if (reevalResponse.ok) {
              const reevalData = await reevalResponse.json();
              
              // Extrahiere die IDs der Kriterien und Technologie-Kriterium-Kombinationen, die neu bewertet werden müssen
              const criteriaToRedo = reevalData
                .filter((evaluation: any) => evaluation.technology_id === null)
                .map((evaluation: any) => evaluation.criterion_id);
              
              const techMatrixToRedo = reevalData
                .filter((evaluation: any) => evaluation.technology_id !== null)
                .map((evaluation: any) => ({
                  techId: evaluation.technology_id,
                  criterionId: evaluation.criterion_id
                }));
              
              setEvaluationsToRedo({
                criteria: criteriaToRedo,
                techMatrix: techMatrixToRedo
              });
            }
          } catch (error) {
            console.error("Error fetching reevaluations:", error);
          }
        }

        // Create criteria array with ratings
        const criteria = caseData.criteria.map((c: any) => {
          const evaluation = filteredCriteriaEvals.find((e: any) => e.criterion_id === c.id);
          const rating = evaluation ? Number(evaluation.score) : 0;  
          console.log(`[Page] Setting rating for criterion ${c.id}:`, rating);
          return {
            ...c,
            rating
          };
        });

        // Create tech matrix from evaluations
        const techMatrix = caseData.technologies.reduce((acc: any, tech: any) => {
          acc[tech.id] = caseData.criteria.reduce((criteriaAcc: any, criterion: any) => {
            const evaluation = filteredTechMatrixEvals.find(
              (e: any) => e.technology_id === tech.id && e.criterion_id === criterion.id
            );
            criteriaAcc[criterion.id] = evaluation ? Number(evaluation.score) : 0;  
            return criteriaAcc;
          }, {});
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
        setErrorMessage('Error fetching case data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, currentRound]);

  useEffect(() => {
    if (!user || !data) return;

    // Sammle alle Bewertungen
    const criteriaEvals = [];
    const techMatrixEvals = [];

    // Kriterien-Bewertungen
    for (const criterion of data.criteria) {
      if (criterion.rating && criterion.rating > 0) {
        criteriaEvals.push({
          user_id: user.user_id,
          criterion_id: criterion.id,
          technology_id: null,
          score: criterion.rating,
          case_id: parseInt(id),
          round: currentRound
        });
      }
    }

    // Technologie-Matrix-Bewertungen
    for (const techId in techMatrix) {
      for (const criterionId in techMatrix[techId]) {
        const rating = techMatrix[techId][criterionId];
        if (rating && rating > 0) {
          techMatrixEvals.push({
            user_id: user.user_id,
            criterion_id: parseInt(criterionId),
            technology_id: parseInt(techId),
            score: rating,
            case_id: parseInt(id),
            round: currentRound
          });
        }
      }
    }

    setEvaluations({
      criteriaEvaluations: criteriaEvals,
      techMatrixEvaluations: techMatrixEvals
    });
  }, [user, data, techMatrix, id, currentRound]);

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

  // Hilfsfunktion, um zu prüfen, ob ein Kriterium in der aktuellen Runde neu bewertet werden muss
  const needsReevaluation = (criterionId: number, techId?: number) => {
    if (currentRound <= 1) return false;
    
    if (techId) {
      return evaluationsToRedo.techMatrix.some(item => 
        item.criterionId === criterionId && item.techId === techId
      );
    } else {
      return evaluationsToRedo.criteria.includes(criterionId);
    }
  };

  const handleSave = async () => {
    if (!user || !data) return;

    try {
      console.log('[Page] Saving evaluations:', evaluations);
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      // Vorbereiten der Bewertungen für das Speichern
      const criteriaEvals = data.criteria
        .filter(c => c.rating !== null && c.rating !== undefined && c.rating > 0)
        .map(c => ({
          user_id: user.user_id,
          criterion_id: c.id,
          score: c.rating || 0,
          round: currentRound
        }));

      // Vorbereiten der Tech-Matrix-Bewertungen
      const techMatrixEvals = [];
      for (const techId in techMatrix) {
        for (const criterionId in techMatrix[techId]) {
          const score = techMatrix[techId][criterionId];
          if (score > 0) {
            techMatrixEvals.push({
              user_id: user.user_id,
              criterion_id: parseInt(criterionId),
              technology_id: parseInt(techId),
              score,
              round: currentRound
            });
          }
        }
      }

      // Alle Bewertungen zusammenführen
      const allEvaluations = [...criteriaEvals, ...techMatrixEvals];

      // Bewertungen speichern
      const response = await fetch(`http://localhost:9000/cases/${id}/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          evaluations: allEvaluations
        })
      });

      if (!response.ok) {
        throw new Error(`Error saving evaluations: ${response.status} ${response.statusText}`);
      }

      setSuccessMessage('Evaluations saved successfully');

      // Prüfen, ob alle Benutzer ihre Bewertungen abgeschlossen haben
      // und ob wir die Rundenanalyse starten können
      if (user.role === 'master') {
        // Hole aktuelle Case-Daten, um zu prüfen, ob alle Benutzer bewertet haben
        const caseResponse = await fetch(`http://localhost:9000/cases/${id}`, {
          credentials: 'include',
        });
        
        if (caseResponse.ok) {
          const updatedCaseData = await caseResponse.json();
          const allUsersEvaluated = updatedCaseData.users?.every((u: any) => u.has_evaluated);
          
          if (allUsersEvaluated) {
            setSuccessMessage('All users have completed their evaluations. You can now analyze this round.');
          }
        }
      }
    } catch (error: any) {
      console.error('[Page] Error saving evaluations:', error);
      setErrorMessage(error.message);
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
        <div className="text-lg">Loading case data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">No data found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg flex">
          {/* Navigation Bar */}
          <div className="w-[280px] bg-white h-full border-r border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-base font-medium">Evaluation Status</h2>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
              </svg>
            </div>

            <div 
              onClick={() => setStep('criteria')}
              className="mb-4 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="text-sm mb-1">Criteria</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">{data?.criteria.filter(c => c.rating && c.rating > 0).length}/{data?.criteria.length} rated</span>
              </div>
              <div className="w-full bg-gray-100 h-1 rounded-full">
                <div 
                  className="bg-green-500 h-1 rounded-full" 
                  style={{ 
                    width: `${data ? (data.criteria.filter(c => c.rating && c.rating > 0).length / data.criteria.length) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm mb-1">Technologies</div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${
                  Object.values(techMatrix).reduce((sum, tech) => 
                    sum + Object.values(tech).filter((rating): rating is number => typeof rating === 'number' && rating > 0).length, 0
                  ) === (data ? data.technologies.length * data.criteria.length : 0)
                    ? 'bg-green-500'
                    : 'bg-blue-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {Object.values(techMatrix).reduce((sum, tech) => 
                    sum + Object.values(tech).filter((rating): rating is number => typeof rating === 'number' && rating > 0).length, 0
                  )}/{data ? data.technologies.length * data.criteria.length : 0} rated
                </span>
              </div>
              <div className="w-full bg-gray-100 h-1 rounded-full">
                {data && (
                  <div 
                    className={`${
                      Object.values(techMatrix).reduce((sum, tech) => 
                        sum + Object.values(tech).filter((rating): rating is number => typeof rating === 'number' && rating > 0).length, 0
                      ) === (data.technologies.length * data.criteria.length) 
                        ? 'bg-green-500' 
                        : 'bg-blue-500'
                    } h-1 rounded-full`}
                    style={{ 
                      width: `${data ? (Object.values(techMatrix).reduce((sum, tech) => 
                        sum + Object.values(tech).filter((rating): rating is number => typeof rating === 'number' && rating > 0).length, 0
                      ) / (data.technologies.length * data.criteria.length)) * 100 : 0}%` 
                    }}
                  ></div>
                )}
              </div>
            </div>

            {data?.technologies.map((tech, index) => {
              const completedRatings = Object.values(techMatrix[tech.id] || {}).filter((rating): rating is number => typeof rating === 'number' && rating > 0).length;
              const totalPossible = data.criteria.length;
              const isComplete = completedRatings === totalPossible;
              
              return (
                <div 
                  key={tech.id}
                  onClick={() => {
                    setStep('tech-matrix');
                    setCurrentTechIndex(index);
                  }}
                  className={`mb-3 cursor-pointer hover:opacity-80 transition-opacity`}
                >
                  <div className={`p-3 rounded-lg ${step === 'tech-matrix' && index === currentTechIndex ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-gray-100'}`}>
                    <div className="text-sm text-gray-600">{tech.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {completedRatings}/{totalPossible} Criteria
                    </div>
                    <div className="w-full bg-gray-100 h-1 rounded-full mt-2">
                      <div 
                        className={`${isComplete ? 'bg-green-500' : 'bg-blue-500'} h-1 rounded-full`}
                        style={{ width: `${(completedRatings / totalPossible) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-semibold">Edit Case</h1>
                <div className="text-lg font-medium text-gray-600">
                  Round {currentRound}
                </div>
              </div>

              {/* Basic Info */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-4">Basic Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600">Case Name:</span>
                    <span className="ml-2">{data.name || `Case ${data.id}`}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2">{data.case_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Created at:</span>
                    <span className="ml-2">{new Date(data.created_at).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Evaluation Status:</span>
                    <span className="ml-2">
                      Case evaluation finished by {data.users?.filter(u => u.has_evaluated).length || 0}/{data.users?.length || 0} users
                    </span>
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
                  <h2 className="text-lg font-medium mb-6">Criteria Evaluation</h2>
                  {data.criteria
                    .filter(criterion => currentRound === 1 || needsReevaluation(criterion.id))
                    .map((criterion) => (
                    <div key={criterion.id} className="mb-4">
                      <label className={`block text-sm font-medium mb-1 ${needsReevaluation(criterion.id) ? 'text-orange-700' : 'text-gray-700'}`}>
                        {criterion.name}
                        {needsReevaluation(criterion.id) && (
                          <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            Needs reevaluation in Round {currentRound}
                          </span>
                        )}
                      </label>
                      {renderLikertScale(criterion)}
                    </div>
                  ))}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        setStep('tech-matrix');
                        setCurrentTechIndex(0);
                      }}
                      className="px-4 py-2 text-blue-600 hover:text-blue-700"
                    >
                      Continue to Technology Matrix
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-medium mb-6">
                    Rate {data.technologies[currentTechIndex].name}
                  </h2>
                  {data.criteria
                    .filter(criterion => currentRound === 1 || needsReevaluation(criterion.id, data.technologies[currentTechIndex].id))
                    .map((criterion) => (
                    <div key={criterion.id} className="mb-4">
                      <label className={`block text-sm font-medium mb-1 ${needsReevaluation(criterion.id, data.technologies[currentTechIndex].id) ? 'text-orange-700' : 'text-gray-700'}`}>
                        {criterion.name}
                        {needsReevaluation(criterion.id, data.technologies[currentTechIndex].id) && (
                          <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            Needs reevaluation in Round {currentRound}
                          </span>
                        )}
                      </label>
                      {renderTechLikertScale(data.technologies[currentTechIndex].id, criterion.id)}
                    </div>
                  ))}
                </div>
              )}

              {step === 'tech-matrix' && (
                <div className="mt-6 flex justify-between border-t border-gray-200 pt-6">
                  <button
                    onClick={() => {
                      setStep('criteria');
                      setCurrentTechIndex(-1);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-700"
                  >
                    Back to Criteria
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Evaluations"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}