/**
 * Dados de demonstração 100% fictícios usados pela API local do navegador.
 * Nomes são combinações aleatórias, CPFs são gerados apenas com formato válido,
 * telefones usam o prefixo 90000 e emails usam o domínio reservado `.example`.
 * Espelha o seed da API Node (backend/src/seeders/demoData.ts).
 */
import type { UserRole } from '../types';

export const DEMO_PASSWORD = 'demo123';

export interface MockCompany {
  id: number;
  name: string;
  email: string;
  zip_code: string;
  adress_street: string;
  adress_number: string;
  adress_complement: string | null;
  adress_neighborhood: string;
  adress_city: string;
  adress_state: string;
  is_deleted: boolean;
}

export interface MockUser {
  id: number;
  name: string;
  login: string;
  email: string;
  password: string;
  cpf: string;
  phone: string | null;
  role: UserRole;
  root: boolean;
  company_id: number;
  is_deleted: boolean;
}

export interface MockPlace {
  id: number;
  name: string;
  company_id: number;
  is_deleted: boolean;
}

export interface MockPatient {
  id: number;
  name: string;
  cpf: string | null;
  birth_date: string;
  company_id: number;
  created_at: string;
  is_deleted: boolean;
}

export interface MockAttendance {
  id: number;
  user_id: number;
  company_id: number;
  patient_id: number;
  place_id: number;
  receptionist_id: number | null;
  confirmed_by: number | null;
  start_date: string;
  confirmed_at: string | null;
  end_date: string | null;
  is_deleted: boolean;
}

export interface MockData {
  version: number;
  generatedAt: string;
  companies: MockCompany[];
  users: MockUser[];
  places: MockPlace[];
  patients: MockPatient[];
  attendances: MockAttendance[];
}

export const MOCK_DATA_VERSION = 1;

const companies: Omit<MockCompany, 'id' | 'is_deleted'>[] = [
  {
    name: 'Clínica Vida Plena',
    email: 'contato@vidaplena.example',
    zip_code: '50000000',
    adress_street: 'Rua das Acácias',
    adress_number: '120',
    adress_complement: 'Sala 401',
    adress_neighborhood: 'Jardim Demonstração',
    adress_city: 'Recife',
    adress_state: 'PE',
  },
  {
    name: 'Centro Médico Bem Viver',
    email: 'contato@bemviver.example',
    zip_code: '53000000',
    adress_street: 'Avenida dos Ipês',
    adress_number: '845',
    adress_complement: null,
    adress_neighborhood: 'Vila Fictícia',
    adress_city: 'Olinda',
    adress_state: 'PE',
  },
];

const users: Array<{ name: string; login: string; role: UserRole; root?: boolean; company: number }> = [
  { name: 'Admin Demo', login: 'admin', role: 'DOCTOR', root: true, company: 0 },
  { name: 'Dra. Marina Albuquerque', login: 'medico', role: 'DOCTOR', company: 0 },
  { name: 'Dr. Rafael Teixeira', login: 'rafael.teixeira', role: 'DOCTOR', company: 0 },
  { name: 'Dra. Beatriz Monteiro', login: 'beatriz.monteiro', role: 'DOCTOR', company: 0 },
  { name: 'Carla Nogueira', login: 'recepcao', role: 'RECEPTIONIST', company: 0 },
  { name: 'Diego Farias', login: 'diego.farias', role: 'RECEPTIONIST', company: 0 },
  { name: 'Visitante Demo', login: 'visitante', role: 'GUEST', company: 0 },
  { name: 'Dr. Tiago Moreira', login: 'tiago.moreira', role: 'DOCTOR', company: 1 },
  { name: 'Dra. Larissa Pacheco', login: 'larissa.pacheco', role: 'DOCTOR', company: 1 },
  { name: 'Paula Mendes', login: 'paula.mendes', role: 'RECEPTIONIST', company: 1 },
];

const places: Array<{ name: string; company: number }> = [
  { name: 'Consultório 1', company: 0 },
  { name: 'Consultório 2', company: 0 },
  { name: 'Sala de Exames', company: 0 },
  { name: 'Sala de Procedimentos', company: 0 },
  { name: 'Consultório A', company: 1 },
  { name: 'Consultório B', company: 1 },
];

const FIRST_NAMES = [
  'Lívia',
  'Caio',
  'Renata',
  'Otávio',
  'Isabela',
  'Murilo',
  'Fernanda',
  'Gustavo',
  'Yasmin',
  'Heitor',
  'Priscila',
  'Vinícius',
  'Aline',
  'Bruno',
  'Camila',
  'Davi',
  'Elisa',
  'Fábio',
  'Gabriela',
  'Henrique',
  'Júlia',
  'Leonardo',
  'Mirela',
  'Nicolas',
  'Olívia',
  'Pedro',
  'Raquel',
  'Samuel',
  'Tainá',
  'Vitor',
];
const LAST_NAMES = [
  'Arantes',
  'Bezerra',
  'Cavalcanti',
  'Dantas',
  'Esteves',
  'Figueiredo',
  'Guedes',
  'Holanda',
  'Lacerda',
  'Macedo',
  'Novaes',
  'Prado',
  'Queiroz',
  'Rezende',
  'Sampaio',
  'Tavares',
  'Valença',
  'Xavier',
];

/** PRNG determinístico (mulberry32): o mesmo dia gera sempre o mesmo conjunto de dados. */
export function createRandom(seed = 2025) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(list: T[]): T => list[Math.floor(next() * list.length)],
  };
}

