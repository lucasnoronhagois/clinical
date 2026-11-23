import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import { Sequelize } from 'sequelize';
import { AppConfig, config as defaultConfig } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares';
import apiRoutes from './routes';

const pkg = { name: 'clinicalcare-api', version: process.env.npm_package_version ?? '1.0.0' };

export function createApp(sequelize: Sequelize, config: AppConfig = defaultConfig): Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins.length ? config.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', async (_req, res) => {
    const startedAt = Date.now();
    try {
      await sequelize.authenticate();
      res.json({ status: 'ok', service: pkg.name, version: pkg.version, database: 'up', latencyMs: Date.now() - startedAt, timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded', service: pkg.name, version: pkg.version, database: 'down', timestamp: new Date().toISOString() });
    }
  });

  app.use('/api', apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
