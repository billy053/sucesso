import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDataPersistence } from './useDataPersistence';

interface AppSettings {
  businessName: string;
  businessSubtitle: string;
  logoUrl: string;
  useCustomLogo: boolean;
}

const defaultSettings: AppSettings = {
  businessName: 'Sistema de Gestão',
  businessSubtitle: 'Depósito de Bebidas',
  logoUrl: '',
  useCustomLogo: false,
};

// Função para converter dados do servidor para formato local
const parseSettingsFromServer = (serverSettings: any): AppSettings => ({
  businessName: serverSettings.name || serverSettings.businessName || defaultSettings.businessName,
  businessSubtitle: serverSettings.subtitle || serverSettings.businessSubtitle || defaultSettings.businessSubtitle,
  logoUrl: serverSettings.logo_url || serverSettings.logoUrl || defaultSettings.logoUrl,
  useCustomLogo: serverSettings.use_custom_logo || serverSettings.useCustomLogo || defaultSettings.useCustomLogo,
});

export function useSettings() {
  const { user } = useAuth();
  const { loadData, saveData } = useDataPersistence();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        console.log('⚙️ Carregando configurações...');
        
        const serverSettings = await loadData('settings');
        
        if (serverSettings && serverSettings.length > 0) {
          console.log('✅ Configurações carregadas do servidor');
          const parsedSettings = parseSettingsFromServer(serverSettings[0]);
          setSettings(parsedSettings);
        } else {
          console.log('⚙️ Usando configurações padrão');
          setSettings(defaultSettings);
          
          // Salvar configurações padrão
          await saveData('settings', 'create', defaultSettings, 'default-settings');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user, loadData, saveData]);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // Atualizar estado local imediatamente
      setSettings(updatedSettings);
      
      // Salvar com persistência offline
      await saveData('settings', 'update', updatedSettings, 'default-settings');
      
      console.log('✅ Configurações atualizadas');
    } catch (error) {
      console.error('❌ Erro ao atualizar configurações:', error);
      throw error;
    }
  };

  const resetSettings = async () => {
    try {
      // Atualizar estado local imediatamente
      setSettings(defaultSettings);
      
      // Salvar com persistência offline
      await saveData('settings', 'update', defaultSettings, 'default-settings');
      
      console.log('🔄 Configurações resetadas');
    } catch (error) {
      console.error('❌ Erro ao resetar configurações:', error);
      throw error;
    }
  };

  // Função para recarregar configurações do servidor
  const refreshSettings = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const serverSettings = await loadData('settings');
      
      if (serverSettings && serverSettings.length > 0) {
        const parsedSettings = parseSettingsFromServer(serverSettings[0]);
        setSettings(parsedSettings);
        console.log('🔄 Configurações recarregadas do servidor');
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    resetSettings,
    refreshSettings,
  };
}