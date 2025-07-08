import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

interface AppSettings {
  businessName: string;
  businessSubtitle: string;
  logoUrl: string;
  useCustomLogo: boolean;
}

const getStorageKey = (businessId: string) => `business-${businessId}-settings`;

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    businessName: 'Sistema de Gestão',
    businessSubtitle: 'Depósito de Bebidas',
    logoUrl: '',
    useCustomLogo: false,
  });

  useEffect(() => {
    if (!user) return;
    
    const loadSettings = async () => {
      try {
        const serverSettings = await apiService.getBusinessSettings();
        if (serverSettings) {
          const mappedSettings: AppSettings = {
            businessName: serverSettings.name || 'Sistema de Gestão',
            businessSubtitle: serverSettings.subtitle || 'Depósito de Bebidas',
            logoUrl: serverSettings.logo_url || '',
            useCustomLogo: serverSettings.use_custom_logo || false,
          };
          setSettings(mappedSettings);
          
          // Backup local
          const storageKey = getStorageKey(user.businessId);
          localStorage.setItem(storageKey, JSON.stringify(mappedSettings));
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar configurações do servidor:', error);
      }
      
      // Fallback para dados locais
      const storageKey = getStorageKey(user.businessId);
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings(parsedSettings);
      } else {
        // Configurações padrão
        const defaultSettings: AppSettings = {
          businessName: 'Sistema de Gestão',
          businessSubtitle: 'Depósito de Bebidas',
          logoUrl: '',
          useCustomLogo: false,
        };
        setSettings(defaultSettings);
        const storageKey = getStorageKey(user.businessId);
        localStorage.setItem(storageKey, JSON.stringify(defaultSettings));
      }
    };

    loadSettings();
  }, [user]);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!user) return;
    
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      // Mapear para formato do servidor
      const serverSettings = {
        name: updatedSettings.businessName,
        subtitle: updatedSettings.businessSubtitle,
        logoUrl: updatedSettings.logoUrl,
        useCustomLogo: updatedSettings.useCustomLogo
      };
      
      await apiService.updateBusinessSettings(serverSettings);
    } catch (error) {
      console.error('Erro ao salvar configurações no servidor:', error);
    }
    
    // Backup local
    const storageKey = getStorageKey(user.businessId);
    localStorage.setItem(storageKey, JSON.stringify(updatedSettings));
  };

  const resetSettings = async () => {
    if (!user) return;
    
    const defaultSettings: AppSettings = {
      businessName: 'Sistema de Gestão',
      businessSubtitle: 'Depósito de Bebidas',
      logoUrl: '',
      useCustomLogo: false,
    };
    
    setSettings(defaultSettings);
    const storageKey = getStorageKey(user.businessId);
    await DatabaseService.saveData(storageKey, defaultSettings, user.id, user.businessId);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}