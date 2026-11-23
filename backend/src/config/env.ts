import dotenv from 'dotenv';

dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env', quiet: true });

export type DbDialect = 'mysql' | 'mariadb' | 'sqlite';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
  db: {
    dialect: DbDialect;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    storage: string;
    logging: boolean;
  };
}

const parseList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const jwtSecret = env.JWT_SECRET ?? (nodeEnv === 'test' ? 'test-only-secret' : '');

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined. Copy backend/.env.example to backend/.env and set it.');
  }

  const dialect = (env.DB_DIALECT ?? 'mysql') as DbDialect;
  if (!['mysql', 'mariadb', 'sqlite'].includes(dialect)) {
    throw new Error(`Unsupported DB_DIALECT "${dialect}". Use mysql, mariadb or sqlite.`);
  }

  return {
    nodeEnv,
    port: Number(env.PORT ?? 3000),
    jwtSecret,
    jwtExpiresIn: env.JWT_EXPIRES_IN ?? '8h',
    corsOrigins: parseList(env.CORS_ORIGIN),
    db: {
      dialect,
      host: env.DB_HOST ?? 'localhost',
      port: Number(env.DB_PORT ?? 3306),
      name: env.DB_NAME ?? 'clinicalcare',
      user: env.DB_USER ?? 'root',
      password: env.DB_PASS ?? '',
      storage: env.DB_STORAGE ?? ':memory:',
      logging: env.DB_LOGGING === 'true',
    },
  };
}

export const config = loadConfig();
