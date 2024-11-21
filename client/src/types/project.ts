export interface Project {
  id: string;
  title: string;
  description: string;
  category: 'restauro' | 'costruzione' | 'ristrutturazione';
  image: string;
  year: number;
  location: string;
}

export interface CaseHistory extends Project {
  challenge: string;
  solution: string;
  results: string[];
  gallery: string[];
}