export function cpfCheckDigits(base: string): string {
  const digits = base.replace(/\D/g, '').slice(0, 9).split('').map(Number);
  const calc = (list: number[]) => {
    const sum = list.reduce((acc, digit, index) => acc + digit * (list.length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const first = calc(digits);
  return `${first}${calc([...digits, first])}`;
}

/** CPF fictício com dígitos verificadores válidos (não corresponde a pessoas reais de forma intencional). */
export function fakeCpf(index: number): string {
  const base = String(100000000 + ((index * 7919 + 12345) % 899999999)).padStart(9, '0');
  return `${base}${cpfCheckDigits(base)}`;
}

export const fakePhone = (index: number) => `(81) 90000-${String(index).padStart(4, '0')}`;

const DAY = 86400000;

/** Gera o banco de demonstração relativo a `now`, para que a agenda e o dashboard estejam sempre atuais. */
export function buildMockData(now = new Date(), seed = 2025): MockData {
  const random = createRandom(seed);
  const iso = (date: Date) => date.toISOString();

  const companyRows: MockCompany[] = companies.map((company, index) => ({ ...company, id: index + 1, is_deleted: false }));
  const userRows: MockUser[] = users.map((user, index) => {
    return {
      id: index + 1,
      name: user.name,
      login: user.login,
      email: `${user.login}@clinicalcare.example`,
      password: DEMO_PASSWORD,
      cpf: fakeCpf(1000 + index),
      phone: fakePhone(index + 1),
      role: user.role,
      root: Boolean(user.root),
      company_id: user.company + 1,
      is_deleted: false,
    };
  });
  const placeRows: MockPlace[] = places.map((place, index) => ({ id: index + 1, name: place.name, company_id: place.company + 1, is_deleted: false }));

  const usedNames = new Set<string>();
  const patients: MockPatient[] = [];
  [42, 16].forEach((total, company) => {
    for (let i = 0; i < total; i += 1) {
      let name = '';
      do {
        const middle = random.pick(LAST_NAMES);
        let last = random.pick(LAST_NAMES);
        while (last === middle) last = random.pick(LAST_NAMES);
        name = `${random.pick(FIRST_NAMES)} ${middle} ${last}`;
      } while (usedNames.has(name));
      usedNames.add(name);
      const age = random.int(4, 82);
      patients.push({
        id: patients.length + 1,
        name,
        cpf: random.next() < 0.9 ? fakeCpf(patients.length + 1) : null,
        birth_date: iso(new Date(Date.UTC(now.getUTCFullYear() - age, random.int(0, 11), random.int(1, 28)))),
        created_at: iso(new Date(now.getTime() - random.int(5, 200) * DAY)),
        company_id: company + 1,
        is_deleted: false,
      });
    }
  });

  const attendances: MockAttendance[] = [];
  const plan: Array<[number, number]> = [
    [1, 230],
    [2, 70],
  ];
  plan.forEach(([companyId, total]) => {
    const companyPatients = patients.filter((p) => p.company_id === companyId);
    const doctors = userRows.filter((u) => u.company_id === companyId && u.role === 'DOCTOR' && !u.root);
    const receptionists = userRows.filter((u) => u.company_id === companyId && u.role === 'RECEPTIONIST');
    const companyPlaces = placeRows.filter((p) => p.company_id === companyId);
    for (let i = 0; i < total; i += 1) {
      const patient = random.pick(companyPatients);
      // Entre 150 dias atrás e 14 dias à frente, com mais movimento nas semanas recentes.
      const offsetDays = Math.round(-150 + Math.pow(random.next(), 0.7) * 164);
      const day = new Date(now.getTime() + offsetDays * DAY);
      if (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1);
      // 08h às 17h no horário de Recife (UTC-3).
      const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), random.int(11, 20), random.pick([0, 20, 40])));
      const createdAt = new Date(new Date(patient.created_at).getTime() + DAY);
      if (start < createdAt) {
        const shifted = new Date(createdAt.getTime() + random.int(1, 10) * DAY);
        start.setUTCFullYear(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
      }

      const roll = random.next();
      let confirmedAt: Date | null = null;
      let endDate: Date | null = null;
      if (start.getTime() < now.getTime()) {
        if (roll < 0.86) {
          confirmedAt = new Date(start.getTime() - 30 * 60000);
          endDate = new Date(start.getTime() + random.int(20, 50) * 60000);
        } else if (roll < 0.94) {
          confirmedAt = new Date(start.getTime() - 30 * 60000);
        }
      } else if (roll < 0.35) {
        confirmedAt = new Date(Math.min(start.getTime(), now.getTime()) - random.int(1, 48) * 3600000);
        confirmedAt.setUTCMinutes(random.pick([0, 15, 30, 45]), 0, 0);
      }

      const doctor = random.pick(doctors);
      const receptionist = random.pick(receptionists);
      attendances.push({
        id: attendances.length + 1,
        user_id: doctor.id,
        company_id: companyId,
        patient_id: patient.id,
        place_id: random.pick(companyPlaces).id,
        receptionist_id: receptionist.id,
        confirmed_by: confirmedAt ? receptionist.id : null,
        start_date: iso(start),
        confirmed_at: confirmedAt ? iso(confirmedAt) : null,
        end_date: endDate ? iso(endDate) : null,
        is_deleted: false,
      });
    }
  });

  return {
    version: MOCK_DATA_VERSION,
    generatedAt: iso(now),
    companies: companyRows,
    users: userRows,
    places: placeRows,
    patients,
    attendances,
  };
}
