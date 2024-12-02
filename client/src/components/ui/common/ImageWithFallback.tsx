import { useState } from 'react';

interface ImageWithFallbackProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onError'> {
  fallbackSrc?: string;
  onError?: (error: Error) => void;
}

export function ImageWithFallback({
  src,
  fallbackSrc = '/images/placeholder.svg',
  alt,
  onError,
  ...props
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
  const [isWebPFailed, setIsWebPFailed] = useState(false);

  const handleError = () => {
    // If WebP version failed, try original format
    if (!isWebPFailed && imgSrc.endsWith('.webp')) {
      setIsWebPFailed(true);
      const originalSrc = src?.replace(/\.webp$/, '') || '';
      setImgSrc(originalSrc);
      return;
    }

    // If original format failed, use fallback
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      if (onError) {
        onError(new Error(`Failed to load image: ${src}`));
      }
      console.warn(`Image load failed for: ${src}, falling back to: ${fallbackSrc}`);
    }
  };

  // Try WebP first, then fallback to original format
  const getImageUrl = (url: string): string => {
    if (!url) return fallbackSrc;
    
    // If already failed WebP or it's the fallback image, return as is
    if (isWebPFailed || url === fallbackSrc) return url;
    
    // For local images in public directory, try WebP version
    if (url.startsWith('/')) {
      // Remove '/public' if present in the path and ensure proper path
      const normalizedPath = url.replace('/public/', '/').replace(/\/+/g, '/');
      if (!normalizedPath.endsWith('.webp') && normalizedPath.match(/\.(jpg|jpeg|png)$/i)) {
        // Try WebP version first
        return `${normalizedPath.replace(/\.(jpg|jpeg|png)$/i, '')}.webp`;
      }
    }
    return url;
  };

  return (
    <img
      {...props}
      src={getImageUrl(imgSrc)}
      alt={alt || 'Image'}
      onError={handleError}
      loading="lazy"
      decoding="async"
    />
  );
}
