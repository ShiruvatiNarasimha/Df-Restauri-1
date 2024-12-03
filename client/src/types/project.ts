export interface Project {
  id: string;
  title: string;
  description: string;
  category: 'restauro' | 'costruzione' | 'ristrutturazione';
  location: string;
  completionDate?: Date;
  coverImage: string;
  gallery: string[]; // Array of additional project images
  client?: string;
  duration?: string;
  techniques?: string[];
  details?: string;
  year?: number;
}

export interface CaseHistory {
  id: string;
  title: string;
  description: string;
  challenge: string;
  solution: string;
  results: string[];
  images: string[]; // Main image array for the case history
  gallery?: string[]; // Additional gallery images
  year: number;
  location: string;
  category: 'restauro' | 'costruzione' | 'ristrutturazione';
}

export interface ServiceImage {
  id: string;
  serviceType: 'restauro' | 'costruzione' | 'ristrutturazione';
  imageUrl: string;
  caption?: string;
  displayOrder: number;
}
