import { Router, Request, Response } from 'express';
import { runSeed } from '../scripts/seed.js';

export const seedRouter = Router();

// POST /api/seed - Trigger clean database reset & realistic medium seed
seedRouter.post('/', async (req: Request, res: Response) => {
  try {
    const result = await runSeed();
    res.status(200).json(result);
  } catch (err: any) {
    console.error('Seed route failed:', err);
    res.status(500).json({
      error: {
        code: 'SEED_FAILED',
        message: err.message || 'Failed to seed database'
      }
    });
  }
});

// GET /api/seed/info - Instructions and credentials for demo
seedRouter.get('/info', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Demo dataset credentials',
    brand: {
      email: 'brand@nike.com',
      password: 'Password123!',
      company: 'Nike Virtual Studios'
    },
    creator: {
      email: 'creator@kampus.vc',
      password: 'Password123!',
      name: 'Elena Rostova'
    },
    activeProject: 'Nike Air Max 2027: Hyper-Motion CGI Reveal (Milestone #1 Ready for Deliverable)'
  });
});
