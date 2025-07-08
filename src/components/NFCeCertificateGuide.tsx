import { } from 'react';
import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Key,
  X, 
  Shield, 
  CheckCircle, 
  FileText, 
  Info,
  DollarSign,
  Settings,
  Lock,
  Globe,
  Clock,
  Phone,
  Mail,
  ExternalLink
} from 'lucide-react';

interface NFCeCertificateGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NFCeCertificateGuide({ isOpen, onClose }: NFCeCertificateGuideProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'step-by-step' | 'technical' | 'testing'>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-yellow-500/30">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-900 to-black border-b border-yellow-500/30 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-yellow-400 mr-3" />
              <div>
                <h2 className="text-xl font-bold text-white">Guia de Certificados Digitais para NFCe</h2>
                <p className="text-gray-400 text-sm">Passo a passo completo para produção</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mt-4">
            {[
              { id: 'overview', label: 'Visão Geral', icon: Info },
              { id: 'step-by-step', label: 'Passo a Passo', icon: CheckCircle },
              { id: 'technical', label: 'Implementação', icon: Settings },
              { id: 'testing', label: 'Homologação', icon: FileText }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  activeTab === id
                    ? 'bg-yellow-500 text-black font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Content sections */}
          {/* ... rest of the component content ... */}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6">
          {/* ... footer content ... */}
        </div>
      </div>
    </div>
  );
}