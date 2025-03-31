"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// Interface für User (Experten)
interface User {
  id: number;
  username: string;
}

export default function CreateCasePage() {
  const router = useRouter();

  // Schritt im Wizard (1 bis 5)
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Schritt 1: Basis-Informationen
  const [caseName, setCaseName] = useState("");
  const [caseType, setCaseType] = useState<"intern" | "extern">("intern");

  // Schritt 2: Experten – alle vorhandenen User
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userSearchFields, setUserSearchFields] = useState<string[]>([""]);
  const [selectedUsers, setSelectedUsers] = useState<{[key: number]: User | null}>({0: null});
  const [dropdownOpenIndex, setDropdownOpenIndex] = useState<number | null>(null);

  // Schritt 3: Kriterien (dynamisch) – initial ein leeres Feld
  const [criteria, setCriteria] = useState<string[]>([""]);

  // Schritt 4: Technologien (dynamisch) – initial ein leeres Feld
  const [technologies, setTechnologies] = useState<string[]>([""]);

  // Schritt 5: Grenzwerte für die Rundenanalyse
  const [thresholdDistanceMean, setThresholdDistanceMean] = useState<number>(0.166667); // Standardwert 1/6
  const [thresholdCriteriaPercent, setThresholdCriteriaPercent] = useState<number>(75); // Standardwert 75%
  const [thresholdTechPercent, setThresholdTechPercent] = useState<number>(75); // Standardwert 75%

  const [isLoading, setIsLoading] = useState(false);
  const [projectId, setProjectId] = useState<number>(1); // Default-Wert 1 für Abwärtskompatibilität

  // State für die Bestätigung der Daten
  const [isDataConfirmed, setIsDataConfirmed] = useState(false);

  // Prüfen ob ein Schritt komplett ist
  const isStepComplete = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return caseName.trim() !== "";
      case 2:
        return Object.values(selectedUsers).some(user => user !== null);
      case 3:
        return criteria.some(c => c.trim() !== "");
      case 4:
        return technologies.some(t => t.trim() !== "");
      case 5:
        return thresholdDistanceMean > 0 && thresholdCriteriaPercent > 0 && thresholdTechPercent > 0;
      case 6:
        return isDataConfirmed;
      default:
        return false;
    }
  };

  // Prüfen ob alle Schritte komplett sind
  const areAllStepsComplete = () => {
    return [1, 2, 3, 4, 5, 6].every(step => isStepComplete(step));
  };

  // Aktualisiere completed steps wenn sich relevante Daten ändern
  useEffect(() => {
    const newCompletedSteps = [1, 2, 3, 4, 5, 6].filter(stepNum => isStepComplete(stepNum));
    setCompletedSteps(newCompletedSteps);
  }, [caseName, selectedUsers, criteria, technologies, thresholdDistanceMean, thresholdCriteriaPercent, thresholdTechPercent, isDataConfirmed]);

  // Validierung für Schritte
  const validateStep = (targetStep: number) => {
    // Keine Validierung beim Springen zwischen den Schritten
    return true;
  };

  // Validierung beim Speichern
  const validateBeforeSave = () => {
    const allStepsCompleted = [1, 2, 3, 4, 5].every(stepNum => isStepComplete(stepNum));
    if (!allStepsCompleted) {
      alert("Please fill in all required fields in all steps");
      return false;
    }
    return true;
  };

  // Navigation zwischen den Schritten
  function goToStep(targetStep: number) {
    setStep(targetStep);
  }

  function nextStep() {
    setStep((prev) => Math.min(prev + 1, 6));
  }

  function prevStep() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  // Dynamisches Hinzufügen/Entfernen von Experten
  function addExpert() {
    if (userSearchFields.length < 30) {
      const newIndex = userSearchFields.length;
      setUserSearchFields([...userSearchFields, ""]);
      setSelectedUsers(prev => ({ ...prev, [newIndex]: null }));
    }
  }

  // Experte aus einem Feld entfernen
  const clearExpertSelection = (index: number) => {
    setSelectedUsers(prev => ({ ...prev, [index]: null }));
    setUserSearchFields(prev => {
      const updated = [...prev];
      updated[index] = "";
      return updated;
    });
  };

  // Experten-Feld komplett entfernen
  const removeExpert = (index: number) => {
    const newSearchFields = userSearchFields.filter((_, i) => i !== index);
    setUserSearchFields(newSearchFields);

    const newSelectedUsers: { [key: number]: User | null } = {};
    Object.entries(selectedUsers).forEach(([key, value]) => {
      const keyNum = parseInt(key);
      if (keyNum < index) {
        newSelectedUsers[keyNum] = value;
      } else if (keyNum > index) {
        newSelectedUsers[keyNum - 1] = value;
      }
    });
    setSelectedUsers(newSelectedUsers);
  };

  function removeExpertField(index: number) {
    if (index === 0) {
      clearExpertSelection(index);
    } else {
      removeExpert(index);
    }
  }

  function updateUserSearch(index: number, value: string) {
    const newSearchFields = [...userSearchFields];
    newSearchFields[index] = value;
    setUserSearchFields(newSearchFields);
    
    // Nur Dropdown öffnen wenn es eine Sucheingabe gibt
    if (value.trim()) {
      setDropdownOpenIndex(index);
    } else {
      setDropdownOpenIndex(null);
    }
  }

  function selectUser(index: number, user: User) {
    setSelectedUsers(prev => ({ ...prev, [index]: user }));
    // Setze den Suchtext auf den Usernamen
    const newSearchFields = [...userSearchFields];
    newSearchFields[index] = user.username;
    setUserSearchFields(newSearchFields);
    // Schließe das Dropdown
    setDropdownOpenIndex(null);
  }

  // Kriterium aus einem Feld entfernen
  const clearCriterion = (index: number) => {
    const updated = [...criteria];
    updated[index] = "";
    setCriteria(updated);
  };

  // Kriterium-Feld komplett entfernen
  const removeCriterion = (index: number) => {
    if (index === 0) {
      clearCriterion(index);
    } else {
      const updated = criteria.filter((_, i) => i !== index);
      setCriteria(updated);
    }
  };

  // Technologie aus einem Feld entfernen
  const clearTechnology = (index: number) => {
    const updated = [...technologies];
    updated[index] = "";
    setTechnologies(updated);
  };

  // Technologie-Feld komplett entfernen
  const removeTechnology = (index: number) => {
    if (index === 0) {
      clearTechnology(index);
    } else {
      const updated = technologies.filter((_, i) => i !== index);
      setTechnologies(updated);
    }
  };

  // Fetch users when component mounts
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("http://localhost:9000/auth/users", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Error loading users");
        const data = await res.json();
        // Stelle sicher, dass wir das users Array aus der Response verwenden
        setAllUsers(Array.isArray(data.users) ? data.users : []);
      } catch (error: any) {
        console.error("Error loading users:", error.message);
        setAllUsers([]); // Setze leeres Array im Fehlerfall
      }
    }
    fetchUsers();
  }, []);

  // Projekt-ID wird nicht mehr vom Backend abgerufen, sondern ist fest auf 1 gesetzt
  // useEffect(() => {
  //   async function fetchProjects() {
  //     try {
  //       setIsLoading(true);
  //       const res = await fetch("http://localhost:9000/projects/", {
  //         credentials: "include",
  //       });
        
  //       if (res.ok) {
  //         const projects = await res.json();
  //         if (projects && projects.length > 0) {
  //           setProjectId(projects[0].id);
  //           console.log("Using project ID:", projects[0].id);
  //         } else {
  //           console.log("No projects found, using default project ID:", projectId);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error fetching projects:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }

  //   fetchProjects();
  // }, []);

  // Dynamisches Hinzufügen/Entfernen von Kriterien
  function addCriterion() {
    if (criteria.length < 30) {
      setCriteria([...criteria, ""]);
    }
  }

  // Dynamisches Hinzufügen/Entfernen von Technologien
  function addTechnology() {
    if (technologies.length < 30) {
      setTechnologies([...technologies, ""]);
    }
  }

  // Abschicken: Case speichern (nur die vom Backend erwarteten Felder)
  const handleSubmit = async () => {
    if (!validateBeforeSave()) {
      return;
    }

    const mappedCaseType = caseType === "intern" ? "internal" : "external";

    const validCriteria = criteria.filter(c => c.trim() !== "").map(c => c);  // Send only non-empty criterion names
    const validTechnologies = technologies.filter(t => t.trim() !== "").map(t => t);  // Send only non-empty technology names

    // Get all selected users' IDs
    const selectedUsersList = Object.values(selectedUsers).filter((user): user is User => user !== null);
    const selectedUserIds = selectedUsersList.map(user => user.id);
    
    // Get the assigned user ID (first selected user)
    const assignedUserId = selectedUserIds[0];
    console.log("Selected users:", selectedUsersList);
    console.log("Assigning case to user:", assignedUserId);

    const payload = {
      project_id: projectId,
      case_type: mappedCaseType,
      show_results: false,
      criteria: validCriteria,
      technologies: validTechnologies,
      name: caseName.trim(),
      assigned_user_id: assignedUserId,
      selected_users: selectedUserIds,
      threshold_distance_mean: thresholdDistanceMean,
      threshold_criteria_percent: thresholdCriteriaPercent,
      threshold_tech_percent: thresholdTechPercent
    };

    console.log("Creating case with payload:", payload);

    try {
      const res = await fetch("http://localhost:9000/cases/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Error creating case");
      }
      
      // Get the response data to check the actual project ID used
      const data = await res.json();
      console.log("Case created successfully:", data);
      
      router.push("/success?action=createCase");
    } catch (error: any) {
      console.error(error.message);
      alert("Error saving case. See console for details.");
    }
  }

  return (
    <div className="fixed-blue-frame bg-white dark:bg-blue-950/30 p-6 rounded-lg space-y-6 text-black">
      <h2 className="text-2xl font-bold text-center">Create Case</h2>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5, 6].map((num) => (
          <div
            key={num}
            onClick={() => goToStep(num)}
            className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${
              step === num
                ? "bg-blue-600 text-white"
                : completedSteps.includes(num)
                ? "bg-green-500 text-white"
                : "bg-gray-300 text-black"
            }`}
          >
            {num}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-6">
            <p className="font-semibold mb-6">Step 1: Basic Information</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="caseName" className="block text-sm font-medium text-gray-700 mb-1">
                  Case Name
                </label>
                <input
                  type="text"
                  id="caseName"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  className="w-full p-2 rounded border border-gray-300"
                  placeholder="Enter case name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={caseType === "intern"}
                      onChange={() => setCaseType("intern")}
                      className="text-blue-600"
                    />
                    Internal
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={caseType === "extern"}
                      onChange={() => setCaseType("extern")}
                      className="text-blue-600"
                    />
                    External
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-6">
            <div className="flex justify-between items-center mb-6">
              <p className="font-semibold">Step 2: Select Experts</p>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">
                  {Object.values(selectedUsers).filter(user => user !== null).length}
                </span>
                <span className="mx-1">/</span>
                <span>30 Experts</span>
              </div>
            </div>
            <div className="space-y-4">
              {userSearchFields.map((searchValue, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => updateUserSearch(index, e.target.value)}
                      className="w-full p-2 rounded border border-gray-300"
                      placeholder="Search for experts..."
                    />
                    {dropdownOpenIndex === index && searchValue && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                        {allUsers
                          .filter(user =>
                            user.username.toLowerCase().includes(searchValue.toLowerCase())
                          )
                          .map(user => (
                            <div
                              key={user.id}
                              className="p-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => {
                                selectUser(index, user);
                              }}
                            >
                              {user.username}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExpertField(index)}
                    className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white text-black transition hover:bg-red-500 hover:text-white"
                  >
                    <Image
                      src="/icons/delete.png"
                      alt="Remove"
                      width={16}
                      height={16}
                    />
                  </button>
                </div>
              ))}
              {userSearchFields.length < 30 && (
                <button
                  type="button"
                  onClick={addExpert}
                  className="custom-action-button flex items-center gap-2 justify-center p-2 rounded-lg bg-white text-black transition hover:bg-green-500 hover:text-white"
                >
                  <Image
                    src="/icons/add-user.png"
                    alt="Add"
                    width={16}
                    height={16}
                  />
                  <span>Add Expert</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-6">
            <div className="flex justify-between items-center mb-6">
              <p className="font-semibold">Step 3: Criteria</p>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">
                  {criteria.filter(c => c.trim() !== "").length}
                </span>
                <span className="mx-1">/</span>
                <span>30 Criteria</span>
              </div>
            </div>
            <div className="space-y-2">
              {criteria.map((crit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Criterion #${index + 1}`}
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
                    onClick={() => removeCriterion(index)}
                    className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white text-black transition hover:bg-red-500 hover:text-white"
                  >
                    <Image
                      src="/icons/delete.png"
                      alt="Remove"
                      width={16}
                      height={16}
                    />
                  </button>
                </div>
              ))}
              {criteria.length < 30 && (
                <button
                  type="button"
                  onClick={addCriterion}
                  className="custom-action-button flex items-center gap-2 justify-center p-2 rounded-lg bg-white text-black transition hover:bg-green-500 hover:text-white"
                >
                  <Image
                    src="/icons/create-case.png"
                    alt="Add"
                    width={16}
                    height={16}
                  />
                  <span>Add Criterion</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-6">
            <div className="flex justify-between items-center mb-6">
              <p className="font-semibold">Step 4: Technologies</p>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">
                  {technologies.filter(t => t.trim() !== "").length}
                </span>
                <span className="mx-1">/</span>
                <span>30 Technologies</span>
              </div>
            </div>
            <div className="space-y-2">
              {technologies.map((tech, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Technology #${index + 1}`}
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
                    className="custom-action-button flex items-center justify-center p-2 rounded-lg bg-white text-black transition hover:bg-red-500 hover:text-white"
                  >
                    <Image
                      src="/icons/delete.png"
                      alt="Remove"
                      width={16}
                      height={16}
                    />
                  </button>
                </div>
              ))}
              {technologies.length < 30 && (
                <button
                  type="button"
                  onClick={addTechnology}
                  className="custom-action-button flex items-center gap-2 justify-center p-2 rounded-lg bg-white text-black transition hover:bg-green-500 hover:text-white"
                >
                  <Image
                    src="/icons/create-case.png"
                    alt="Add"
                    width={16}
                    height={16}
                  />
                  <span>Add Technology</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-6">
            <p className="font-semibold mb-6">Step 5: Thresholds</p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Threshold Distance Mean */}
              <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Threshold Distance Mean</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Value:</span>
                    <span className="font-medium">{thresholdDistanceMean}</span>
                  </div>
                  <input
                    type="number"
                    value={thresholdDistanceMean}
                    onChange={(e) => setThresholdDistanceMean(parseFloat(e.target.value))}
                    className="w-full p-2 rounded border border-gray-300"
                  />
                </div>
              </div>

              {/* Threshold Criteria Percent */}
              <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Threshold Criteria Percent</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Value:</span>
                    <span className="font-medium">{thresholdCriteriaPercent}</span>
                  </div>
                  <input
                    type="number"
                    value={thresholdCriteriaPercent}
                    onChange={(e) => setThresholdCriteriaPercent(parseFloat(e.target.value))}
                    className="w-full p-2 rounded border border-gray-300"
                  />
                </div>
              </div>

              {/* Threshold Tech Percent */}
              <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Threshold Tech Percent</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Value:</span>
                    <span className="font-medium">{thresholdTechPercent}</span>
                  </div>
                  <input
                    type="number"
                    value={thresholdTechPercent}
                    onChange={(e) => setThresholdTechPercent(parseFloat(e.target.value))}
                    className="w-full p-2 rounded border border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-6">
            <p className="font-semibold mb-6">Step 6: Summary</p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Case Information Frame */}
              <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Case Information</h3>
                  {isStepComplete(1) && (
                    <span className="text-green-500">✓</span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="font-medium">{caseName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-medium capitalize">{caseType}</span>
                  </div>
                </div>
              </div>

              {/* Experts Frame */}
              <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Experts</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isStepComplete(2) ? "text-green-500" : "text-gray-600 dark:text-gray-400"}`}>
                      {Object.values(selectedUsers).filter(user => user !== null).length}/30
                    </span>
                    {isStepComplete(2) && (
                      <span className="text-green-500">✓</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {Object.values(selectedUsers)
                    .filter(user => user !== null)
                    .map((user, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">{index + 1}.</span>
                        <span>{user?.username}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Technologies Frame */}
              <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Technologies</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isStepComplete(4) ? "text-green-500" : "text-gray-600 dark:text-gray-400"}`}>
                      {technologies.filter(t => t.trim() !== "").length}/30
                    </span>
                    {isStepComplete(4) && (
                      <span className="text-green-500">✓</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {technologies
                    .filter(tech => tech.trim() !== "")
                    .map((tech, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">{index + 1}.</span>
                        <span>{tech}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Criteria Frame */}
              <div className="bg-blue-100 dark:bg-blue-950/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-900/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Criteria</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isStepComplete(3) ? "text-green-500" : "text-gray-600 dark:text-gray-400"}`}>
                      {criteria.filter(c => c.trim() !== "").length}/30
                    </span>
                    {isStepComplete(3) && (
                      <span className="text-green-500">✓</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {criteria
                    .filter(crit => crit.trim() !== "")
                    .map((crit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400">{index + 1}.</span>
                        <span>{crit}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Confirmation Checkbox - spans full width */}
              <div className="col-span-2 mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDataConfirmed}
                    onChange={(e) => setIsDataConfirmed(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>I confirm that all entered data is correct</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={prevStep}
          className={`px-4 py-2 rounded ${
            step === 1
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
          disabled={step === 1}
        >
          Back
        </button>
        <button
          type="button"
          onClick={step === 6 && areAllStepsComplete() ? handleSubmit : nextStep}
          disabled={!isStepComplete(step)}
          className={`px-4 py-2 rounded ${
            !isStepComplete(step)
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {step === 6 ? "Create Case" : "Next"}
        </button>
      </div>
    </div>
  );
}
