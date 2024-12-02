import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '@db/index';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        message: "Username e password sono obbligatori"
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      console.log(`Login attempt failed: user not found - ${username}`);
      return res.status(401).json({ 
        message: "Nome utente o password non validi" 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`Login attempt failed: invalid password for user - ${username}`);
      return res.status(401).json({ 
        message: "Nome utente o password non validi" 
      });
    }

    if (user.role !== 'admin') {
      console.log(`Login attempt failed: insufficient permissions - ${username}`);
      return res.status(403).json({
        message: "Accesso non autorizzato. Solo gli amministratori possono accedere."
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    console.log(`Successful login for user: ${username}`);
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: "Si è verificato un errore durante l'accesso. Riprova più tardi." 
    });
  }
});

router.post('/refresh', requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ 
        status: 'error',
        message: 'User not authenticated',
        code: 'AUTH_REQUIRED'
      });
    }

    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!userData) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const token = jwt.sign(
      {
        id: userData.id,
        username: userData.username,
        role: userData.role
      },
      process.env.JWT_SECRET!,
      { 
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );

    res.json({ 
      status: 'success',
      data: { token },
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Error refreshing token',
      code: 'TOKEN_REFRESH_ERROR'
    });
  }
});

export default router;
