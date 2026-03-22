'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVICES, ServiceId, SERVICE_TO_DIRECTOR } from './types';

interface BriefInputProps {
  onSubmit?: (data: { brief: string; serviceId: ServiceId; directorId: string }) => void;
  className?: string;
}

export const BriefInput: React.FC<BriefInputProps> = ({ 
  onSubmit,
  className = '' 
}) => {
  const [brief, setBrief] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceId>('full_agency');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!brief.trim()) {
      setError('Veuillez décrire votre projet');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const directorId = SERVICE_TO_DIRECTOR[selectedService];
      
      let endpoint = '/api/supervisor';
      let payload: any = {
        brief: brief.trim(),
        service_id: selectedService,
        priority: 'high'
      };

      if (selectedService !== 'full_agency') {
        endpoint = '/api/orchestrate';
        const TEAM_MAPPING: Record<string, string> = {
          'musawwir': 'raqim',
          'matin': 'banna',
          'fatah': 'khatib',
          'hasib': 'sani'
        };
        payload = {
          director_id: directorId,
          executor_id: TEAM_MAPPING[directorId],
          brief: brief.trim(),
          timeout: 900
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success || response.status === 202) {
        setSuccess(true);
        setBrief('');
        onSubmit?.({ 
          brief: brief.trim(), 
          serviceId: selectedService,
          directorId: SERVICE_TO_DIRECTOR[selectedService]
        });
      } else {
        setError(data.error?.message || 'Erreur lors de l\'envoi');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedServiceData = SERVICES.find(s => s.id === selectedService);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-neutral-900 rounded-xl border border-neutral-800 p-6 ${className}`}
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Nouvelle Mission</h2>
        <p className="text-sm text-neutral-500">
          Sélectionnez un service et décrivez votre projet.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélecteur de Service - Dropdown Premium */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-neutral-300 block">
            Sélectionnez un service
          </label>
          
          <div className="relative">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as ServiceId)}
              className="w-full appearance-none bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent cursor-pointer transition-all hover:border-neutral-700"
            >
              {SERVICES.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.icon} {service.name}
                </option>
              ))}
            </select>
            
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
              <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* Info du service */}
          <motion.div 
            key={selectedService}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 p-3 bg-neutral-950/50 rounded-lg border border-neutral-800"
          >
            <span className="text-2xl">{selectedServiceData?.icon}</span>
            <div>
              <p className="text-sm font-medium text-white">{selectedServiceData?.name}</p>
              <p className="text-xs text-neutral-500">{selectedServiceData?.description}</p>
            </div>
          </motion.div>
        </div>

        {/* Textarea Brief */}
        <div>
          <label htmlFor="brief" className="block text-sm font-medium text-neutral-400 mb-2">
            Description du projet
          </label>
          <textarea
            id="brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={selectedService === 'full_agency'
              ? "Décrivez votre projet complet..."
              : `Décrivez ce que vous attendez du service ${selectedServiceData?.name}...`
            }
            className="w-full h-32 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent resize-none transition-all"
            disabled={isLoading}
          />
        </div>

        {/* Error / Success */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 bg-red-950/50 border border-red-900/50 rounded-lg"
            >
              <p className="text-sm text-red-400">{error}</p>
            </motion.div>
          )}
          
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 bg-emerald-950/50 border border-emerald-900/50 rounded-lg"
            >
              <p className="text-sm text-emerald-400">
                ✓ Mission envoyée au service {selectedServiceData?.name} !
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading || !brief.trim()}
          className="w-full py-3 px-4 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/20"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Envoi en cours...</span>
            </>
          ) : (
            <>
              <span>Lancer avec {selectedServiceData?.name}</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default BriefInput;
