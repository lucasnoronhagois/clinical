import { Request, Response } from 'express';
import AuthService from '../services/authService';

const authService = new AuthService();

export default class AuthController {
  async login(req: Request, res: Response) {
    res.json(await authService.login(req.body));
  }

  async me(req: Request, res: Response) {
    res.json(await authService.me(req.user!));
  }

  async changePassword(req: Request, res: Response) {
    res.json(await authService.changePassword(req.user!, req.body.currentPassword, req.body.newPassword));
  }
}
