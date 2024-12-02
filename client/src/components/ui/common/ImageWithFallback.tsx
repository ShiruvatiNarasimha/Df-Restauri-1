import { useState } from 'react';

interface ImageWithFallbackProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onError'> {
  fallbackSrc?: string;
  onError?: (error: Error) => void;
}

export function ImageWithFallback({
  src,
  fallbackSrc = '/images/placeholders/placeholder.svg',
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
    
    // For local images, try WebP version first
    if (url.startsWith('/')) {
      if (!url.endsWith('.webp') && url.match(/\.(jpg|jpeg|png)$/i)) {
        return `${url.replace(/\.(jpg|jpeg|png)$/i, '')}.webp`;
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
