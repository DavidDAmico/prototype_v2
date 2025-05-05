'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuth from '../../lib/useAuth';

interface EvaluationStatus {
  user_id: number;
  username: string;
  status: "not_started" | "in_progress" | "completed";
  evaluations_completed: number;
  total_evaluations: number;
  criteria_completed: number;
  criteria_total: number;
  tech_matrix_completed: number;
  tech_matrix_total: number;
}

interface CaseOverview {
  id: number;
  name: string;
  case_type: string;
  created_at: string;
  criteria_count: number;
  technologies_count: number;
  current_round: number;
  assigned_users: EvaluationStatus[];
}

export default function CasesOverviewPage() {
  const { user, loading } = useAuth();
  const [casesOverview, setCasesOverview] = useState<CaseOverview[]>([]);
  const [filteredCasesOverview, setFilteredCasesOverview] = useState<CaseOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roundFilter, setRoundFilter] = useState<number | "all">("all");
  const router = useRouter();

  useEffect(() => {
    // Nur Master-Benutzer dürfen diese Seite sehen
    if (user && user.role !== "master") {
      router.push("/dashboard");
    }

    async function fetchCasesOverview() {
      try {
        setIsLoading(true);
        const res = await fetch("http://localhost:9000/cases/admin/overview", {
          credentials: "include",
        });
        
        if (!res.ok) {
          throw new Error("Error loading cases overview");
        }
        
        const data = await res.json();
        setCasesOverview(data);
      } catch (error: any) {
        console.error("Error fetching cases overview:", error.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchCasesOverview();
    }
  }, [user, router]);

  useEffect(() => {
    if (roundFilter === "all") {
      setFilteredCasesOverview(casesOverview);
    } else {
      setFilteredCasesOverview(casesOverview.filter((caseItem) => caseItem.current_round === roundFilter));
    }
  }, [casesOverview, roundFilter]);

  // Helfer-Funktion für die Fortschrittsanzeige
  const getProgressColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "not_started":
        return "bg-gray-300";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      case "not_started":
        return "Not Started";
      default:
        return "Unknown";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "not_started":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cases Overview</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500">Runde:</label>
          <select
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
          >
            <option value="all">Alle</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((round) => (
              <option key={round} value={round}>
                Runde {round}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500 text-center">Loading cases data...</p>
        </div>
      ) : filteredCasesOverview.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500 text-center">No cases found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCasesOverview.map((caseItem) => (
            <div key={caseItem.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{caseItem.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                      {caseItem.case_type}
                    </span>
                    <span>
                      Created: {new Date(caseItem.created_at).toLocaleDateString()}
                    </span>
                    <span>
                      {caseItem.criteria_count} Criteria • {caseItem.technologies_count} Technologies
                    </span>
                    <span>
                      Runde: {caseItem.current_round}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/cases/${caseItem.id}/edit`}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                >
                  View Case
                </Link>
              </div>

              <div className="mt-6">
                <h3 className="text-md font-medium mb-3">User Evaluation Status</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Criteria Progress
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tech Matrix Progress
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Overall Progress
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {caseItem.assigned_users.map((user) => (
                        <tr key={user.user_id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(user.status)}`}>
                              {getStatusText(user.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="h-2.5 rounded-full bg-green-500" 
                                  style={{ width: `${(user.criteria_completed / user.criteria_total) * 100}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-xs text-gray-500">
                                {user.criteria_completed}/{user.criteria_total}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="h-2.5 rounded-full bg-blue-500" 
                                  style={{ width: `${(user.tech_matrix_completed / user.tech_matrix_total) * 100}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-xs text-gray-500">
                                {user.tech_matrix_completed}/{user.tech_matrix_total}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="h-2.5 rounded-full bg-orange-500" 
                                  style={{ width: `${(user.evaluations_completed / user.total_evaluations) * 100}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-xs text-gray-500">
                                {user.evaluations_completed}/{user.total_evaluations}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
