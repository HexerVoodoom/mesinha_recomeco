import { useEffect, useState } from 'react';

// Imagem base64 da ilustração do casal fornecida pelo usuário
// Esta será convertida em ícones PNG
const COUPLE_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

interface IconGeneratorProps {
  autoGenerate?: boolean;
}

export function IconGenerator({ autoGenerate = false }: IconGeneratorProps) {
  const [status, setStatus] = useState<string>('');
  const [generated, setGenerated] = useState(false);

  const generateIcon = async (size: number, filename: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#81D8D0');
      gradient.addColorStop(1, '#4D989B');

      // Draw rounded rectangle background
      const radius = size * 0.15;
      ctx.fillStyle = gradient;
      
      // Rounded rect path
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.quadraticCurveTo(size, 0, size, radius);
      ctx.lineTo(size, size - radius);
      ctx.quadraticCurveTo(size, size, size - radius, size);
      ctx.lineTo(radius, size);
      ctx.quadraticCurveTo(0, size, 0, size - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();

      // Load and draw image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const padding = size * 0.1;
        const imageSize = size - (padding * 2);
        
        // Save context and clip to rounded rect
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(size - radius, 0);
        ctx.quadraticCurveTo(size, 0, size, radius);
        ctx.lineTo(size, size - radius);
        ctx.quadraticCurveTo(size, size, size - radius, size);
        ctx.lineTo(radius, size);
        ctx.quadraticCurveTo(0, size, 0, size - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();
        
        // Draw image
        ctx.drawImage(img, padding, padding, imageSize, imageSize);
        ctx.restore();

        // Add subtle overlay
        ctx.fillStyle = 'rgba(129, 216, 208, 0.05)';
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(size - radius, 0);
        ctx.quadraticCurveTo(size, 0, size, radius);
        ctx.lineTo(size, size - radius);
        ctx.quadraticCurveTo(size, size, size - radius, size);
        ctx.lineTo(radius, size);
        ctx.quadraticCurveTo(0, size, 0, size - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.fill();

        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            resolve();
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = COUPLE_IMAGE_BASE64;
    });
  };

  const generateAllIcons = async () => {
    try {
      setStatus('Gerando ícones...');
      
      await generateIcon(16, 'favicon-16x16.png');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await generateIcon(32, 'favicon-32x32.png');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await generateIcon(192, 'icon-192x192.png');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await generateIcon(512, 'icon-512x512.png');
      
      setStatus('✅ Todos os ícones foram gerados! Verifique seus downloads e mova-os para /public');
      setGenerated(true);
    } catch (error) {
      setStatus(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  useEffect(() => {
    if (autoGenerate && !generated) {
      // Auto-generate on first load
      const hasGenerated = localStorage.getItem('icons_generated');
      if (!hasGenerated) {
        generateAllIcons();
        localStorage.setItem('icons_generated', 'true');
      }
    }
  }, [autoGenerate, generated]);

  if (!autoGenerate) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-2xl shadow-lg p-4 max-w-sm">
          <h3 className="text-lg font-semibold text-[#81D8D0] mb-2">
            🎨 Gerador de Ícones
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Clique para gerar os ícones PNG do app
          </p>
          <button
            onClick={generateAllIcons}
            disabled={generated}
            className="w-full bg-[#81D8D0] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#4D989B] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {generated ? '✓ Ícones Gerados' : 'Gerar Ícones PNG'}
          </button>
          {status && (
            <p className="text-xs mt-2 text-gray-700">{status}</p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default IconGenerator;
