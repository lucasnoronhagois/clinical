import { Sequelize } from 'sequelize';
import { AppConfig, config as defaultConfig } from './env';
import { loadModels } from './database';

export function createSequelize(config: AppConfig = defaultConfig): Sequelize {
  const { db } = config;

  const sequelize =
    db.dialect === 'sqlite'
      ? new Sequelize({ dialect: 'sqlite', storage: db.storage, logging: db.logging })
      : new Sequelize(db.name, db.user, db.password, {
          host: db.host,
          port: db.port,
          dialect: db.dialect === 'mariadb' ? 'mysql' : db.dialect,
          logging: db.logging ? console.log : false,
          timezone: '+00:00',
        });

  loadModels(sequelize);
  return sequelize;
}
