'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect, use } from 'react';
import useAuth from "../../../lib/useAuth";

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
  current_round: number;
  rounds: CaseRound[];
  criteria: Array<{
    id: number;
    name: string;
    rating?: number;
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

interface RoundAnalysis {
  id: number;
  case_id: number;
  round_number: number;
  created_at: string;
  criteria_ok_percent: number;
  criteria_total_count: number;
  criteria_ok_count: number;
  tech_ok_percent: number;
  tech_total_count: number;
  tech_ok_count: number;
  mean_distance_ok: boolean;
  mean_distance_value: number;
  passed_analysis: boolean;
}

export default function ViewCasePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Case | null>(null);
  const [techMatrix, setTechMatrix] = useState<TechCriteriaMatrix>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [roundAnalysis, setRoundAnalysis] = useState<RoundAnalysis[]>([]);

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
        
        // 2. Hole existierende Bewertungen
        const evaluationsResponse = await fetch(`http://localhost:9000/cases/${id}/evaluations`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!evaluationsResponse.ok) {
          throw new Error('Failed to fetch evaluations');
        }

        const allEvaluations = await evaluationsResponse.json();
        console.log("[Page] Fetched all evaluations:", allEvaluations);

        // Extrahiere die Arrays aus dem Objekt
        const criteriaEvals = allEvaluations.criteriaEvaluations || [];
        const techMatrixEvals = allEvaluations.techMatrixEvaluations || [];

        // Create criteria array with ratings
        const criteria = caseData.criteria.map((c: any) => {
          const evaluation = criteriaEvals.find((e: any) => e.criterion_id === c.id);
          const rating = evaluation ? Number(evaluation.score) : 0;  
          return {
            ...c,
            rating
          };
        });

        // Create tech matrix from evaluations
        const techMatrix = caseData.technologies.reduce((acc: any, tech: any) => {
          acc[tech.id] = caseData.criteria.reduce((criteriaAcc: any, criterion: any) => {
            const evaluation = techMatrixEvals.find(
              (e: any) => e.technology_id === tech.id && e.criterion_id === criterion.id
            );
            criteriaAcc[criterion.id] = evaluation ? Number(evaluation.score) : 0;  
            return criteriaAcc;
          }, {});
          return acc;
        }, {});

        setData({
          ...caseData,
          criteria
        });

        setTechMatrix(techMatrix);

        // 3. Hole Rundenanalyse
        const analysisResponse = await fetch(`http://localhost:9000/cases/${id}/round-analysis`, {
          credentials: 'include',
        });
        
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          setRoundAnalysis(analysisData);
        }

      } catch (error) {
        console.error('[Page] Error fetching case:', error);
        setErrorMessage('Error fetching case data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const renderLikertScale = (value: number) => {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((rating) => (
          <div
            key={rating}
            className={`w-8 h-8 flex items-center justify-center rounded-full ${
              value === rating ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {rating}
          </div>
        ))}
      </div>
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

  // Finde die letzte Rundenanalyse
  const latestAnalysis = roundAnalysis.length > 0 ? 
    roundAnalysis.sort((a, b) => b.round_number - a.round_number)[0] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-semibold">View Completed Case</h1>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg">
                  Completed
                </div>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-4">Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Case ID:</span>
                  <span className="ml-2">{data.id}</span>
                </div>
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
                  <span className="text-gray-600">Final Round:</span>
                  <span className="ml-2">{data.current_round}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {errorMessage && (
              <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
                {errorMessage}
              </div>
            )}

            {/* Round Analysis Results */}
            {roundAnalysis.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-medium mb-4">Round Analysis Results</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criteria OK</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tech Matrix OK</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mean Distance</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {roundAnalysis.map((analysis) => (
                        <tr key={analysis.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Round {analysis.round_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {analysis.criteria_ok_percent.toFixed(2)}% ({analysis.criteria_ok_count}/{analysis.criteria_total_count})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {analysis.tech_ok_percent.toFixed(2)}% ({analysis.tech_ok_count}/{analysis.tech_total_count})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {analysis.mean_distance_value.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${analysis.passed_analysis ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {analysis.passed_analysis ? 'Passed' : 'Failed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Criteria Evaluations */}
            <div className="mb-8">
              <h2 className="text-lg font-medium mb-4">Criteria Evaluations</h2>
              <div className="space-y-4">
                {data.criteria.map((criterion) => (
                  <div key={criterion.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{criterion.name}</h3>
                      <span className="text-gray-600">Rating: {criterion.rating}</span>
                    </div>
                    {renderLikertScale(criterion.rating || 0)}
                  </div>
                ))}
              </div>
            </div>

            {/* Technology Matrix */}
            <div>
              <h2 className="text-lg font-medium mb-4">Technology Matrix</h2>
              {data.technologies.map((tech) => (
                <div key={tech.id} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium mb-4">{tech.name}</h3>
                  <div className="space-y-4">
                    {data.criteria.map((criterion) => (
                      <div key={criterion.id} className="flex justify-between items-center">
                        <span className="text-gray-600">{criterion.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Rating: {techMatrix[tech.id]?.[criterion.id] || 0}</span>
                          {renderLikertScale(techMatrix[tech.id]?.[criterion.id] || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
