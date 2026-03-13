'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, Circle, Plus, Trash2, Calendar, 
  Clock, AlertCircle, User, X, ChevronRight,
  Repeat
} from 'lucide-react';
import { useTodos, TodoView, TodoPriority } from '@/hooks/useTodos';

interface TodoPanelProps {
  isDark: boolean;
}

const getTheme = (isDark: boolean) => ({
  glass: isDark 
    ? 'bg-white/[0.03] border-white/[0.08]' 
    : 'bg-white/60 border-white/40',
  textMuted: isDark ? 'text-neutral-400' : 'text-neutral-500',
  textMain: isDark ? 'text-neutral-200' : 'text-neutral-800',
  textHeading: isDark ? 'text-neutral-100' : 'text-neutral-900',
  borderLight: isDark ? 'border-white/[0.05]' : 'border-neutral-200/60',
});

const priorityConfig: Record<TodoPriority, { color: string; label: string; icon: any }> = {
  critical: { color: 'text-rose-500', label: 'Critique', icon: AlertCircle },
  high: { color: 'text-orange-500', label: 'Haute', icon: AlertCircle },
  medium: { color: 'text-yellow-500', label: 'Moyenne', icon: Clock },
  low: { color: 'text-blue-500', label: 'Basse', icon: Clock },
};

const categoryColors: Record<string, string> = {
  personal: 'bg-purple-500/20 text-purple-400',
  work: 'bg-blue-500/20 text-blue-400',
  urgent: 'bg-rose-500/20 text-rose-400',
  backlog: 'bg-neutral-500/20 text-neutral-400',
};

const viewLabels: Record<TodoView, { label: string; icon: any }> = {
  today: { label: 'Aujourd\'hui', icon: Clock },
  week: { label: 'Cette semaine', icon: Calendar },
  month: { label: '30 jours', icon: Calendar },
  overdue: { label: 'En retard', icon: AlertCircle },
};

export const TodoPanel: React.FC<TodoPanelProps> = ({ isDark }) => {
  const t = getTheme(isDark);
  const { todos, stats, view, setView, loading, createTodo, toggleComplete, deleteTodo } = useTodos('today');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as TodoPriority,
    category: 'work' as const,
    dueDate: new Date().toISOString().split('T')[0],
  });

  const handleAdd = async () => {
    if (!newTodo.title.trim()) return;
    await createTodo(newTodo);
    setShowAddModal(false);
    setNewTodo({
      title: '',
      description: '',
      priority: 'medium',
      category: 'work',
      dueDate: new Date().toISOString().split('T')[0],
    });
  };

  const tabs: TodoView[] = ['today', 'week', 'month'];

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header avec onglets */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${t.glass} backdrop-blur-xl rounded-2xl border p-4`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${t.textHeading} font-semibold flex items-center gap-2`}>
            <CheckCircle2 className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
            TODO List
          </h2>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
              isDark 
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            } transition-colors`}
          >
            <Plus size={16} />
            Nouvelle tâche
          </motion.button>
        </div>

        {/* Onglets */}
        <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
          {tabs.map((tab) => {
            const config = viewLabels[tab];
            const Icon = config.icon;
            const isActive = view === tab;
            const count = stats?.[tab] || 0;
            
            return (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? (isDark 
                        ? 'bg-white/10 text-white shadow-lg' 
                        : 'bg-white text-neutral-900 shadow-sm')
                    : t.textMuted
                }`}
              >
                <Icon size={14} />
                <span>{config.label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    isActive 
                      ? (isDark ? 'bg-white/20' : 'bg-neutral-200') 
                      : (isDark ? 'bg-white/10' : 'bg-white')
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Alertes en retard */}
        {stats?.overdue && stats.overdue > 0 && view !== 'overdue' && (
          <button
            onClick={() => setView('overdue')}
            className={`mt-3 w-full p-3 rounded-lg flex items-center justify-between ${
              isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-100 text-rose-700'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle size={16} />
              {stats.overdue} tâche{stats.overdue > 1 ? 's' : ''} en retard
            </span>
            <ChevronRight size={16} />
          </button>
        )}
      </motion.div>

      {/* Liste des todos */}
      <div className={`flex-1 ${t.glass} backdrop-blur-xl rounded-2xl border overflow-hidden flex flex-col`}>
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="popLayout">
            {todos.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  isDark ? 'bg-white/5' : 'bg-white'
                }`}>
                  <CheckCircle2 size={32} className={t.textMuted} />
                </div>
                <p className={t.textMuted}>Aucune tâche pour cette période</p>
              </motion.div>
            )}

            {todos.map((todo, idx) => {
              const priority = priorityConfig[todo.priority];
              const PriorityIcon = priority.icon;
              
              return (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`group p-4 rounded-xl border mb-3 transition-all ${
                    todo.isCompleted
                      ? (isDark ? 'bg-white/5 opacity-50' : 'bg-white/50 opacity-50')
                      : (isDark ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-white/80 hover:bg-white')
                  } ${t.borderLight}`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleComplete(todo.id, !todo.isCompleted)}
                      className={`mt-0.5 transition-colors ${
                        todo.isCompleted 
                          ? 'text-emerald-500' 
                          : (isDark ? 'text-neutral-600 hover:text-neutral-400' : 'text-neutral-400 hover:text-neutral-600')
                      }`}
                    >
                      {todo.isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${todo.isCompleted ? 'line-through ' + t.textMuted : t.textMain}`}>
                          {todo.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryColors[todo.category]}`}>
                          {todo.category}
                        </span>
                        
                        {todo.isRecurring && (
                          <Repeat size={12} className={t.textMuted} />
                        )}
                      </div>
                      
                      {todo.description && (
                        <p className={`text-sm mt-1 ${t.textMuted}`}>{todo.description}</p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={`flex items-center gap-1 ${priority.color}`}>
                          <PriorityIcon size={12} />
                          {priority.label}
                        </span>
                        
                        <span className={t.textMuted}>
                          📅 {new Date(todo.dueDate).toLocaleDateString('fr-FR')}
                        </span>
                        
                        {todo.assignedToName && (
                          <span className={`flex items-center gap-1 ${t.textMuted}`}>
                            <User size={12} />
                            {todo.assignedToName}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className={`opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all ${
                        isDark ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-600'
                      }`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal Ajout */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-md p-6 rounded-2xl ${t.glass} backdrop-blur-xl border`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${t.textHeading}`}>Nouvelle tâche</h3>
                <button onClick={() => setShowAddModal(false)} className={t.textMuted}>
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Titre de la tâche..."
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl bg-transparent border ${t.borderLight} ${t.textMain} placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                />
                
                <textarea
                  placeholder="Description (optionnel)..."
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl bg-transparent border ${t.borderLight} ${t.textMain} placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-20`}
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newTodo.priority}
                    onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as TodoPriority })}
                    className={`px-4 py-2 rounded-xl bg-transparent border ${t.borderLight} ${t.textMain}`}
                  >
                    <option value="low">Priorité: Basse</option>
                    <option value="medium">Priorité: Moyenne</option>
                    <option value="high">Priorité: Haute</option>
                    <option value="critical">Priorité: Critique</option>
                  </select>

                  <input
                    type="date"
                    value={newTodo.dueDate}
                    onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                    className={`px-4 py-2 rounded-xl bg-transparent border ${t.borderLight} ${t.textMain}`}
                  />
                </div>

                <button
                  onClick={handleAdd}
                  disabled={!newTodo.title.trim()}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    newTodo.title.trim()
                      ? (isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200')
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  Créer la tâche
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TodoPanel;
