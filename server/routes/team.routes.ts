import { Router } from 'express';
import { teamService } from '../services/team.service';
import { requireAuth } from '../middleware/auth';
import { validateRequest, idParamSchema } from '../middleware/validation';
import { handleError } from '../utils/error-handler';
import multer from 'multer';
import path from 'path';
import { z } from 'zod';

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

// Validation schemas
const createTeamMemberSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    role: z.string().min(1, 'Role is required'),
    bio: z.string().min(1, 'Bio is required'),
    socialLinks: z.string().transform(str => {
      try {
        return JSON.parse(str);
      } catch {
        return [];
      }
    }).optional()
  })
});

const updateTeamMemberSchema = createTeamMemberSchema.deepPartial();

router.get('/', async (_req, res) => {
  try {
    const teamMembers = await teamService.findAll();
    res.json({
      success: true,
      data: teamMembers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/',
  requireAuth,
  upload.single('image'),
  validateRequest(createTeamMemberSchema),
  async (req, res) => {
    try {
      const { name, role, bio, socialLinks } = req.body;
      const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
      
      const newMember = await teamService.create({
        name,
        role,
        bio,
        image: imagePath,
        socialLinks: JSON.parse(socialLinks || '[]')
      });

      res.json(newMember);
    } catch (error) {
      handleError(error, res);
    }
});

router.put('/:id',
  requireAuth,
  upload.single('image'),
  validateRequest(updateTeamMemberSchema),
  validateRequest(idParamSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, role, bio, socialLinks } = req.body;
      const updateData: any = {
        name,
        role,
        bio,
        socialLinks: JSON.parse(socialLinks || '[]')
      };

      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }

      const updatedMember = await teamService.update(parseInt(id), updateData);
      res.json(updatedMember);
    } catch (error) {
      handleError(error, res);
    }
});

export default router;
