import { useState, useEffect } from 'react';
import { NFCe, NFCeConfig } from '../types/nfce';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';

const getStorageKey = (businessId: string) => `business-${businessId}-nfce`;
const getConfigKey = (businessId: string) => `business-${businessId}-nfce-config`;

export function useNFCe() {
  const { user } = useAuth();
  const [nfces, setNfces] = useState<NFCe[]>([]);
  const [config, setConfigState] = useState<NFCeConfig | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const loadNFCes = async () => {
      try {
        const serverNFCes = await apiService.getNFCes();
        if (serverNFCes && serverNFCes.length > 0) {
          const parsedNFCes = serverNFCes.map((n: any) => ({
            ...n,
            dataEmissao: new Date(n.dataEmissao || n.created_at),
            dataVencimento: n.dataVencimento ? new Date(n.dataVencimento) : undefined,
            dataAutorizacao: n.dataAutorizacao ? new Date(n.dataAutorizacao) : undefined,
          }));
          setNfces(parsedNFCes);
          
          // Backup local
          const storageKey = getStorageKey(user.businessId);
          localStorage.setItem(storageKey, JSON.stringify(parsedNFCes));
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar NFCe do servidor:', error);
      }
      
      // Fallback para dados locais
      const storageKey = getStorageKey(user.businessId);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedNFCes = JSON.parse(stored).map((n: any) => ({
          ...n,
          dataEmissao: new Date(n.dataEmissao),
          dataVencimento: n.dataVencimento ? new Date(n.dataVencimento) : undefined,
          dataAutorizacao: n.dataAutorizacao ? new Date(n.dataAutorizacao) : undefined,
        }));
        setNfces(parsedNFCes);
      }
    };
    
    // Carregar configuração
    const configKey = getConfigKey(user.businessId);
    const storedConfig = localStorage.getItem(configKey);
    if (storedConfig) {
      const parsedConfig = JSON.parse(storedConfig);
      setConfigState(parsedConfig);
    }

    loadNFCes();
  }, [user]);

  const saveNFCes = async (updatedNFCes: NFCe[]) => {
    if (!user?.businessId) return;
    
    setNfces(updatedNFCes);
    const storageKey = getStorageKey(user.businessId);
    localStorage.setItem(storageKey, JSON.stringify(updatedNFCes));
  };

  const saveConfig = (newConfig: NFCeConfig) => {
    if (!user) return;
    
    setConfigState(newConfig);
    const configKey = getConfigKey(user.businessId);
    localStorage.setItem(configKey, JSON.stringify(newConfig));
  };

  const addNFCe = async (nfce: NFCe) => {
    try {
      const serverNFCe = await apiService.createNFCe(nfce);
      if (serverNFCe) {
        const newNFCe: NFCe = {
          ...serverNFCe,
          dataEmissao: new Date(serverNFCe.dataEmissao || serverNFCe.created_at),
          dataVencimento: serverNFCe.dataVencimento ? new Date(serverNFCe.dataVencimento) : undefined,
          dataAutorizacao: serverNFCe.dataAutorizacao ? new Date(serverNFCe.dataAutorizacao) : undefined,
        };
        const updatedNFCes = [...nfces, newNFCe];
        setNfces(updatedNFCes);
        
        // Backup local
        if (user?.businessId) {
          const storageKey = getStorageKey(user.businessId);
          localStorage.setItem(storageKey, JSON.stringify(updatedNFCes));
        }
        return;
      }
    } catch (error) {
      console.error('Erro ao criar NFCe no servidor:', error);
    }
    
    // Fallback para criação local
    const updatedNFCes = [...nfces, nfce];
    await saveNFCes(updatedNFCes);
  };

  const updateNFCe = async (id: string, updates: Partial<NFCe>) => {
    try {
      const serverNFCe = await apiService.updateNFCeStatus(id, updates);
      if (serverNFCe) {
        const updatedNFCes = nfces.map((nfce) =>
          nfce.id === id ? { 
            ...serverNFCe, 
            dataEmissao: new Date(serverNFCe.dataEmissao || serverNFCe.created_at),
            dataVencimento: serverNFCe.dataVencimento ? new Date(serverNFCe.dataVencimento) : undefined,
            dataAutorizacao: serverNFCe.dataAutorizacao ? new Date(serverNFCe.dataAutorizacao) : undefined,
          } : nfce
        );
        setNfces(updatedNFCes);
        
        // Backup local
        if (user?.businessId) {
          const storageKey = getStorageKey(user.businessId);
          localStorage.setItem(storageKey, JSON.stringify(updatedNFCes));
        }
        return;
      }
    } catch (error) {
      console.error('Erro ao atualizar NFCe no servidor:', error);
    }
    
    // Fallback para atualização local
    const updatedNFCes = nfces.map((nfce) =>
      nfce.id === id ? { ...nfce, ...updates } : nfce
    );
    await saveNFCes(updatedNFCes);
  };

  const getNFCeByVendaId = (vendaId: string) => {
    return nfces.find(nfce => nfce.vendaId === vendaId);
  };

  const getProximoNumero = () => {
    if (!config) return 1;
    return config.proximoNumero;
  };

  const incrementarNumero = () => {
    if (config) {
      const newConfig = { ...config, proximoNumero: config.proximoNumero + 1 };
      saveConfig(newConfig);
    }
  };

  const isConfigured = () => {
    return config !== null && config.emitente.cnpj !== '';
  };

  return {
    nfces,
    config,
    addNFCe,
    updateNFCe,
    getNFCeByVendaId,
    getProximoNumero,
    incrementarNumero,
    saveConfig,
    isConfigured
  };
}