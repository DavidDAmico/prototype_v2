"use client";

import React from 'react';

export interface FuzzyVector {
  a: number;
  b: number;
  c: number;
}

interface LikertScaleProps {
  value: number;
  onChange: (value: number, fuzzyVector: FuzzyVector) => void;
  type: 'importance' | 'performance';
  disabled?: boolean;
  locked?: boolean;
}

// Mapping von Likert-Werten zu Fuzzy-Vektoren
export const getFuzzyVectorForValue = (value: number): FuzzyVector => {
  switch (value) {
    case 1: return { a: 0, b: 0, c: 0.1 };
    case 2: return { a: 0, b: 0.1, c: 0.3 };
    case 3: return { a: 0.1, b: 0.3, c: 0.5 };
    case 4: return { a: 0.3, b: 0.5, c: 0.7 };
    case 5: return { a: 0.5, b: 0.7, c: 0.9 };
    case 6: return { a: 0.7, b: 0.9, c: 1 };
    case 7: return { a: 0.9, b: 1, c: 1 };
    default: return { a: 0, b: 0, c: 0 };
  }
};

const LikertScale: React.FC<LikertScaleProps> = ({ value, onChange, type, disabled = false, locked = false }) => {
  const options = type === 'importance' 
    ? [
        { value: 1, label: "Not important\nat all" },
        { value: 2, label: "Mostly not\nimportant" },
        { value: 3, label: "Somewhat not\nimportant" },
        { value: 4, label: "Neither important\nnor unimportant" },
        { value: 5, label: "Somewhat\nimportant" },
        { value: 6, label: "Mostly\nImportant" },
        { value: 7, label: "Extremely\nimportant" }
      ]
    : [
        { value: 1, label: "Very poor\nperformance" },
        { value: 2, label: "Mostly poor\nperformance" },
        { value: 3, label: "Somewhat poor\nperformance" },
        { value: 4, label: "Neither good\nnor poor" },
        { value: 5, label: "Somewhat good\nperformance" },
        { value: 6, label: "Mostly good\nperformance" },
        { value: 7, label: "Very good\nperformance" }
      ];

  const handleChange = (newValue: number) => {
    if (disabled || locked) return;
    const fuzzyVector = getFuzzyVectorForValue(newValue);
    onChange(newValue, fuzzyVector);
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between">
        {options.map((option) => (
          <div
            key={option.value}
            className="flex flex-col items-center cursor-pointer"
            onClick={() => handleChange(option.value)}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                value === option.value
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${locked ? 'opacity-70 cursor-not-allowed border-2 border-blue-400' : ''}`}
            >
              {option.value}
            </div>
            <div className="text-xs text-center mt-1 w-16 whitespace-pre-line">
              {option.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LikertScale;
