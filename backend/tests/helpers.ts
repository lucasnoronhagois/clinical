import request from 'supertest';
import { Application } from 'express';
import { Sequelize } from 'sequelize';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config/env';
import { createSequelize } from '../src/config/sequelize';
import { seedDemoData } from '../src/seeders/seed';
import { DEMO_PASSWORD } from '../src/seeders/demoData';

export const FIXED_NOW = new Date('2026-03-16T12:00:00.000Z');

export interface TestContext {
  app: Application;
  sequelize: Sequelize;
  tokens: Record<string, string>;
}

export async function setupTestApp(): Promise<TestContext> {
  const config = loadConfig();
  const sequelize = createSequelize(config);
  await sequelize.sync({ force: true });
  await seedDemoData(sequelize, { now: FIXED_NOW });
  const app = createApp(sequelize, config);

  const tokens: Record<string, string> = {};
  for (const login of ['admin', 'medico', 'recepcao', 'visitante', 'tiago.moreira', 'rafael.teixeira']) {
    const res = await request(app).post('/api/auth/login').send({ email_or_login: login, password: DEMO_PASSWORD });
    tokens[login] = res.body.token;
  }
  return { app, sequelize, tokens };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
