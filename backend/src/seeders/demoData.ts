/**
 * Dados de demonstração 100% fictícios.
 * Nomes são combinações aleatórias, CPFs são gerados apenas com formato válido,
 * telefones usam o prefixo 90000 e emails usam o domínio reservado `.example`.
 */
import { cpfCheckDigits } from '../utils';
import { UserRole } from '../types/auth';

export const DEMO_PASSWORD = 'demo123';

export interface DemoUser {
  key: string;
  name: string;
  login: string;
  email: string;
  role: UserRole;
  root: boolean;
  company: number;
}

export interface DemoCompany {
  name: string;
  email: string;
  zip_code: string;
  adress_street: string;
  adress_number: string;
  adress_complement?: string;
  adress_neighborhood: string;
  adress_city: string;
  adress_state: string;
}

export const demoCompanies: DemoCompany[] = [
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
    adress_neighborhood: 'Vila Fictícia',
    adress_city: 'Olinda',
    adress_state: 'PE',
  },
];

export const demoUsers: DemoUser[] = [
  { key: 'admin', name: 'Admin Demo', login: 'admin', email: 'admin@clinicalcare.example', role: 'DOCTOR', root: true, company: 0 },
  { key: 'doctor', name: 'Dra. Marina Albuquerque', login: 'medico', email: 'medico@clinicalcare.example', role: 'DOCTOR', root: false, company: 0 },
  { key: 'doctor2', name: 'Dr. Rafael Teixeira', login: 'rafael.teixeira', email: 'rafael.teixeira@clinicalcare.example', role: 'DOCTOR', root: false, company: 0 },
  { key: 'doctor3', name: 'Dra. Beatriz Monteiro', login: 'beatriz.monteiro', email: 'beatriz.monteiro@clinicalcare.example', role: 'DOCTOR', root: false, company: 0 },
  { key: 'receptionist', name: 'Carla Nogueira', login: 'recepcao', email: 'recepcao@clinicalcare.example', role: 'RECEPTIONIST', root: false, company: 0 },
  { key: 'receptionist2', name: 'Diego Farias', login: 'diego.farias', email: 'diego.farias@clinicalcare.example', role: 'RECEPTIONIST', root: false, company: 0 },
  { key: 'guest', name: 'Visitante Demo', login: 'visitante', email: 'visitante@clinicalcare.example', role: 'GUEST', root: false, company: 0 },
  { key: 'doctor4', name: 'Dr. Tiago Moreira', login: 'tiago.moreira', email: 'tiago.moreira@clinicalcare.example', role: 'DOCTOR', root: false, company: 1 },
  { key: 'doctor5', name: 'Dra. Larissa Pacheco', login: 'larissa.pacheco', email: 'larissa.pacheco@clinicalcare.example', role: 'DOCTOR', root: false, company: 1 },
  { key: 'receptionist3', name: 'Paula Mendes', login: 'paula.mendes', email: 'paula.mendes@clinicalcare.example', role: 'RECEPTIONIST', root: false, company: 1 },
];

export const demoPlaces: Array<{ name: string; company: number }> = [
  { name: 'Consultório 1', company: 0 },
  { name: 'Consultório 2', company: 0 },
  { name: 'Sala de Exames', company: 0 },
  { name: 'Sala de Procedimentos', company: 0 },
  { name: 'Consultório A', company: 1 },
  { name: 'Consultório B', company: 1 },
];

const FIRST_NAMES = ['Lívia', 'Caio', 'Renata', 'Otávio', 'Isabela', 'Murilo', 'Fernanda', 'Gustavo', 'Yasmin', 'Heitor', 'Priscila', 'Vinícius', 'Aline', 'Bruno', 'Camila', 'Davi', 'Elisa', 'Fábio', 'Gabriela', 'Henrique', 'Júlia', 'Leonardo', 'Mirela', 'Nicolas', 'Olívia', 'Pedro', 'Raquel', 'Samuel', 'Tainá', 'Vitor'];
const LAST_NAMES = ['Arantes', 'Bezerra', 'Cavalcanti', 'Dantas', 'Esteves', 'Figueiredo', 'Guedes', 'Holanda', 'Lacerda', 'Macedo', 'Novaes', 'Prado', 'Queiroz', 'Rezende', 'Sampaio', 'Tavares', 'Valença', 'Xavier'];

