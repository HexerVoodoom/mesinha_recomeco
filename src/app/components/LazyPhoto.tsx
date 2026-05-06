import { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface LazyPhotoProps {
  itemId: string;
  hasPhoto: boolean;
  className?: string;
  alt?: string;
  onLoad?: (photo: string | null) => void;
}

// In-memory cache for photos to avoid re-fetching (max 50 photos)
const photoCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

function addToCache(key: string, value: string) {
  // Simple LRU: if cache is full, delete the first (oldest) entry
  if (photoCache.size >= MAX_CACHE_SIZE) {
    const firstKey = photoCache.keys().next().value;
    if (firstKey) {
      photoCache.delete(firstKey);
    }
  }
  photoCache.set(key, value);
}

export function LazyPhoto({ itemId, hasPhoto, className, alt, onLoad }: LazyPhotoProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hasPhoto) return;

    // Check cache first
    const cached = photoCache.get(itemId);
    if (cached) {
      setPhoto(cached);
      onLoad?.(cached);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadPhoto = async () => {
      try {
        const photoData = await api.getItemPhoto(itemId);
        if (isMounted && photoData) {
          // Cache the photo with size limit
          addToCache(itemId, photoData);
          setPhoto(photoData);
          onLoad?.(photoData);
        } else if (isMounted && !photoData) {
          // Silently handle missing photo
          setError(true);
        }
      } catch (err) {
        // Silently handle error without logging
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPhoto();

    return () => {
      isMounted = false;
    };
  }, [itemId, hasPhoto]);

  if (!hasPhoto) return null;

  if (loading) {
    return (
      <div className={`${className} bg-gray-100 animate-pulse flex items-center justify-center`}>
        <div className="text-xs text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-xs text-gray-400">❌</div>
      </div>
    );
  }

  return (
    <img 
      src={photo} 
      alt={alt || 'Item photo'} 
      className={className}
    />
  );
}