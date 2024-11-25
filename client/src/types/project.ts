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
  createdAt: Date;
  updatedAt: Date;
}

export type CreateProject = Omit<Project, "id" | "createdAt" | "updatedAt"> & {
  gallery?: string[];
};

export type UpdateProject = Partial<CreateProject>;

export interface CaseHistory extends Project {
  challenge: string;
  solution: string;
  results: string[];
  gallery: string[];
}
