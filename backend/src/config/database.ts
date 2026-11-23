import { Sequelize } from 'sequelize';
import * as Models from '../models/index';

type ModelRegistry = Record<string, { associate?: (models: ModelRegistry) => void }>;

export const loadModels = (sequelize: Sequelize): ModelRegistry => {
  const models: ModelRegistry = {};

  Object.entries(Models).forEach(([modelName, ModelClass]) => {
    models[modelName] = ModelClass.load(sequelize) as unknown as ModelRegistry[string];
  });

  Object.values(models).forEach((model) => {
    model.associate?.(models);
  });

  return models;
};
