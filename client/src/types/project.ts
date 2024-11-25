import { type Json } from '@db/schema';

export type ProjectCategory = 'restauro' | 'costruzione' | 'ristrutturazione';

export interface Project {
  id: number;
  title: string;
  description: string;
  category: ProjectCategory;
  image: string;
  year: number;
  location: string;
  imageOrder: { id: string; order: number }[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseHistory extends Project {
  challenge: string;
  solution: string;
  results: string[];
  gallery: string[];
}
