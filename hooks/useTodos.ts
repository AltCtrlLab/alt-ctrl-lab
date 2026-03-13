'use client';

import { useState, useEffect, useCallback } from 'react';

export type TodoView = 'today' | 'week' | 'month' | 'overdue';
export type TodoPriority = 'low' | 'medium' | 'high' | 'critical';
export type TodoCategory = 'personal' | 'work' | 'urgent' | 'backlog';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  category: TodoCategory;
  priority: TodoPriority;
  assignedTo?: string;
  assignedToName?: string;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  isCompleted: boolean;
  isRecurring: boolean;
  source: string;
}

export interface TodoStats {
  today: number;
  week: number;
  month: number;
  overdue: number;
}

export function useTodos(initialView: TodoView = 'today') {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [view, setView] = useState<TodoView>(initialView);
  const [loading, setLoading] = useState(false);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/todos?view=${view}`);
      const data = await res.json();
      if (data.success) {
        setTodos(data.data.todos);
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    fetchTodos();
    const interval = setInterval(fetchTodos, 10000); // Refresh toutes les 10s
    return () => clearInterval(interval);
  }, [fetchTodos]);

  const createTodo = async (todo: Partial<Todo>) => {
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todo),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTodos();
        return { success: true, id: data.data.id };
      }
    } catch (err) {
      console.error('Failed to create todo:', err);
    }
    return { success: false };
  };

  const toggleComplete = async (id: string, isCompleted: boolean) => {
    try {
      await fetch(`/api/todos?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted }),
      });
      await fetchTodos();
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      await fetchTodos();
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  return {
    todos,
    stats,
    view,
    setView,
    loading,
    createTodo,
    toggleComplete,
    deleteTodo,
    refresh: fetchTodos,
  };
}
