import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  category?: 'team' | 'project' | 'about';
}

export function ImageWithFallback({
  src,
  alt,
  fallbackSrc,
  category = 'about',
  className,
  ...props
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  const defaultFallbacks = {
    team: '/images/fallback/profile-fallback.jpg',
    project: '/images/fallback/project-fallback.jpg',
    about: '/images/fallback/about-fallback.jpg'
  };

  const handleError = async (e: React.SyntheticEvent<HTMLImageElement>) => {
    const imgElement = e.currentTarget;

    if (retryCount < maxRetries) {
      try {
        // Add cache-busting parameter with jitter
        const jitter = Math.floor(Math.random() * 1000);
        const timestamp = new Date().getTime();
        const newSrc = `${src}?t=${timestamp}&r=${jitter}`;
        
        // Pre-load image before setting source
        await new Promise((resolve, reject) => {
          const tempImg = new Image();
          tempImg.onload = resolve;
          tempImg.onerror = reject;
          tempImg.src = newSrc;
        });

        imgElement.src = newSrc;
        setRetryCount(prev => prev + 1);
      } catch {
        setError(true);
        imgElement.src = fallbackSrc || defaultFallbacks[category];
        console.error('Image failed to load after retry:', src);
      }
    } else {
      setError(true);
      imgElement.src = fallbackSrc || defaultFallbacks[category];
      console.error('Image failed to load after max retries:', src);
    }
  };

  return (
    <div className="relative">
      <img
        src={src}
        alt={alt}
        onError={handleError}
        className={`${className} ${error ? 'opacity-80' : ''}`}
        {...props}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
          <AlertTriangle className="h-6 w-6 text-gray-400" />
        </div>
      )}
    </div>
  );
}
