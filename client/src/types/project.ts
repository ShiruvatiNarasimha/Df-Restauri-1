export interface Project {
  id: string;
  title: string;
  description: string;
  category: 'restauro' | 'costruzione' | 'ristrutturazione';
  image: string;
  year: number;
  location: string;
  client?: string;
  duration?: string;
  techniques?: string[];
  gallery?: string[];
  details?: string;
}

export interface CaseHistory extends Project {
