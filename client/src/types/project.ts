export interface Project {
  id: string;
  title: string;
  description: string;
  category: 'restauro' | 'costruzione' | 'ristrutturazione';
  location: string;
  completionDate?: Date;
  coverImage?: string;
  gallery?: string[];
  client?: string;
  duration?: string;
  techniques?: string[];
  details?: string;
}

export interface CaseHistory {
  id: string;
  title: string;
  description: string;
  challenge: string;
  solution: string;
  results: string[];
  images: string[];
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
