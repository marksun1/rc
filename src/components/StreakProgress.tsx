import React from 'react';

interface StreakProgressProps {
  completed: number;
  goal: number;
  title: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const StreakProgress: React.FC<StreakProgressProps> = ({
  completed,
  goal,
  title,
  size = 80,
  strokeWidth = 8,
  className = ""
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min((completed / goal) * 100, 100);
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-slate-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-primary-500 transition-all duration-300 ease-in-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono text-gray-900 dark:text-slate-100">
            {completed}
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            / {goal}
          </span>
        </div>
      </div>
      <div className="text-xs font-chinese text-gray-600 dark:text-slate-400 font-medium mt-2 text-center">
        {title}
      </div>
    </div>
  );
};