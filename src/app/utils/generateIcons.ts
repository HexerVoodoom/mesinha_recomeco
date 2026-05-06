// Utility to generate app icons with the couple illustration
// This can be used to create downloadable icons for PWA installation

import coupleImage from "figma:asset/9eee8114a75bad81040c57aa669f5b269428977b.png";

export const generateIcon = (size: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#81D8D0');
  gradient.addColorStop(1, '#4D989B');
  
  // Draw rounded rectangle background
  const radius = size * 0.15;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  // Load and draw image
  const img = new Image();
  img.src = coupleImage;
  
  return new Promise<string>((resolve) => {
    img.onload = () => {
      const padding = size * 0.1;
      const imageSize = size - (padding * 2);
      ctx.drawImage(img, padding, padding, imageSize, imageSize);
      
      // Add subtle overlay
      ctx.fillStyle = 'rgba(129, 216, 208, 0.05)';
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, radius);
      ctx.fill();
      
      resolve(canvas.toDataURL('image/png'));
    };
  }) as any;
};

export const downloadIcon = async (size: number, filename: string) => {
  const dataUrl = await generateIcon(size);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
};
