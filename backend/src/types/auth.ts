export type UserRole = 'DOCTOR' | 'RECEPTIONIST' | 'GUEST';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  root: boolean;
  company_id: number;
}
