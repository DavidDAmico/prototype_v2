"use client";

import React from 'react';

interface LikertScaleProps {
  value: number;
  onChange: (value: number) => void;
  type: 'importance' | 'performance';
}

const LikertScale: React.FC<LikertScaleProps> = ({ value, onChange, type }) => {
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
        { value: 7, label: "Excellent\nperformance" }
      ];

  return (
    <div className="flex justify-between items-start gap-2 py-4">
      {options.map((option) => (
        <div key={option.value} className="flex flex-col items-center gap-3 min-w-[80px]">
          <div
            onClick={() => onChange(option.value)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onChange(option.value);
              }
            }}
            className={`
              w-[20px] h-[20px] rounded-full cursor-pointer
              ${value === option.value 
                ? 'bg-blue-500' 
                : 'border-2 border-gray-300 bg-white'
              }
            `}
            aria-label={option.label.replace('\n', ' ')}
          />
          <span className={`text-xs text-center whitespace-pre-line leading-tight ${
            value === option.value ? 'text-blue-500' : 'text-gray-600'
          }`}>
            {option.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default LikertScale;
