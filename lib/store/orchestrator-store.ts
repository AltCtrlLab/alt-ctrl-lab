import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Task,
  TaskStatus,
  ValidationAction,
  AgentType,
  SupervisorResponse,
} from '@/lib/schemas/agents';

interface OrchestratorState {
  currentTasks: Task[];
  completedTasks: Task[];
  pendingValidations: Task[];
  supervisorQueue: SupervisorResponse[];
  isProcessing: boolean;
  lastSync: string | null;
  selectedTask: Task | null;
}

interface OrchestratorActions {
  addTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  submitValidation: (taskId: string, action: ValidationAction, feedback?: string) => void;
  addSupervisorResponse: (response: SupervisorResponse) => void;
  setSelectedTask: (task: Task | null) => void;
  clearCompleted: () => void;
  rehydrate: () => void;
}

const initialState: OrchestratorState = {
  currentTasks: [],
  completedTasks: [],
  pendingValidations: [],
  supervisorQueue: [],
  isProcessing: false,
  lastSync: null,
  selectedTask: null,
};

export const useOrchestratorStore = create<OrchestratorState & OrchestratorActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        addTask: (task) => {
          set((state) => ({
            currentTasks: [...state.currentTasks, task],
            lastSync: new Date().toISOString(),
          }), false, 'addTask');
        },

        updateTaskStatus: (taskId, status) => {
          set((state) => {
            const taskIndex = state.currentTasks.findIndex((t) => t.id === taskId);
            if (taskIndex === -1) return state;

            const updatedTask = {
              ...state.currentTasks[taskIndex],
              status,
              updatedAt: new Date().toISOString(),
            };

            const newCurrentTasks = [...state.currentTasks];
            newCurrentTasks[taskIndex] = updatedTask;

            let newPendingValidations = state.pendingValidations;
            if (status === 'Pending_Validation') {
              newPendingValidations = [...state.pendingValidations, updatedTask];
            }

            return {
              currentTasks: newCurrentTasks,
              pendingValidations: newPendingValidations,
              lastSync: new Date().toISOString(),
            };
          }, false, 'updateTaskStatus');
        },

        submitValidation: (taskId, action, feedback) => {
          set((state) => {
            const now = new Date().toISOString();
            const taskIndex = state.currentTasks.findIndex((t) => t.id === taskId);
            
            if (taskIndex === -1) return state;

            const currentTask = state.currentTasks[taskIndex];
            const newValidation = {
              timestamp: now,
              action,
              feedback,
            };

            const updatedTask: Task = {
              ...currentTask,
              status: action === 'Approve' ? 'Completed' : 'Rejected',
              updatedAt: now,
              userFeedback: feedback,
              validationHistory: [...(currentTask.validationHistory || []), newValidation],
            };

            const newCurrentTasks = [...state.currentTasks];
            newCurrentTasks[taskIndex] = updatedTask;

            const newPendingValidations = state.pendingValidations.filter(
              (t) => t.id !== taskId
            );

            const newCompletedTasks = action === 'Approve' 
              ? [...state.completedTasks, updatedTask]
              : state.completedTasks;

            return {
              currentTasks: newCurrentTasks,
              pendingValidations: newPendingValidations,
              completedTasks: newCompletedTasks,
              lastSync: now,
            };
          }, false, 'submitValidation');
        },

        addSupervisorResponse: (response) => {
          set((state) => ({
            supervisorQueue: [...state.supervisorQueue, response],
            isProcessing: true,
            lastSync: new Date().toISOString(),
          }), false, 'addSupervisorResponse');
        },

        setSelectedTask: (task) => {
          set({ selectedTask: task }, false, 'setSelectedTask');
        },

        clearCompleted: () => {
          set((state) => ({
            completedTasks: [],
            lastSync: new Date().toISOString(),
          }), false, 'clearCompleted');
        },

        rehydrate: () => {
          set({ lastSync: new Date().toISOString() }, false, 'rehydrate');
        },
      }),
      {
        name: 'altctrl-orchestrator',
        partialize: (state) => ({
          currentTasks: state.currentTasks,
          completedTasks: state.completedTasks,
          pendingValidations: state.pendingValidations,
          supervisorQueue: state.supervisorQueue,
        }),
      }
    )
  )
);

export const selectTasksByAgent = (state: OrchestratorState, agentType: AgentType) => 
  state.currentTasks.filter((t) => t.agentType === agentType);

export const selectPendingValidationsByAgent = (state: OrchestratorState, agentType: AgentType) =>
  state.pendingValidations.filter((t) => t.agentType === agentType);

export const selectTaskCountByStatus = (state: OrchestratorState, status: TaskStatus) =>
  state.currentTasks.filter((t) => t.status === status).length;
