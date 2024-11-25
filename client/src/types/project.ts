export interface Project {
  id: number;
  title: string;
  description: string;
  category: 'restauro' | 'costruzione' | 'ristrutturazione';
  image: string;
  year: number;
  location: string;
  gallery?: string[];
  imageOrder?: { id: string; order: number }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseHistory extends Project {
  challenge: string;
  solution: string;
  results: string[];
  gallery: string[];
}
