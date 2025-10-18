import express, { Request, Response, Router } from 'express';

// Modular car route imports
import blueprintsRoutes from '@/routes/api/blueprints';
import manufacturersRoutes from '@/routes/api/manufacturers';
import garageLevelsRoutes from '@/routes/api/garageLevels';

const router: Router = express.Router();

// ============================
//    🧱 BLUEPRINT ROUTES
// ============================

router.use('/', blueprintsRoutes);

// ============================
//    🧱 MANUFACTURERS ROUTES
// ============================

router.use('/', manufacturersRoutes);

// =========================================
//       🏆 Garage Levels ROUTES
// =========================================

router.use('/garage-levels', garageLevelsRoutes);

export default router;