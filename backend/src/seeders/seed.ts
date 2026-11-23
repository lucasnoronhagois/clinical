import bcrypt from 'bcrypt';
import { Sequelize } from 'sequelize';
import { config } from '../config/env';
import { createSequelize } from '../config/sequelize';
import { Attendance, Company, Patient, Place, User } from '../models';
import { buildDemoDataset, DEMO_PASSWORD, demoCompanies, demoPlaces, demoUsers, fakeCpf, fakePhone } from './demoData';

export interface SeedOptions {
  reset?: boolean;
  now?: Date;
  log?: (message: string) => void;
}

export async function seedDemoData(sequelize: Sequelize, { reset = false, now = new Date(), log = () => undefined }: SeedOptions = {}) {
  const alreadySeeded = await User.findOne({ where: { login: 'admin' } });
  if (alreadySeeded && !reset) {
    log('Dados de demonstração já existem. Use --reset para recriar.');
    return { skipped: true };
  }

  return sequelize.transaction(async (transaction) => {
    if (reset) {
      for (const model of [Attendance, Patient, Place, User, Company]) {
        await (model as typeof Attendance).destroy({ where: {}, transaction });
      }
    }

    const companies: Company[] = [];
    for (const data of demoCompanies) {
      companies.push(await Company.create({ ...data, is_deleted: false }, { transaction }));
    }

    const password = await bcrypt.hash(DEMO_PASSWORD, 10);
    const users: Record<string, User> = {};
    for (const [index, data] of demoUsers.entries()) {
      users[data.key] = await User.create(
        {
          name: data.name,
          email: data.email,
          login: data.login,
          password,
          cpf: fakeCpf(9000 + index),
          phone: fakePhone(index + 1),
          role: data.role,
          root: data.root,
          company_id: companies[data.company].id,
          is_deleted: false,
        },
        { transaction },
      );
    }

    const places: Place[] = [];
    for (const data of demoPlaces) {
      places.push(await Place.create({ name: data.name, company_id: companies[data.company].id, is_deleted: false }, { transaction }));
    }

    const dataset = buildDemoDataset(now);
    const patients = await Patient.bulkCreate(
      dataset.patients.map((p) => ({
        name: p.name,
        cpf: p.cpf,
        birth_date: p.birth_date,
        created_at: p.created_at,
        company_id: companies[p.company].id,
        is_deleted: false,
      })),
      { transaction },
    );

    await Attendance.bulkCreate(
      dataset.attendances.map((a) => ({
        company_id: companies[a.company].id,
        patient_id: patients[a.patientIndex].id,
        place_id: places[a.placeIndex].id,
        user_id: users[a.doctorKey].id,
        receptionist_id: users[a.receptionistKey].id,
        confirmed_by: a.confirmed_at ? users[a.receptionistKey].id : null,
        start_date: a.start_date,
        confirmed_at: a.confirmed_at,
        end_date: a.end_date,
        is_deleted: false,
      })),
      { transaction },
    );

    const summary = {
      skipped: false,
      companies: companies.length,
      users: demoUsers.length,
      places: places.length,
      patients: patients.length,
      attendances: dataset.attendances.length,
    };
    log(`Seed concluído: ${JSON.stringify(summary)}`);
    return summary;
  });
}

async function main() {
  const sequelize = createSequelize(config);
  const reset = process.argv.includes('--reset');
  try {
    await sequelize.authenticate();
    if (config.db.dialect === 'sqlite') await sequelize.sync();
    await seedDemoData(sequelize, { reset, log: (message) => console.log(`[seed] ${message}`) });
    console.log(`[seed] Logins de demonstração (senha "${DEMO_PASSWORD}"): admin, medico, recepcao, visitante`);
  } catch (error) {
    console.error('[seed] Falha ao popular o banco:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  void main();
}
