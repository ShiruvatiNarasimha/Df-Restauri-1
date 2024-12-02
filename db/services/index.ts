import { db } from '../index';
import type { Project, Service, TeamMember, User } from '@prisma/client';

// Project Service
export const ProjectService = {
  async findAll() {
    return db.project.findMany();
  },
  
  async findById(id: number) {
    return db.project.findUnique({ where: { id } });
  },
  
  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
    return db.project.create({ data });
  },
  
  async update(id: number, data: Partial<Project>) {
    return db.project.update({ where: { id }, data });
  }
};

// Service Service
export const ServiceService = {
  async findAll() {
    return db.service.findMany();
  },
  
  async findById(id: number) {
    return db.service.findUnique({ where: { id } });
  },
  
  async create(data: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) {
    return db.service.create({ data });
  },
  
  async update(id: number, data: Partial<Service>) {
    return db.service.update({ where: { id }, data });
  }
};

// Team Service
export const TeamService = {
  async findAll() {
    return db.team.findMany();
  },
  
  async findById(id: number) {
    return db.team.findUnique({ where: { id } });
  },
  
  async create(data: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>) {
    return db.team.create({ data });
  },
  
  async update(id: number, data: Partial<TeamMember>) {
    return db.team.update({ where: { id }, data });
  }
};

// User Service
export const UserService = {
  async findByUsername(username: string) {
    return db.user.findUnique({ where: { username } });
  },
  
  async findById(id: number) {
    return db.user.findUnique({ where: { id } });
  }
};
