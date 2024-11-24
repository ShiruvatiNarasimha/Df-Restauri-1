import { useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';

const PlaceholderSVG = ({ width = 800, height = 600, text }: { width?: number, height?: number, text: string }) => (
  <svg width={width} height={height} xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#e2e8f0"/>
    <text
      x="50%"
      y="50%"
      fontFamily="Arial"
      fontSize="24"
      fill="#64748b"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {text}
    </text>
  </svg>
);

const svgToJpeg = async (svg: string, filename: string) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      // Convert to blob and save
      canvas.toBlob((blob) => {
        if (blob) {
          const formData = new FormData();
          formData.append('image', blob, filename);
          
          fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          })
          .then(response => response.json())
          .then(resolve)
          .catch(reject);
        }
      }, 'image/jpeg', 0.9);
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svg);
  });
};

export function ImageGenerator() {
  useEffect(() => {
    const generateImages = async () => {
      const images = [
        { name: 'hero-background-new.jpeg', text: 'Hero Background' },
        { name: 'chi-siamo/about-company.jpeg', text: 'About Company' },
        { name: 'construction/construction-1.jpg', text: 'Construction' }
      ];

      for (const img of images) {
        const svg = ReactDOMServer.renderToString(
          <PlaceholderSVG text={img.text} />
        );
        await svgToJpeg(svg, img.name);
      }
    };

    generateImages();
  }, []);

  return null;
}
