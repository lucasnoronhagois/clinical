import { Router } from 'express';
import { authenticateToken } from '../middlewares';
import attendances from './attendances';
import auth from './auth';
import companies from './companies';
import dashboard from './dashboard';
import patients from './patients';
import places from './places';
import reports from './reports';
import users from './users';

const router = Router();

router.use('/auth', auth);
router.use('/companies', authenticateToken, companies);
router.use('/patients', authenticateToken, patients);
router.use('/places', authenticateToken, places);
router.use('/attendances', authenticateToken, attendances);
router.use('/users', authenticateToken, users);
router.use('/dashboard', authenticateToken, dashboard);
router.use('/reports', authenticateToken, reports);

export default router;
