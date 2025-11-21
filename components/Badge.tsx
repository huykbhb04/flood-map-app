import React from 'react';
import { StatusLevel } from '../types';

interface BadgeProps {
  status: StatusLevel;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const styles = {
    [StatusLevel.SAFE]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    [StatusLevel.WARNING]: 'bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse',
    [StatusLevel.DANGER]: 'bg-red-100 text-red-800 border-red-200 animate-pulse-fast',
  };

  const labels = {
    [StatusLevel.SAFE]: 'SAFE',
    [StatusLevel.WARNING]: 'WARNING',
    [StatusLevel.DANGER]: 'DANGER',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]} ${className}`}>
      {labels[status]}
    </span>
  );
};
