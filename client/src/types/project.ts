export interface Project {
  id: number;
  title: string;
  description: string;
  category: 'restauro' | 'costruzione' | 'ristrutturazione';
  image: string;
  gallery: string[];
  year: number;
  location: string;
  status: 'draft' | 'published';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CaseHistory extends Project {
  challenge: string;
  solution: string;
  results: string[];
  gallery: string[];
}
