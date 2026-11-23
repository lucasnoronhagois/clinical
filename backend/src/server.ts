import { createApp } from './app';
import { config } from './config/env';
import { createSequelize } from './config/sequelize';

async function bootstrap(): Promise<void> {
  const sequelize = createSequelize(config);

  try {
    await sequelize.authenticate();
  } catch (error) {
    console.error('[clinicalcare-api] Não foi possível conectar ao banco de dados:', (error as Error).message);
    process.exit(1);
  }

  if (config.db.dialect === 'sqlite') {
    await sequelize.sync();
  }

  const app = createApp(sequelize, config);
  const server = app.listen(config.port, () => {
    console.log(`[clinicalcare-api] Rodando em http://localhost:${config.port} (${config.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[clinicalcare-api] ${signal} recebido, encerrando...`);
    server.close(() => {
      void sequelize.close().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

void bootstrap();
