export type UserRole = 'DOCTOR' | 'RECEPTIONIST' | 'GUEST';

export interface User {
  id: number;
  name: string;
  email: string;
  login: string;
  cpf: string;
  phone?: string | null;
  role: UserRole;
  root: boolean;
  company_id: number;
  is_deleted?: boolean;
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  root: boolean;
  company_id: number;
}

export interface Company {
  id: number;
  name: string;
  email: string;
  zip_code: string;
  adress_street: string;
  adress_number: string;
  adress_complement?: string | null;
  adress_neighborhood: string;
  adress_city: string;
  adress_state: string;
}

export interface Patient {
  id: number;
  name: string;
  cpf?: string | null;
  birth_date: string;
  company_id: number;
  created_at: string;
}

export interface Place {
  id: number;
  name: string;
  company_id: number;
}

export type AttendanceStatus = 'scheduled' | 'confirmed' | 'finished';

export interface Attendance {
  id: number;
  user_id: number;
  company_id: number;
  patient_id: number;
  place_id: number;
  receptionist_id?: number | null;
  confirmed_by?: number | null;
  start_date: string;
  confirmed_at?: string | null;
  end_date?: string | null;
  patient?: Pick<Patient, 'id' | 'name'> & { cpf?: string | null };
  user?: Pick<User, 'id' | 'name'> & { role?: UserRole };
  receptionist?: Pick<User, 'id' | 'name'> | null;
  place?: Pick<Place, 'id' | 'name'>;
  status?: AttendanceStatus;
}

export interface DashboardStatistics {
  totalPatients: number;
  totalAttendances: number;
  totalUsers: number;
  totalPlaces: number;
  period: { start_date: string | null; end_date: string | null };
  attendancesByStatus: Record<AttendanceStatus, number>;
  attendancesByPlace: Array<{ name: string; count: number }>;
  attendancesByProfessional: Array<{ name: string; count: number }>;
  upcomingAttendances: Attendance[];
  details: {
    attendances_by_day: Record<string, number>;
    patients_by_day: Record<string, number>;
  };
}

export interface ReportRow {
  id: number;
  name: string;
  role: UserRole;
  total_attendances: number;
  finished_attendances: number;
}
