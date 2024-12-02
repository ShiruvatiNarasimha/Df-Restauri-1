import { useState } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  onError?: (error: Error) => void;
}

export function ImageWithFallback({
  src,
  fallbackSrc = '/images/placeholder.webp',
  alt,
  onError,
  ...props
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setImgSrc(fallbackSrc);
      setHasError(true);
      if (onError) {
        onError(new Error(`Failed to load image: ${src}`));
      }
      console.warn(`Image load failed for: ${src}, falling back to: ${fallbackSrc}`);
    }
  };

  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      onError={handleError}
      loading="lazy"
      decoding="async"
    />
  );
}
