import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, Flashlight, FlashlightOff, RotateCcw } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [lastScanTime, setLastScanTime] = useState(0);

  // Detectar dispositivos de câmera disponíveis
  const detectCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      
      // Preferir câmera traseira no mobile
      const backCamera = videoDevices.findIndex(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      if (backCamera !== -1) {
        setCurrentCameraIndex(backCamera);
      }
    } catch (error) {
      console.error('Erro ao detectar câmeras:', error);
    }
  };

  // Iniciar câmera
  const startCamera = async () => {
    try {
      setError('');
      setIsScanning(true);

      // Parar stream anterior se existir
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Configurações otimizadas para mobile
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: cameras[currentCameraIndex]?.deviceId,
          facingMode: cameras[currentCameraIndex] ? undefined : { ideal: 'environment' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
        },
        audio: false
      };

      console.log('📷 Solicitando acesso à câmera...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Aguardar o vídeo carregar
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().then(() => {
                console.log('✅ Câmera iniciada com sucesso');
                resolve();
              }).catch(error => {
                console.error('Erro ao reproduzir vídeo:', error);
                setError('Erro ao iniciar reprodução da câmera');
              });
            };
          }
        });

        // Configurar flash se disponível
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        if (capabilities.torch) {
          console.log('💡 Flash disponível');
        }

        // Iniciar scanning
        startScanning();
      }
    } catch (error: any) {
      console.error('❌ Erro ao acessar câmera:', error);
      setHasPermission(false);
      setIsScanning(false);
      
      if (error.name === 'NotAllowedError') {
        setError('Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.');
      } else if (error.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada no dispositivo.');
      } else if (error.name === 'NotReadableError') {
        setError('Câmera está sendo usada por outro aplicativo.');
      } else {
        setError(`Erro ao acessar câmera: ${error.message}`);
      }
    }
  };

  // Parar câmera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    setIsScanning(false);
    setFlashEnabled(false);
  };

  // Alternar flash
  const toggleFlash = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !flashEnabled } as any]
          });
          setFlashEnabled(!flashEnabled);
        } catch (error) {
          console.error('Erro ao controlar flash:', error);
        }
      }
    }
  };

  // Trocar câmera
  const switchCamera = () => {
    if (cameras.length > 1) {
      const nextIndex = (currentCameraIndex + 1) % cameras.length;
      setCurrentCameraIndex(nextIndex);
      
      // Reiniciar câmera com nova seleção
      stopCamera();
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  };

  // Iniciar processo de scanning
  const startScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = window.setInterval(() => {
      scanBarcode();
    }, 200); // Scan a cada 200ms para melhor performance
  };

  // Função de scanning otimizada
  const scanBarcode = async () => {
    if (!videoRef.current || !isScanning) return;

    // Usar ZXing para detecção real de código de barras
    if (!codeReaderRef.current) {
      codeReaderRef.current = new BrowserMultiFormatReader();
    }

    try {
      const result = await codeReaderRef.current.decodeOnceFromVideoElement(videoRef.current);
      
      if (result) {
        const now = Date.now();
        // Evitar múltiplas leituras do mesmo código
        if (now - lastScanTime > 2000) {
          setLastScanTime(now);
          console.log('📱 Código detectado:', result.getText());
          
          // Vibração de feedback (se disponível)
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
          
          onScan(result.getText());
          onClose();
        }
      }
    } catch (error: any) {
      // NotFoundException é normal quando não há código na imagem
      if (!(error instanceof NotFoundException)) {
        console.error('Erro no scanning:', error);
      }
    }
  };

  // Simulação de detecção de código de barras
  // Em produção, substitua por uma biblioteca real
  const simulateBarcodeDetection = (imageData: ImageData): string | null => {
    // Esta é uma simulação - em produção use ZXing, QuaggaJS ou similar
    
    // Simular detecção baseada em padrões de luminosidade
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Procurar por padrões de barras (simulação simples)
    let barsDetected = 0;
    const centerY = Math.floor(height / 2);
    
    for (let x = 0; x < width - 1; x++) {
      const currentPixel = (centerY * width + x) * 4;
      const nextPixel = (centerY * width + x + 1) * 4;
      
      const currentBrightness = (data[currentPixel] + data[currentPixel + 1] + data[currentPixel + 2]) / 3;
      const nextBrightness = (data[nextPixel] + data[nextPixel + 1] + data[nextPixel + 2]) / 3;
      
      if (Math.abs(currentBrightness - nextBrightness) > 50) {
        barsDetected++;
      }
    }
    
    // Se detectar muitas transições, simular um código de barras
    if (barsDetected > 20) {
      // Retornar códigos de exemplo dos produtos
      const sampleBarcodes = [
        '7894900011517', // Coca-Cola 2L
        '7891991010924', // Skol Lata
        '7891910000147', // Água Crystal
        '7891991010931', // Guaraná Antarctica
        '7891991010948'  // Brahma Long Neck
      ];
      
      return sampleBarcodes[Math.floor(Math.random() * sampleBarcodes.length)];
    }
    
    return null;
  };

  // Efeitos
  useEffect(() => {
    if (isOpen) {
      detectCameras().then(() => {
        startCamera();
      });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, currentCameraIndex]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopCamera();
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 safe-area-top">
        <div className="flex items-center justify-between text-white">
          <h2 className="text-lg font-semibold">Scanner de Código</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors touch-manipulation"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Área de scanning */}
      <div className="relative w-full h-full">
        {hasPermission === false ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-white text-center">
            <Camera className="h-16 w-16 mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">Acesso à Câmera Necessário</h3>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-600 transition-colors touch-manipulation"
            >
              Tentar Novamente
            </button>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-white text-center">
            <Camera className="h-16 w-16 mb-4 text-red-400" />
            <h3 className="text-xl font-semibold mb-2">Erro na Câmera</h3>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-yellow-500 text-black rounded-lg font-medium hover:bg-yellow-600 transition-colors touch-manipulation"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            {/* Vídeo da câmera */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Canvas para processamento (oculto) */}
            <canvas
              ref={canvasRef}
              className="hidden"
            />

            {/* Overlay de scanning */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Área de foco */}
                <div className="w-64 h-40 border-2 border-yellow-400 rounded-lg relative">
                  {/* Cantos animados */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-yellow-400 rounded-br-lg"></div>
                  
                  {/* Linha de scanning animada */}
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-yellow-400 animate-pulse"></div>
                </div>
                
                {/* Instruções */}
                <p className="text-white text-center mt-4 text-sm">
                  Posicione o código de barras dentro da área
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controles inferiores */}
      {isScanning && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 safe-area-bottom">
          <div className="flex items-center justify-center space-x-6">
            {/* Flash */}
            <button
              onClick={toggleFlash}
              className={`p-4 rounded-full transition-colors touch-manipulation ${
                flashEnabled 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-black/50 text-white hover:bg-black/70'
              }`}
            >
              {flashEnabled ? (
                <FlashlightOff className="h-6 w-6" />
              ) : (
                <Flashlight className="h-6 w-6" />
              )}
            </button>

            {/* Trocar câmera */}
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="p-4 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors touch-manipulation"
              >
                <RotateCcw className="h-6 w-6" />
              </button>
            )}
          </div>
          
          <p className="text-white text-center text-xs mt-4 opacity-75">
            Toque para usar os controles • Mantenha o código bem iluminado
          </p>
        </div>
      )}
    </div>
  );
}