/** PRNG determinístico (mulberry32) para gerar sempre o mesmo conjunto de dados. */
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

/** Gera um CPF fictício com dígitos verificadores válidos. */
export function fakeCpf(index: number): string {
  const base = String(100000000 + ((index * 7919 + 12345) % 899999999)).padStart(9, '0');
  return `${base}${cpfCheckDigits(base)}`;
}

export function fakePhone(index: number): string {
  return `(81) 90000-${String(index).padStart(4, '0')}`;
}

export interface DemoPatient {
  name: string;
  cpf: string | null;
  birth_date: Date;
  created_at: Date;
  company: number;
}

export interface DemoAttendance {
  company: number;
  patientIndex: number;
  placeIndex: number;
  doctorKey: string;
  receptionistKey: string;
  start_date: Date;
  confirmed_at: Date | null;
  end_date: Date | null;
}

const DAY = 24 * 60 * 60 * 1000;

export function buildDemoDataset(now = new Date(), seed = 2025) {
  const random = createRandom(seed);
  const usedNames = new Set<string>();

  const patients: DemoPatient[] = [];
  const perCompany = [42, 16];
  perCompany.forEach((total, company) => {
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
        name,
        cpf: random.next() < 0.9 ? fakeCpf(patients.length + 1) : null,
        birth_date: new Date(Date.UTC(now.getUTCFullYear() - age, random.int(0, 11), random.int(1, 28))),
        created_at: new Date(now.getTime() - random.int(5, 200) * DAY),
        company,
      });
    }
  });

  const doctorsBy = (company: number) => demoUsers.filter((u) => u.company === company && u.role === 'DOCTOR' && !u.root).map((u) => u.key);
  const receptionistsBy = (company: number) => demoUsers.filter((u) => u.company === company && u.role === 'RECEPTIONIST').map((u) => u.key);
  const placesBy = (company: number) => demoPlaces.map((p, index) => ({ ...p, index })).filter((p) => p.company === company).map((p) => p.index);
  const patientsBy = (company: number) => patients.map((p, index) => ({ ...p, index })).filter((p) => p.company === company);

  const attendances: DemoAttendance[] = [];
  const plan: Array<[number, number]> = [
    [0, 230],
    [1, 70],
  ];

  plan.forEach(([company, total]) => {
    const companyPatients = patientsBy(company);
    for (let i = 0; i < total; i += 1) {
      const patient = random.pick(companyPatients);
      // Distribui atendimentos entre 150 dias atrás e 14 dias à frente, com tendência de crescimento recente.
      const offsetDays = Math.round(-150 + Math.pow(random.next(), 0.7) * 164);
      const day = new Date(now.getTime() + offsetDays * DAY);
      const weekday = day.getUTCDay();
      if (weekday === 0) day.setUTCDate(day.getUTCDate() + 1);
      // 08h às 17h no horário de Recife (UTC-3)
      const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), random.int(11, 20), random.pick([0, 20, 40])));
      const createdAt = new Date(patient.created_at.getTime() + DAY);
      if (start < createdAt) {
        const shifted = new Date(createdAt.getTime() + random.int(1, 10) * DAY);
        start.setUTCFullYear(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
      }

      const isPast = start.getTime() < now.getTime();
      const roll = random.next();
      let confirmed_at: Date | null = null;
      let end_date: Date | null = null;
      if (isPast) {
        if (roll < 0.86) {
          confirmed_at = new Date(start.getTime() - 30 * 60 * 1000);
          end_date = new Date(start.getTime() + random.int(20, 50) * 60 * 1000);
        } else if (roll < 0.94) {
          confirmed_at = new Date(start.getTime() - 30 * 60 * 1000);
        }
      } else if (roll < 0.35) {
        confirmed_at = new Date(Math.min(start.getTime(), now.getTime()) - random.int(1, 48) * 60 * 60 * 1000);
        confirmed_at.setUTCMinutes(random.pick([0, 15, 30, 45]), 0, 0);
      }

      attendances.push({
        company,
        patientIndex: patient.index,
        placeIndex: random.pick(placesBy(company)),
        doctorKey: random.pick(doctorsBy(company)),
        receptionistKey: random.pick(receptionistsBy(company)),
        start_date: start,
        confirmed_at,
        end_date,
      });
    }
  });

  return { patients, attendances };
}
