/**
 * API simulada que implementa o mesmo contrato HTTP da API Node (backend/):
 * mesmas rotas, formatos JSON, códigos de status, mensagens de erro e regras de acesso por perfil.
 * É independente de transporte: o Mock Service Worker (navegador) e os testes a expõem via HTTP.
 */
import { canFinalizeAttendance, finishForbiddenMessage } from '../lib/permissions';
import type { AttendanceStatus, UserRole } from '../types';
import type { MockAttendance, MockPatient, MockUser } from './fixtures';
import type { MockStore } from './store';

export interface MockRequest {
  method: string;
  /** Caminho a partir de /api, ex.: `/patients/3`. */
  path: string;
  query: URLSearchParams;
  body?: unknown;
  headers: { authorization?: string | null };
}

export interface MockResponse {
  status: number;
  body: unknown;
}

interface Detail {
  field?: string;
  message: string;
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Detail[],
  ) {
    super(message);
  }
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  root: boolean;
  company_id: number;
}

const TOKEN_TTL_SECONDS = 8 * 3600;

const base64url = (value: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(value)))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const fromBase64url = (value: string) => {
  const bytes = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/** Token no formato JWT (header.payload.assinatura). A assinatura é simbólica: é uma API de demonstração. */
function signToken(user: AuthUser, now: Date): string {
  const payload = { ...user, iat: Math.floor(now.getTime() / 1000), exp: Math.floor(now.getTime() / 1000) + TOKEN_TTL_SECONDS };
  return `${base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${base64url(JSON.stringify(payload))}.mock`;
}

const isPresent = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '';
const onlyDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (length: number) => {
    const sum = cpf
      .slice(0, length)
      .split('')
      .reduce((acc, digit, index) => acc + Number(digit) * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

const getStatus = (a: Pick<MockAttendance, 'confirmed_at' | 'end_date'>): AttendanceStatus =>
  a.end_date ? 'finished' : a.confirmed_at ? 'confirmed' : 'scheduled';

const countBy = <T>(items: T[], key: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

const toRanking = (counts: Record<string, number>) =>
  Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

function validate(rules: Array<[boolean, string, string]>) {
  const details = rules.filter(([invalid]) => invalid).map(([, field, message]) => ({ field, message }));
  if (details.length) throw new HttpError(400, 'Dados inválidos', details);
}

export function createMockApi(store: MockStore, clock: () => Date = () => new Date()) {
  const db = () => store.data;
  const nextId = (rows: Array<{ id: number }>) => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

  // ---------- autenticação e escopo ----------
  function authenticate(header?: string | null): AuthUser {
    const [scheme, token] = header?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Token não fornecido.');
    try {
      const payload = JSON.parse(fromBase64url(token.split('.')[1])) as AuthUser & { exp: number };
      const user = db().users.find((u) => u.id === payload.id && !u.is_deleted);
      if (!user || payload.exp * 1000 <= clock().getTime()) throw new Error('expired');
      return { id: user.id, name: user.name, email: user.email, role: user.role, root: user.root, company_id: user.company_id };
    } catch {
      throw new HttpError(401, 'Sessão expirada ou token inválido.');
    }
  }

  const canAccessAll = (user: AuthUser) => user.root || user.role === 'GUEST';
  const requireWrite = (user: AuthUser) => {
    if (user.role === 'GUEST') throw new HttpError(403, 'Usuários visitantes podem apenas visualizar dados.');
  };
  const requireStaff = (user: AuthUser) => {
    if (user.role === 'GUEST') throw new HttpError(403, 'Apenas membros da equipe podem acessar esta funcionalidade.');
  };
  const requireRoot = (user: AuthUser) => {
    if (!user.root) throw new HttpError(403, 'Acesso permitido apenas para administradores.');
  };

  function resolveCompanyId(user: AuthUser, requested: unknown, required = true): number | undefined {
    if (!canAccessAll(user)) return user.company_id;
    const parsed = requested === undefined || requested === null || requested === '' ? undefined : Number(requested);
    if (parsed !== undefined && (!Number.isInteger(parsed) || parsed <= 0)) throw new HttpError(400, 'company_id inválido.');
    if (required && parsed === undefined) throw new HttpError(400, 'company_id é obrigatório.');
    return parsed;
  }

  function assertAccess(user: AuthUser, companyId: number, message: string) {
    if (!canAccessAll(user) && companyId !== user.company_id) throw new HttpError(404, message);
  }

  function findOr404<T extends { id: number; is_deleted: boolean }>(rows: T[], id: string, message: string): T {
    const row = rows.find((r) => r.id === Number(id) && !r.is_deleted);
    if (!row) throw new HttpError(404, message);
    return row;
  }

  const publicUser = ({ password: _password, ...rest }: MockUser) => rest;
  const byName = <T extends { name: string }>(rows: T[]) => [...rows].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  function withRelations(a: MockAttendance) {
    const { users, patients, places } = db();
    const patient = patients.find((p) => p.id === a.patient_id);
    const doctor = users.find((u) => u.id === a.user_id);
    const receptionist = users.find((u) => u.id === a.receptionist_id);
    const place = places.find((p) => p.id === a.place_id);
    return {
      ...a,
      patient: patient ? { id: patient.id, name: patient.name, cpf: patient.cpf } : null,
      user: doctor ? { id: doctor.id, name: doctor.name, role: doctor.role } : null,
      receptionist: receptionist ? { id: receptionist.id, name: receptionist.name } : null,
      place: place ? { id: place.id, name: place.name } : null,
    };
  }

  // ---------- recursos ----------
  function login(body: Record<string, unknown>) {
    validate([
      [!isPresent(body.email_or_login), 'email_or_login', 'Informe o login ou email.'],
      [!isPresent(body.password), 'password', 'Informe a senha.'],
    ]);
    const identifier = String(body.email_or_login).trim();
    const user = db().users.find((u) => !u.is_deleted && (u.login === identifier || u.email === identifier.toLowerCase()));
    if (!user || user.password !== body.password) throw new HttpError(401, 'Usuário ou senha inválidos.');
    const auth: AuthUser = { id: user.id, name: user.name, email: user.email, role: user.role, root: user.root, company_id: user.company_id };
    return { token: signToken(auth, clock()), user: publicUser(user) };
  }

  function companyPayload(body: Record<string, unknown>) {
    validate([
      [!isPresent(body.name), 'name', 'Nome é obrigatório.'],
      [!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email ?? '')), 'email', 'Email inválido.'],
      [onlyDigits(body.zip_code).length !== 8, 'zip_code', 'CEP deve ter 8 dígitos.'],
      [!isPresent(body.adress_street), 'adress_street', 'Rua é obrigatória.'],
      [!isPresent(body.adress_number), 'adress_number', 'Número é obrigatório.'],
      [!isPresent(body.adress_neighborhood), 'adress_neighborhood', 'Bairro é obrigatório.'],
      [!isPresent(body.adress_city), 'adress_city', 'Cidade é obrigatória.'],
      [!/^[A-Za-z]{2}$/.test(String(body.adress_state ?? '')), 'adress_state', 'UF deve ter 2 letras.'],
    ]);
    return {
      name: String(body.name).trim(),
      email: String(body.email).trim().toLowerCase(),
      zip_code: onlyDigits(body.zip_code),
      adress_street: String(body.adress_street).trim(),
      adress_number: String(body.adress_number).trim(),
      adress_complement: isPresent(body.adress_complement) ? String(body.adress_complement).trim() : null,
      adress_neighborhood: String(body.adress_neighborhood).trim(),
      adress_city: String(body.adress_city).trim(),
      adress_state: String(body.adress_state).toUpperCase(),
    };
  }

  function patientPayload(body: Record<string, unknown>, partial = false) {
    const birth = body.birth_date ? new Date(String(body.birth_date)) : null;
    validate([
      [(!partial || body.name !== undefined) && String(body.name ?? '').trim().length < 3, 'name', 'Nome deve ter ao menos 3 caracteres.'],
      [isPresent(body.cpf) && !isValidCpf(String(body.cpf)), 'cpf', 'CPF inválido.'],
      [(!partial || body.birth_date !== undefined) && (!birth || Number.isNaN(birth.getTime())), 'birth_date', 'Data de nascimento inválida.'],
      [Boolean(birth && birth.getTime() > clock().getTime()), 'birth_date', 'A data de nascimento não pode estar no futuro.'],
    ]);
    const changes: Partial<MockPatient> = {};
    if (body.name !== undefined) changes.name = String(body.name).trim();
    if (body.cpf !== undefined) changes.cpf = isPresent(body.cpf) ? onlyDigits(body.cpf) : null;
    if (birth) changes.birth_date = birth.toISOString();
    return changes;
  }

  function attendancePayload(body: Record<string, unknown>, companyId: number) {
    const start = new Date(String(body.start_date ?? ''));
    validate([
      [!Number(body.patient_id), 'patient_id', 'Paciente é obrigatório.'],
      [!Number(body.user_id), 'user_id', 'Profissional é obrigatório.'],
      [!Number(body.place_id), 'place_id', 'Local é obrigatório.'],
      [Number.isNaN(start.getTime()), 'start_date', 'Data inválida.'],
    ]);
    const { patients, places, users } = db();
    const patient = patients.find((p) => p.id === Number(body.patient_id) && !p.is_deleted);
    const place = places.find((p) => p.id === Number(body.place_id) && !p.is_deleted);
    const doctor = users.find((u) => u.id === Number(body.user_id) && !u.is_deleted);
    validate([
      [!patient || patient.company_id !== companyId, 'patient_id', 'Paciente não pertence a esta clínica.'],
      [!place || place.company_id !== companyId, 'place_id', 'Local não pertence a esta clínica.'],
      [!doctor || doctor.company_id !== companyId, 'user_id', 'Profissional não pertence a esta clínica.'],
    ]);
    return { patient_id: Number(body.patient_id), place_id: Number(body.place_id), user_id: Number(body.user_id), start_date: start.toISOString() };
  }

  function userPayload(body: Record<string, unknown>, existing?: MockUser) {
    const isCreate = !existing;
    validate([
      [isCreate && !isPresent(body.name), 'name', 'Nome é obrigatório.'],
      [(isCreate || body.email !== undefined) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email ?? '')), 'email', 'Email inválido.'],
      [(isCreate || body.login !== undefined) && String(body.login ?? '').trim().length < 3, 'login', 'Login deve ter ao menos 3 caracteres.'],
      [(isCreate || body.cpf !== undefined) && !isValidCpf(String(body.cpf ?? '')), 'cpf', 'CPF inválido.'],
      [isCreate && String(body.password ?? '').length < 6, 'password', 'A senha deve ter ao menos 6 caracteres.'],
      [!isCreate && isPresent(body.password) && String(body.password).length < 6, 'password', 'A senha deve ter ao menos 6 caracteres.'],
      [(isCreate || body.role !== undefined) && !['DOCTOR', 'RECEPTIONIST', 'GUEST'].includes(String(body.role)), 'role', 'Perfil inválido.'],
    ]);
    const next = {
      email: String(body.email ?? existing?.email)
        .trim()
        .toLowerCase(),
      login: String(body.login ?? existing?.login).trim(),
      cpf: onlyDigits(body.cpf ?? existing?.cpf),
    };
    const clash = db().users.find((u) => u.id !== existing?.id && (u.login === next.login || u.email === next.email || u.cpf === next.cpf));
    if (clash) {
      const field = clash.login === next.login ? 'login' : clash.email === next.email ? 'email' : 'cpf';
      throw new HttpError(409, 'Email, login ou CPF já cadastrado.', [{ field, message: `${field} já cadastrado.` }]);
    }
    return {
      ...next,
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      phone: body.phone,
      role: body.role,
      root: body.root,
      password: body.password,
    };
  }

  function dashboard(companyId: number, query: URLSearchParams) {
    const startParam = query.get('start_date');
    const endParam = query.get('end_date');
    const start = startParam ? new Date(`${startParam.slice(0, 10)}T00:00:00.000Z`) : undefined;
    const end = endParam ? new Date(`${endParam.slice(0, 10)}T23:59:59.999Z`) : undefined;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) throw new HttpError(400, 'Datas inválidas.');
    if (start && end && end < start) throw new HttpError(400, 'A data final não pode ser anterior à data inicial.');
    const inRange = (value: string) => {
      const date = new Date(value);
      return (!start || date >= start) && (!end || date <= end);
    };
    const { patients, attendances, users, places } = db();
    const own = <T extends { company_id: number; is_deleted: boolean }>(rows: T[]) => rows.filter((r) => r.company_id === companyId && !r.is_deleted);
    const companyAttendances = own(attendances);
    const periodAttendances = companyAttendances.filter((a) => inRange(a.start_date)).map(withRelations);
    const now = clock();
    const byStatus = { scheduled: 0, confirmed: 0, finished: 0 };
    periodAttendances.forEach((a) => (byStatus[getStatus(a)] += 1));
    return {
      totalPatients: own(patients).length,
      totalAttendances: companyAttendances.length,
      totalUsers: own(users).length,
      totalPlaces: own(places).length,
      period: { start_date: start ? start.toISOString().slice(0, 10) : null, end_date: end ? end.toISOString().slice(0, 10) : null },
      attendancesByStatus: byStatus,
      attendancesByPlace: toRanking(countBy(periodAttendances, (a) => a.place?.name ?? 'Sem local')),
      attendancesByProfessional: toRanking(countBy(periodAttendances, (a) => a.user?.name ?? 'Sem profissional')).slice(0, 5),
      upcomingAttendances: companyAttendances
        .filter((a) => !a.end_date && new Date(a.start_date) >= now)
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(0, 5)
        .map((a) => ({ ...withRelations(a), status: getStatus(a) })),
      details: {
        attendances_by_day: countBy(periodAttendances, (a) => a.start_date.slice(0, 10)),
        patients_by_day: countBy(
          own(patients).filter((p) => inRange(p.created_at)),
          (p) => p.created_at.slice(0, 10),
        ),
      },
    };
  }

  function report(companyId: number, query: URLSearchParams) {
    const role = query.get('role') || 'DOCTOR';
    const startParam = query.get('start_date');
    const endParam = query.get('end_date');
    const start = startParam ? new Date(`${startParam.slice(0, 10)}T00:00:00.000Z`) : undefined;
    const end = endParam ? new Date(`${endParam.slice(0, 10)}T23:59:59.999Z`) : undefined;
    const { users, attendances } = db();
    const staff = users.filter((u) => u.company_id === companyId && !u.is_deleted && (role === 'ALL' ? u.role !== 'GUEST' : u.role === role));
    const scoped = attendances.filter((a) => {
      const date = new Date(a.start_date);
      return a.company_id === companyId && !a.is_deleted && (!start || date >= start) && (!end || date <= end);
    });
    return staff
      .map((u) => {
        const mine = scoped.filter((a) => (u.role === 'RECEPTIONIST' ? a.receptionist_id : a.user_id) === u.id);
        return {
          id: u.id,
          name: u.name,
          role: u.role,
          total_attendances: mine.length,
          finished_attendances: mine.filter((a) => a.end_date).length,
          root: u.root,
        };
      })
      .filter((row) => row.total_attendances > 0 || !row.root)
      .map(({ root: _root, ...row }) => row)
      .sort((a, b) => b.total_attendances - a.total_attendances || a.name.localeCompare(b.name));
  }

  // ---------- roteamento ----------
  function route(req: MockRequest): MockResponse {
    const method = req.method.toUpperCase();
    const segments = req.path.replace(/^\/+|\/+$/g, '').split('/');
    const [resource, id, action] = segments;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const q = req.query;
    const ok = (data: unknown, status = 200): MockResponse => ({ status, body: data });
    const data = db();

    if (resource === 'health' && method === 'GET') {
      return ok({ status: 'ok', service: 'clinicalcare-mock-api', version: '1.0.0', database: 'mock', latencyMs: 0, timestamp: clock().toISOString() });
    }

    if (resource === 'auth') {
      if (id === 'login' && method === 'POST') return ok(login(body));
      const user = authenticate(req.headers.authorization);
      const record = findOr404(data.users, String(user.id), 'Usuário não encontrado.');
      if (id === 'me' && method === 'GET') return ok(publicUser(record));
      if (id === 'change-password' && method === 'POST') {
        validate([[String(body.newPassword ?? '').length < 6, 'newPassword', 'A nova senha deve ter ao menos 6 caracteres.']]);
        if (record.password !== body.currentPassword) throw new HttpError(400, 'Senha atual incorreta.');
        record.password = String(body.newPassword);
        store.save();
        return ok({ message: 'Senha alterada com sucesso.' });
      }
    }

    const user =
      resource && ['companies', 'patients', 'places', 'attendances', 'users', 'dashboard', 'reports'].includes(resource)
        ? authenticate(req.headers.authorization)
        : null;

    if (resource === 'companies' && user) {
      if (!id && method === 'GET') return ok(byName(data.companies.filter((c) => !c.is_deleted && (canAccessAll(user) || c.id === user.company_id))));
      if (!id && method === 'POST') {
        requireRoot(user);
        const company = { id: nextId(data.companies), ...companyPayload(body), is_deleted: false };
        data.companies.push(company);
        store.save();
        return ok(company, 201);
      }
      const company = findOr404(data.companies, id, 'Clínica não encontrada.');
      assertAccess(user, company.id, 'Clínica não encontrada.');
      if (method === 'GET') return ok(company);
      requireRoot(user);
      if (method === 'PUT') Object.assign(company, companyPayload(body));
      if (method === 'DELETE') company.is_deleted = true;
      store.save();
      return ok(method === 'DELETE' ? { message: 'Clínica excluída.' } : company);
    }

    if (resource === 'patients' && user) {
      if (!id && method === 'GET') {
        const companyId = resolveCompanyId(user, q.get('company_id'), false);
        const search = (q.get('search') ?? '').trim().toLowerCase();
        const digits = onlyDigits(search);
        return ok(
          byName(
            data.patients.filter(
              (p) =>
                !p.is_deleted &&
                (!companyId || p.company_id === companyId) &&
                (!search || p.name.toLowerCase().includes(search) || (digits.length > 0 && Boolean(p.cpf?.includes(digits)))),
            ),
          ),
        );
      }
      if (!id && method === 'POST') {
        requireWrite(user);
        const companyId = resolveCompanyId(user, body.company_id)!;
        const changes = patientPayload(body);
        const patient: MockPatient = {
          id: nextId(data.patients),
          name: '',
          cpf: null,
          birth_date: '',
          ...changes,
          company_id: companyId,
          created_at: clock().toISOString(),
          is_deleted: false,
        };
        data.patients.push(patient);
        store.save();
        return ok(patient, 201);
      }
      const patient = findOr404(data.patients, id, 'Paciente não encontrado.');
      assertAccess(user, patient.company_id, 'Paciente não encontrado.');
      if (method === 'GET') return ok(patient);
      requireWrite(user);
      if (method === 'PUT') Object.assign(patient, patientPayload(body, true));
      if (method === 'DELETE') patient.is_deleted = true;
      store.save();
      return ok(method === 'DELETE' ? { message: 'Paciente excluído.' } : patient);
    }

    if (resource === 'places' && user) {
      if (!id && method === 'GET') {
        const companyId = resolveCompanyId(user, q.get('company_id'), false);
        return ok(byName(data.places.filter((p) => !p.is_deleted && (!companyId || p.company_id === companyId))));
      }
      const validName = () => validate([[String(body.name ?? '').trim().length < 2, 'name', 'Nome deve ter ao menos 2 caracteres.']]);
      if (!id && method === 'POST') {
        requireWrite(user);
        validName();
        const place = { id: nextId(data.places), name: String(body.name).trim(), company_id: resolveCompanyId(user, body.company_id)!, is_deleted: false };
        data.places.push(place);
        store.save();
        return ok(place, 201);
      }
      const place = findOr404(data.places, id, 'Local não encontrado.');
      assertAccess(user, place.company_id, 'Local não encontrado.');
      if (method === 'GET') return ok(place);
      requireWrite(user);
      if (method === 'PUT') {
        validName();
        place.name = String(body.name).trim();
      }
      if (method === 'DELETE') place.is_deleted = true;
      store.save();
      return ok(method === 'DELETE' ? { message: 'Local excluído.' } : place);
    }

    if (resource === 'attendances' && user) {
      if (!id && method === 'GET') {
        const companyId = resolveCompanyId(user, q.get('company_id'), false);
        const patientId = Number(q.get('patient_id') ?? q.get('patientId')) || undefined;
        const from = q.get('from') ? new Date(q.get('from')!) : undefined;
        const to = q.get('to') ? new Date(q.get('to')!) : undefined;
        return ok(
          data.attendances
            .filter((a) => {
              const date = new Date(a.start_date);
              return (
                !a.is_deleted &&
                (!companyId || a.company_id === companyId) &&
                (!patientId || a.patient_id === patientId) &&
                (!from || date >= from) &&
                (!to || date <= to)
              );
            })
            .sort((a, b) => b.start_date.localeCompare(a.start_date))
            .map(withRelations),
        );
      }
      if (!id && method === 'POST') {
        requireWrite(user);
        const companyId = resolveCompanyId(user, body.company_id)!;
        const attendance: MockAttendance = {
          id: nextId(data.attendances),
          company_id: companyId,
          ...attendancePayload(body, companyId),
          receptionist_id: user.role === 'RECEPTIONIST' ? user.id : null,
          confirmed_by: null,
          confirmed_at: null,
          end_date: null,
          is_deleted: false,
        };
        data.attendances.push(attendance);
        store.save();
        return ok(withRelations(attendance), 201);
      }
      const attendance = findOr404(data.attendances, id, 'Atendimento não encontrado.');
      assertAccess(user, attendance.company_id, 'Atendimento não encontrado.');
      if (method === 'GET' && !action) return ok(withRelations(attendance));
      requireWrite(user);
      if (method === 'PUT' && action === 'confirm') {
        if (attendance.confirmed_at) throw new HttpError(409, 'Atendimento já confirmado.');
        Object.assign(attendance, { confirmed_at: clock().toISOString(), confirmed_by: user.id });
      } else if (method === 'PUT' && action === 'finish') {
        if (!canFinalizeAttendance(user, attendance)) throw new HttpError(403, finishForbiddenMessage(user));
        if (attendance.end_date) throw new HttpError(409, 'Atendimento já finalizado.');
        if (!attendance.confirmed_at) throw new HttpError(409, 'Confirme o atendimento antes de finalizar.');
        attendance.end_date = clock().toISOString();
      } else if (method === 'PUT' && !action) {
        if (attendance.end_date) throw new HttpError(409, 'Atendimentos finalizados não podem ser editados.');
        Object.assign(attendance, attendancePayload(body, attendance.company_id));
      } else if (method === 'DELETE' && !action) {
        attendance.is_deleted = true;
        store.save();
        return ok({ message: 'Atendimento excluído.' });
      } else {
        return notFound(req);
      }
      store.save();
      return ok(withRelations(attendance));
    }

    if (resource === 'users' && user) {
      if (!id && method === 'GET') {
        requireStaff(user);
        const companyId = resolveCompanyId(user, q.get('company_id'), false);
        const role = q.get('role');
        const name = (q.get('name') ?? '').toLowerCase();
        return ok({
          users: byName(
            data.users.filter(
              (u) =>
                !u.is_deleted && (!companyId || u.company_id === companyId) && (!role || u.role === role) && (!name || u.name.toLowerCase().includes(name)),
            ),
          ).map(publicUser),
        });
      }
      if (!id && method === 'POST') {
        requireRoot(user);
        const payload = userPayload(body);
        const created: MockUser = {
          id: nextId(data.users),
          name: payload.name ?? '',
          email: payload.email,
          login: payload.login,
          cpf: payload.cpf,
          password: String(payload.password),
          phone: isPresent(payload.phone) ? String(payload.phone) : null,
          role: payload.role as UserRole,
          root: Boolean(payload.root),
          company_id: resolveCompanyId(user, body.company_id)!,
          is_deleted: false,
        };
        data.users.push(created);
        store.save();
        return ok(publicUser(created), 201);
      }
      requireStaff(user);
      const target = findOr404(data.users, id, 'Usuário não encontrado.');
      assertAccess(user, target.company_id, 'Usuário não encontrado.');
      if (method === 'GET') return ok(publicUser(target));
      requireRoot(user);
      if (method === 'DELETE') {
        if (target.id === user.id) throw new HttpError(400, 'Você não pode excluir o próprio usuário.');
        target.is_deleted = true;
        store.save();
        return ok({ message: 'Usuário excluído.' });
      }
      const payload = userPayload(body, target);
      Object.assign(target, {
        email: payload.email,
        login: payload.login,
        cpf: payload.cpf,
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.phone !== undefined ? { phone: isPresent(payload.phone) ? String(payload.phone) : null } : {}),
        ...(payload.role !== undefined ? { role: payload.role } : {}),
        ...(payload.root !== undefined ? { root: Boolean(payload.root) } : {}),
        ...(isPresent(payload.password) ? { password: String(payload.password) } : {}),
      });
      store.save();
      return ok(publicUser(target));
    }

    if (resource === 'dashboard' && id === 'statistics' && method === 'GET' && user) {
      return ok(dashboard(resolveCompanyId(user, q.get('company_id'))!, q));
    }

    if (resource === 'reports' && id === 'attendances' && method === 'GET' && user) {
      return ok(report(resolveCompanyId(user, q.get('company_id'))!, q));
    }

    return notFound(req);
  }

  const notFound = (req: MockRequest): MockResponse => ({ status: 404, body: { error: `Rota ${req.method.toUpperCase()} /api${req.path} não encontrada.` } });

  return {
    handle(req: MockRequest): MockResponse {
      try {
        return route(req);
      } catch (error) {
        if (error instanceof HttpError) {
          return { status: error.status, body: { error: error.message, ...(error.details ? { details: error.details } : {}) } };
        }
        return { status: 500, body: { error: 'Erro interno do servidor.' } };
      }
    },
  };
}

export type MockApi = ReturnType<typeof createMockApi>;
