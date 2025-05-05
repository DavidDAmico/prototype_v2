'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '../../lib/useAuth';

interface Case {
  id: number;
  name: string;
  case_type: string;
  threshold_distance_mean: number;
  threshold_criteria_percent: number;
  threshold_tech_percent: number;
  current_round: number;
}

interface RoundAnalysis {
  id: number;
  case_id: number;
  round_number: number;
  created_at: string;
  criteria_ok_percent: number;
  criteria_total_count: number;
  criteria_ok_count: number;
  criteria_passed: boolean;
  tech_ok_percent: number;
  tech_total_count: number;
  tech_ok_count: number;
  tech_passed: boolean;
  mean_distance_ok: boolean;
  mean_distance_value: number;
  passed_analysis: boolean;
  criteria_mean_distance_value?: number;
  criteria_mean_distance_ok?: boolean;
  tech_mean_distance_value?: number;
  tech_mean_distance_ok?: boolean;
}

export default function RoundAnalysisPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [roundAnalysis, setRoundAnalysis] = useState<RoundAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Threshold-Werte für die Bearbeitung
  const [thresholdDistanceMean, setThresholdDistanceMean] = useState<number>(0.166667);
  const [thresholdCriteriaPercent, setThresholdCriteriaPercent] = useState<number>(75);
  const [thresholdTechPercent, setThresholdTechPercent] = useState<number>(75);
  const [isEditingThresholds, setIsEditingThresholds] = useState(false);

  useEffect(() => {
    // Nur Master-Benutzer dürfen diese Seite sehen
    if (user && user.role !== "master") {
      router.push("/dashboard");
    }

    async function fetchCases() {
      try {
        setIsLoading(true);
        // Verwende den Standard-Endpunkt, um alle Cases zu laden
        const res = await fetch("http://localhost:9000/cases/", {
          credentials: "include",
        });
        
        if (!res.ok) {
          throw new Error("Error loading cases");
        }
        
        const data = await res.json();
        
        // Lade die Details für jeden Case einzeln
        const casesWithDetails = await Promise.all(
          data.map(async (c: any) => {
            try {
              const detailRes = await fetch(`http://localhost:9000/cases/${c.id}`, {
                credentials: "include",
              });
              
              if (detailRes.ok) {
                const detailData = await detailRes.json();
                return { ...c, ...detailData };
              }
              
              return c;
            } catch (error) {
              console.error(`Error fetching details for case ${c.id}:`, error);
              return c;
            }
          })
        );
        
        setCases(casesWithDetails);
      } catch (error: any) {
        console.error("Error fetching cases:", error.message);
        setError("Failed to load cases. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchCases();
    }
  }, [user, router]);

  useEffect(() => {
    if (selectedCaseId) {
      fetchCaseDetails();
      fetchRoundAnalysis();
    } else {
      setSelectedCase(null);
      setRoundAnalysis([]);
    }
  }, [selectedCaseId]);

  const fetchCaseDetails = async () => {
    if (!selectedCaseId) return;
    
    try {
      setIsLoading(true);
      const res = await fetch(`http://localhost:9000/cases/${selectedCaseId}`, {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Error loading case details");
      }
      
      const data = await res.json();
      setSelectedCase(data);
      
      // Setze die Threshold-Werte aus dem Case
      setThresholdDistanceMean(data.threshold_distance_mean || 0.166667);
      setThresholdCriteriaPercent(data.threshold_criteria_percent || 75);
      setThresholdTechPercent(data.threshold_tech_percent || 75);
    } catch (error: any) {
      console.error("Error fetching case details:", error.message);
      setError("Failed to load case details. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoundAnalysis = async () => {
    if (!selectedCaseId) return;
    
    try {
      setIsLoading(true);
      const res = await fetch(`http://localhost:9000/cases/${selectedCaseId}/round-analysis`, {
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error("Error loading round analysis");
      }
      
      const data = await res.json();
      setRoundAnalysis(data);
    } catch (error: any) {
      console.error("Error fetching round analysis:", error.message);
      setError("Failed to load round analysis. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeRound = async () => {
    if (!selectedCaseId) return;
    
    try {
      setIsAnalyzing(true);
      setError(null);
      setSuccess(null);
      
      const res = await fetch(`http://localhost:9000/cases/${selectedCaseId}/analyze-round`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error analyzing round");
      }
      
      const data = await res.json();
      
      // Aktualisiere die Rundenanalyse
      fetchRoundAnalysis();
      fetchCaseDetails(); // Um die aktuelle Runde zu aktualisieren
      
      if (data.passed_analysis) {
        setSuccess(`Round ${data.round_number} analysis completed successfully. All thresholds passed!`);
      } else {
        setSuccess(`Round ${data.round_number} analysis completed. New round ${data.next_round} created for reevaluation.`);
      }
    } catch (error: any) {
      console.error("Error analyzing round:", error.message);
      setError(error.message || "Failed to analyze round. Please try again later.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateThresholds = async () => {
    if (!selectedCaseId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const res = await fetch(`http://localhost:9000/cases/${selectedCaseId}/update-thresholds`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threshold_distance_mean: thresholdDistanceMean,
          threshold_criteria_percent: thresholdCriteriaPercent,
          threshold_tech_percent: thresholdTechPercent,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Error updating thresholds");
      }
      
      const data = await res.json();
      
      // Aktualisiere den ausgewählten Case
      fetchCaseDetails();
      
      setSuccess("Thresholds updated successfully.");
      setIsEditingThresholds(false);
    } catch (error: any) {
      console.error("Error updating thresholds:", error.message);
      setError("Failed to update thresholds. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Hilfsfunktion für die Farbgebung basierend auf dem Prozentsatz
  const getColorClass = (percent: number, threshold: number) => {
    console.log(`Percent: ${percent}, Threshold: ${threshold}, Result: ${percent >= threshold ? 'green' : 'red'}`);
    if (percent >= threshold) {
      return "bg-green-100 text-green-800";
    } else if (percent >= threshold * 0.8) {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Round Analysis</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-medium mb-4">Select Case</h2>
        <select
          className="w-full p-2 border border-gray-300 rounded"
          value={selectedCaseId || ""}
          onChange={(e) => setSelectedCaseId(e.target.value ? parseInt(e.target.value) : null)}
          disabled={isLoading}
        >
          <option value="">Select a case</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || `Case ${c.id}`} ({c.case_type})
            </option>
          ))}
        </select>
      </div>

      {selectedCase && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">
                {selectedCase.name || `Case ${selectedCase.id}`}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                  {selectedCase.case_type}
                </span>
                <span>
                  Current Round: {selectedCase.current_round}
                </span>
              </div>
            </div>
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-400"
              onClick={handleAnalyzeRound}
              disabled={isAnalyzing || isLoading}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Current Round"}
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-md font-medium mb-3">Thresholds</h3>
            {isEditingThresholds ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Distance to Mean (Absolute Threshold)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    className="w-full p-2 border border-gray-300 rounded"
                    value={thresholdDistanceMean}
                    onChange={(e) => setThresholdDistanceMean(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 0.166667 (1/6)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Criteria Percent (Green Threshold)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    className="w-full p-2 border border-gray-300 rounded"
                    value={thresholdCriteriaPercent}
                    onChange={(e) => setThresholdCriteriaPercent(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 75%
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Technology Percent (Green Threshold)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    className="w-full p-2 border border-gray-300 rounded"
                    value={thresholdTechPercent}
                    onChange={(e) => setThresholdTechPercent(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 75%
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                    onClick={handleUpdateThresholds}
                    disabled={isLoading}
                  >
                    Save Thresholds
                  </button>
                  <button
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm"
                    onClick={() => {
                      setThresholdDistanceMean(selectedCase.threshold_distance_mean || 0.166667);
                      setThresholdCriteriaPercent(selectedCase.threshold_criteria_percent || 75);
                      setThresholdTechPercent(selectedCase.threshold_tech_percent || 75);
                      setIsEditingThresholds(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">Distance to Mean (Absolute):</span>
                  <span className="font-medium">{selectedCase.threshold_distance_mean || 0.166667}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">Criteria Percent (Green Threshold):</span>
                  <span className="font-medium">{selectedCase.threshold_criteria_percent || 75}%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">Technology Percent (Green Threshold):</span>
                  <span className="font-medium">{selectedCase.threshold_tech_percent || 75}%</span>
                </div>
                <button
                  className="mt-2 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm"
                  onClick={() => setIsEditingThresholds(true)}
                >
                  Edit Thresholds
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCase && roundAnalysis.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium mb-4">Round Analysis Results</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Round
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criteria OK (%)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tech Matrix OK (%)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criteria D2M (Mean Distance)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tech Matrix D2M (Mean Distance)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roundAnalysis.map((analysis) => (
                  <tr key={analysis.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">Round {analysis.round_number}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(analysis.created_at).toLocaleDateString()} {new Date(analysis.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${analysis.criteria_ok_percent >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {analysis.criteria_ok_percent.toFixed(1)}% ({analysis.criteria_ok_count}/{analysis.criteria_total_count})
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${analysis.tech_ok_percent >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {analysis.tech_ok_percent.toFixed(1)}% ({analysis.tech_ok_count}/{analysis.tech_total_count})
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${analysis.criteria_mean_distance_ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {analysis.criteria_mean_distance_value?.toFixed(3) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${analysis.tech_mean_distance_ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {analysis.tech_mean_distance_value?.toFixed(3) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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

      {selectedCase && roundAnalysis.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500 text-center">No round analysis available for this case yet.</p>
        </div>
      )}
    </div>
  );
}
