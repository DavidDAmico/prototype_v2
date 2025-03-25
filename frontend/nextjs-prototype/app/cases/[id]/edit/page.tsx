"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useAuth from "../../../lib/useAuth";
import LikertScale from "../../../components/LikertScale";

interface Case {
  id: number;
  project_id: number;
  case_type: string;
  show_results: boolean;
  created_at: string;
  criteria: Array<{
    id: number;
    name: string;
    rating?: number;
  }>;
  technologies: Array<{
    id: number;
    name: string;
  }>;
}

interface TechCriteriaMatrix {
  [techId: number]: {
    [criterionId: number]: number;
  };
}

export default function EditCasePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentStep, setCurrentStep] = useState<'criteria' | 'tech-matrix'>('criteria');
  const [techMatrix, setTechMatrix] = useState<TechCriteriaMatrix>({});

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const response = await fetch(`http://localhost:9000/cases/${params.id}`, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Case nicht gefunden');
        const data = await response.json();
        setCaseData(data);
        
        // Initialize tech matrix
        const matrix: TechCriteriaMatrix = {};
        data.technologies.forEach((tech: { id: number; name: string }) => {
          matrix[tech.id] = {};
          data.criteria.forEach((criterion: { id: number; name: string; rating?: number }) => {
            matrix[tech.id][criterion.id] = 0;
          });
        });
        setTechMatrix(matrix);
      } catch (error) {
        console.error('Fehler beim Laden des Cases:', error);
        setMessage({ type: 'error', text: 'Fehler beim Laden des Cases' });
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCase();
    }
  }, [params.id]);

  const handleRatingChange = (criterionId: number, value: number) => {
    if (!caseData) return;
    setCaseData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        criteria: prev.criteria.map(criterion =>
          criterion.id === criterionId
            ? { ...criterion, rating: value }
            : criterion
        )
      };
    });
  };

  const handleTechMatrixChange = (techId: number, criterionId: number, value: number) => {
    setTechMatrix(prev => ({
      ...prev,
      [techId]: {
        ...prev[techId],
        [criterionId]: value
      }
    }));
  };

  const handleSubmit = async () => {
    if (!caseData) return;
    setIsSubmitting(true);
    
    try {
      if (currentStep === 'criteria') {
        // Save criteria ratings
        const response = await fetch(`http://localhost:9000/cases/${params.id}/ratings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            ratings: caseData.criteria.reduce((acc, criterion) => ({
              ...acc,
              [criterion.id]: criterion.rating || 0
            }), {})
          }),
        });

        if (!response.ok) throw new Error('Fehler beim Speichern');
        
        setMessage({ type: 'success', text: 'Kriterien-Bewertungen gespeichert' });
        setCurrentStep('tech-matrix');
      } else {
        // Save tech matrix
        const response = await fetch(`http://localhost:9000/cases/${params.id}/tech-matrix`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ matrix: techMatrix }),
        });

        if (!response.ok) throw new Error('Fehler beim Speichern');
        
        setMessage({ type: 'success', text: 'Bewertungen erfolgreich gespeichert' });
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (error) {
      console.error('Fehler:', error);
      setMessage({ type: 'error', text: 'Fehler beim Speichern der Bewertungen' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-xl font-semibold text-red-600">Case nicht gefunden</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-semibold">Case bearbeiten</h1>
            </div>
          </div>

          {/* Basis-Informationen */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basis-Informationen</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Case ID:</span>
                <span className="ml-2 text-gray-900">{caseData.id}</span>
              </div>
              <div>
                <span className="text-gray-500">Typ:</span>
                <span className="ml-2 text-gray-900">{caseData.case_type}</span>
              </div>
              <div>
                <span className="text-gray-500">Erstellt am:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(caseData.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>
            </div>
          </div>

          {/* Content based on current step */}
          {currentStep === 'criteria' ? (
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Kriterien Bewertung</h2>
              <div className="space-y-8">
                {caseData.criteria.map((criterion) => (
                  <div key={criterion.id} className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-md font-medium text-gray-900 mb-4">{criterion.name}</h3>
                    <LikertScale
                      value={criterion.rating || 0}
                      onChange={(value) => handleRatingChange(criterion.id, value)}
                      type="importance"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Technologie-Kriterien Matrix</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                      {caseData.technologies.map(tech => (
                        <th key={tech.id} className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {tech.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {caseData.criteria.map(criterion => (
                      <tr key={criterion.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {criterion.name}
                        </td>
                        {caseData.technologies.map(tech => (
                          <td key={tech.id} className="px-6 py-4 whitespace-nowrap">
                            <LikertScale
                              value={techMatrix[tech.id]?.[criterion.id] || 0}
                              onChange={(value) => handleTechMatrixChange(tech.id, criterion.id, value)}
                              type="performance"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              {currentStep === 'tech-matrix' && (
                <button
                  onClick={() => setCurrentStep('criteria')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ← Zurück zu Kriterien
                </button>
              )}
              <div className="flex space-x-4 ml-auto">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting 
                    ? 'Wird gespeichert...' 
                    : currentStep === 'criteria' 
                      ? 'Weiter zur Technologie-Matrix' 
                      : 'Bewertungen speichern'
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div className={`p-4 ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
