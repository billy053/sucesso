import { useState, useEffect, useRef } from 'react';
import { Camera, X, Flashlight, FlashlightOff, RotateCcw } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

// Tipos estendidos para MediaTrackConstraints
interface ExtendedMediaTrackConstraints extends MediaTrackConstraints {
  focusMode?: string | { exact?: string; ideal?: string };
}

// Tipos estendidos para MediaTrackCapabilities
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  focusMode?: string[];
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen, facingMode]);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Parar stream anterior se existir
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // Usar tipo estendido para focusMode
          ...(facingMode === 'environment' && {
            focusMode: 'continuous'
          } as ExtendedMediaTrackConstraints)
        }
      };

      console.log('📷 Solicitando acesso à câmera...');
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Verificar se tem flash disponível
        const videoTrack = mediaStream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
          const hasTorch = capabilities.torch === true;
          setHasFlash(hasTorch);
          console.log('🔦 Flash disponível:', hasTorch);
        }

        // Aguardar o vídeo carregar
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          }
        });

        // Inicializar o leitor de código de barras
        const reader = new BrowserMultiFormatReader();
        setCodeReader(reader);

        console.log('🔍 Iniciando detecção de código de barras...');
        
        // Usar método correto da biblioteca ZXing
        reader.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
          if (result) {
            const barcode = result.getText();
            console.log('✅ Código detectado:', barcode);
            onScan(barcode);
            stopScanning();
          }
          
          if (error && !(error instanceof NotFoundException)) {
            console.warn('⚠️ Erro na detecção:', error);
          }
        });
      }
    } catch (err: any) {
      console.error('❌ Erro ao acessar câmera:', err);
      
      let errorMessage = 'Erro ao acessar a câmera';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permissão de câmera negada. Por favor, permita o acesso à câmera.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Câmera não suportada neste navegador.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Câmera está sendo usada por outro aplicativo.';
      }
      
      setError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    console.log('🛑 Parando scanner...');
    
    if (codeReader) {
      codeReader.reset();
      setCodeReader(null);
    }
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('📷 Track parado:', track.kind);
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setFlashOn(false);
  };

  const toggleFlash = async () => {
    if (!stream || !hasFlash) return;

    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities() as ExtendedMediaTrackCapabilities;
        
        if (capabilities.torch) {
          await videoTrack.applyConstraints({
            advanced: [{ torch: !flashOn } as any]
          });
          setFlashOn(!flashOn);
          console.log('🔦 Flash:', !flashOn ? 'ligado' : 'desligado');
        }
      }
    } catch (err) {
      console.error('❌ Erro ao controlar flash:', err);
    }
  };

  const switchCamera = () => {
    setFacingMode(current => current === 'user' ? 'environment' : 'user');
  };

  const handleRetry = () => {
    setError(null);
    startScanning();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Scanner de Código</h2>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors touch-manipulation"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {isScanning && !error ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Overlay de escaneamento */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Frame do scanner */}
                <div className="w-64 h-64 border-2 border-yellow-400 rounded-lg relative">
                  {/* Cantos do frame */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-lg"></div>
                  
                  {/* Linha de escaneamento animada */}
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-yellow-400 animate-pulse"></div>
                </div>
                
                {/* Instruções */}
                <p className="text-white text-center mt-4 px-4">
                  Posicione o código de barras dentro do quadro
                </p>
              </div>
            </div>
          </>
        ) : error ? (
          /* Tela de erro */
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">Erro na Câmera</h3>
            <p className="text-gray-300 mb-6 max-w-sm">{error}</p>
            <button
              onClick={handleRetry}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-lg font-medium transition-colors touch-manipulation"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          /* Loading */
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Camera className="h-8 w-8 text-yellow-400" />
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">Iniciando Câmera</h3>
            <p className="text-gray-300">Aguarde um momento...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      {isScanning && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 safe-area-bottom">
          <div className="flex items-center justify-center space-x-6">
            {/* Flash Toggle */}
            {hasFlash && (
              <button
                onClick={toggleFlash}
                className={`p-4 rounded-full transition-colors touch-manipulation ${
                  flashOn 
                    ? 'bg-yellow-500 text-black' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {flashOn ? (
                  <FlashlightOff className="h-6 w-6" />
                ) : (
                  <Flashlight className="h-6 w-6" />
                )}
              </button>
            )}
            
            {/* Switch Camera */}
            <button
              onClick={switchCamera}
              className="p-4 bg-white/20 text-white hover:bg-white/30 rounded-full transition-colors touch-manipulation"
            >
              <RotateCcw className="h-6 w-6" />
            </button>
          </div>
          
          <p className="text-center text-gray-300 text-sm mt-4">
            {facingMode === 'environment' ? 'Câmera traseira' : 'Câmera frontal'}
          </p>
        </div>
      )}
    </div>
  );
}