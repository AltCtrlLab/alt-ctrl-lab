'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Rocket,
  Users,
  Activity,
  KanbanSquare,
  FlaskConical,
  Lock,
  Settings,
  Plus,
  Palette,
  PanelLeftClose,
  User,
  ChevronRight,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (viewId: string) => void;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  isDark: boolean;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section: 'Navigation' | 'Actions' | 'Agents';
  action: () => void;
  shortcut?: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onToggleTheme,
  onToggleSidebar,
  isDark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Define all command items
  const allCommands: CommandItem[] = useMemo(
    () => [
      // Navigation items
      {
        id: 'ops-center',
        label: 'Centre Ops',
        icon: <LayoutDashboard className="w-4 h-4" />,
        section: 'Navigation' as const,
        action: () => {
          onNavigate('ops-center');
          onClose();
        },
        shortcut: '⌘1',
      },
      {
        id: 'mission-control',
        label: 'Contrôle Briefs',
        icon: <Rocket className="w-4 h-4" />,
        section: 'Navigation' as const,
        action: () => {
          onNavigate('mission-control');
          onClose();
        },
        shortcut: '⌘2',
      },
      {
        id: 'team-roster',
        label: 'Effectif Équipe',
        icon: <Users className="w-4 h-4" />,
        section: 'Navigation' as const,
        action: () => {
          onNavigate('team-roster');
          onClose();
        },
        shortcut: '⌘3',
      },
      {
        id: 'activite',
        label: 'Activité',
        icon: <Activity className="w-4 h-4" />,
        section: 'Navigation' as const,
        action: () => {
          onNavigate('activite');
          onClose();
        },
        shortcut: '⌘4',
      },
      {
        id: 'kanban',
        label: 'Kanban',
        icon: <KanbanSquare className="w-4 h-4" />,
        section: 'Navigation' as const,
        action: () => {
          onNavigate('kanban');
          onClose();
        },
        shortcut: '⌘5',
      },
      {
        id: 'rd-lab',
        label: 'Labo R&D',
        icon: <FlaskConical className="w-4 h-4" />,
        section: 'Navigation' as const,
        action: () => {
          onNavigate('rd-lab');
          onClose();
        },
        shortcut: '⌘6',
      },
      {
        id: 'the-vault',
        label: 'La Voûte',
        icon: <Lock className="w-4 h-4" />,
        section: 'Navigation' as const,
        action: () => {
          onNavigate('the-vault');
          onClose();
        },
        shortcut: '⌘7',
      },
      {
        id: 'settings',
        label: 'Réglages',
        icon: <Settings className="w-4 h-4" />,
        section: 'Navigation' as const,
        action: () => {
          onNavigate('settings');
          onClose();
        },
        shortcut: '⌘,',
      },
      // Action items
      {
        id: 'nouvelle-mission',
        label: 'Nouveau Brief',
        icon: <Plus className="w-4 h-4" />,
        section: 'Actions' as const,
        action: () => {
          onNavigate('nouvelle-mission');
          onClose();
        },
        shortcut: '⌘N',
      },
      {
        id: 'toggle-theme',
        label: 'Basculer Thème',
        icon: <Palette className="w-4 h-4" />,
        section: 'Actions' as const,
        action: () => {
          onToggleTheme();
          onClose();
        },
        shortcut: '⌘T',
      },
      {
        id: 'toggle-sidebar',
        label: 'Basculer Barre Latérale',
        icon: <PanelLeftClose className="w-4 h-4" />,
        section: 'Actions' as const,
        action: () => {
          onToggleSidebar();
          onClose();
        },
        shortcut: '⌘B',
      },
      // Agent items
      {
        id: 'agent-abdulhakim',
        label: 'abdulhakim (CEO)',
        icon: <User className="w-4 h-4" />,
        section: 'Agents' as const,
        action: () => {
          onNavigate('agent-abdulhakim');
          onClose();
        },
      },
      {
        id: 'agent-musawwir',
        label: 'musawwir (DA)',
        icon: <User className="w-4 h-4" />,
        section: 'Agents' as const,
        action: () => {
          onNavigate('agent-musawwir');
          onClose();
        },
      },
      {
        id: 'agent-matin',
        label: 'matin (CTO)',
        icon: <User className="w-4 h-4" />,
        section: 'Agents' as const,
        action: () => {
          onNavigate('agent-matin');
          onClose();
        },
      },
      {
        id: 'agent-fatah',
        label: 'fatah (CGO)',
        icon: <User className="w-4 h-4" />,
        section: 'Agents' as const,
        action: () => {
          onNavigate('agent-fatah');
          onClose();
        },
      },
      {
        id: 'agent-hasib',
        label: 'hasib (Data)',
        icon: <User className="w-4 h-4" />,
        section: 'Agents' as const,
        action: () => {
          onNavigate('agent-hasib');
          onClose();
        },
      },
      {
        id: 'agent-raqim',
        label: 'raqim',
        icon: <User className="w-4 h-4" />,
        section: 'Agents' as const,
        action: () => {
          onNavigate('agent-raqim');
          onClose();
        },
      },
      {
        id: 'agent-banna',
        label: 'banna',
        icon: <User className="w-4 h-4" />,
        section: 'Agents' as const,
        action: () => {
          onNavigate('agent-banna');
          onClose();
        },
      },
      {
        id: 'agent-khatib',
        label: 'khatib',
        icon: <User className="w-4 h-4" />,
        section: 'Agents' as const,
        action: () => {
          onNavigate('agent-khatib');
          onClose();
        },
      },
      {
        id: 'agent-sani',
        label: 'sani',
        icon: <User className="w-4 h-4" />,
        section: 'Agents' as const,
        action: () => {
          onNavigate('agent-sani');
          onClose();
        },
      },
    ],
    [onNavigate, onToggleTheme, onToggleSidebar, onClose]
  );

  // Fuzzy search filtering
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCommands;
    }

    const query = searchQuery.toLowerCase();
    return allCommands.filter((command) =>
      command.label.toLowerCase().includes(query)
    );
  }, [searchQuery, allCommands]);

  // Group filtered commands by section
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      Navigation: [],
      Actions: [],
      Agents: [],
    };

    filteredCommands.forEach((command) => {
      groups[command.section].push(command);
    });

    return groups;
  }, [filteredCommands]);

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let currentIndex = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-neutral-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
              <Search className="w-5 h-5 text-neutral-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une action, un agent, une vue..."
                className="flex-1 bg-transparent text-white placeholder-neutral-500 outline-none text-sm"
              />
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-500 text-sm">
                  Aucun résultat trouvé
                </div>
              ) : (
                <>
                  {/* Navigation Section */}
                  {groupedCommands.Navigation.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Navigation
                      </div>
                      <div className="space-y-1">
                        {groupedCommands.Navigation.map((command) => {
                          const itemIndex = currentIndex++;
                          const isSelected = itemIndex === selectedIndex;
                          return (
                            <div
                              key={command.id}
                              ref={(el) => (itemRefs.current[itemIndex] = el)}
                              onClick={command.action}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-white/10 rounded-xl'
                                  : 'hover:bg-white/5 rounded-xl'
                              }`}
                            >
                              <div className="text-neutral-400">
                                {command.icon}
                              </div>
                              <span className="flex-1 text-sm text-white">
                                {command.label}
                              </span>
                              {command.shortcut && (
                                <span className="text-xs text-neutral-500 font-mono">
                                  {command.shortcut}
                                </span>
                              )}
                              {isSelected && (
                                <ChevronRight className="w-4 h-4 text-neutral-400" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions Section */}
                  {groupedCommands.Actions.length > 0 && (
                    <div className="mb-4">
                      <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Actions
                      </div>
                      <div className="space-y-1">
                        {groupedCommands.Actions.map((command) => {
                          const itemIndex = currentIndex++;
                          const isSelected = itemIndex === selectedIndex;
                          return (
                            <div
                              key={command.id}
                              ref={(el) => (itemRefs.current[itemIndex] = el)}
                              onClick={command.action}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-white/10 rounded-xl'
                                  : 'hover:bg-white/5 rounded-xl'
                              }`}
                            >
                              <div className="text-neutral-400">
                                {command.icon}
                              </div>
                              <span className="flex-1 text-sm text-white">
                                {command.label}
                              </span>
                              {command.shortcut && (
                                <span className="text-xs text-neutral-500 font-mono">
                                  {command.shortcut}
                                </span>
                              )}
                              {isSelected && (
                                <ChevronRight className="w-4 h-4 text-neutral-400" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Agents Section */}
                  {groupedCommands.Agents.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Agents
                      </div>
                      <div className="space-y-1">
                        {groupedCommands.Agents.map((command) => {
                          const itemIndex = currentIndex++;
                          const isSelected = itemIndex === selectedIndex;
                          return (
                            <div
                              key={command.id}
                              ref={(el) => (itemRefs.current[itemIndex] = el)}
                              onClick={command.action}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-white/10 rounded-xl'
                                  : 'hover:bg-white/5 rounded-xl'
                              }`}
                            >
                              <div className="text-neutral-400">
                                {command.icon}
                              </div>
                              <span className="flex-1 text-sm text-white">
                                {command.label}
                              </span>
                              {command.shortcut && (
                                <span className="text-xs text-neutral-500 font-mono">
                                  {command.shortcut}
                                </span>
                              )}
                              {isSelected && (
                                <ChevronRight className="w-4 h-4 text-neutral-400" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-neutral-950/50">
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">
                    ↑↓
                  </kbd>
                  Naviguer
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">
                    ↵
                  </kbd>
                  Sélectionner
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">
                    esc
                  </kbd>
                  Fermer
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
