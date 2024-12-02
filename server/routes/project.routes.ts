import { Router } from 'express';
import { projectService } from '../services/project.service';
import { requireAuth } from '../middleware/auth';
import { validateRequest, createProjectSchema, updateProjectSchema, idParamSchema } from '../middleware/validation';
import { handleError } from '../utils/error-handler';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), 'public', 'uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/', async (_req, res) => {
  const endOperation = performanceMonitor.startOperation('GET /api/projects');
  try {
    const projects = await projectService.findAll({
      trackPerformance: true,
      cache: true,
      cacheTTL: 300 // 5 minutes cache
    });
    
    const metrics = {
      averageResponseTime: performanceMonitor.getAverageResponseTime('ProjectService.findAll'),
      errorRate: performanceMonitor.getErrorRate('ProjectService.findAll')
    };

    res.json({
      success: true,
      data: projects,
      metadata: {
        timestamp: new Date().toISOString(),
        metrics: process.env.NODE_ENV === 'development' ? metrics : undefined
      }
    });
  } catch (error) {
    handleError(error, res);
  } finally {
    endOperation();
  }
});

router.post('/', 
  requireAuth,
  upload.single('image'),
  validateRequest(createProjectSchema),
  async (req, res) => {
    try {
      const { title, description, category, year, location } = req.body;
      const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
      
      const newProject = await projectService.create({
        title,
        description,
        category,
        image: imagePath,
        year: parseInt(year),
        location
      });

      res.json(newProject);
    } catch (error) {
      handleError(error, res);
    }
});

router.put('/:id',
  requireAuth,
  upload.single('image'),
  validateRequest(updateProjectSchema),
  validateRequest(idParamSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, category, year, location } = req.body;
      const updateData: any = {
        title,
        description,
        category,
        year: parseInt(year),
        location
      };

      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      const updatedProject = await projectService.update(parseInt(id), updateData);
      res.json(updatedProject);
    } catch (error) {
      handleError(error, res);
    }
});

router.put('/:id/image-order',
  requireAuth,
  validateRequest(idParamSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { imageOrder } = req.body;
      
      if (!Array.isArray(imageOrder)) {
        return res.status(400).json({ message: "Invalid image order format" });
      }

      const updatedProject = await projectService.updateImageOrder(parseInt(id), imageOrder);
      res.json(updatedProject);
    } catch (error) {
      handleError(error, res);
    }
});

export default router;
