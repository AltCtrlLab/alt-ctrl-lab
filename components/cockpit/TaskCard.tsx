'use client';

import React from 'react';
import { Task, Agent } from './types';
import { StatusBadge } from './StatusBadge';

interface TaskCardProps {
  task: Task;
  agent: Agent;
  onClick?: (taskId: string) => void;
  className?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  agent, 
  onClick,
  className = '' 
}) => {
  const handleClick = () => {
    onClick?.(task.id);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div
      onClick={handleClick}
      className={`
        bg-white rounded-lg border border-gray-200 p-4 shadow-sm
        hover:shadow-md transition-shadow cursor-pointer
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <StatusBadge status={task.status} size="sm" />
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
        {agent.avatar ? (
          <img
            src={agent.avatar}
            alt={agent.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-fuchsia-100 flex items-center justify-center">
            <span className="text-sm font-medium text-fuchsia-600">
              {agent.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {agent.name}
          </p>
          <p className="text-xs text-gray-400">
            {formatDate(task.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
