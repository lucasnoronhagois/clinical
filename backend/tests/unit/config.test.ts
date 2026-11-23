import { loadConfig } from '../../src/config/env';

describe('loadConfig', () => {
  it('exige JWT_SECRET fora do ambiente de testes', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });

  it('usa um segredo padrão apenas em testes', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).jwtSecret).toBe('test-only-secret');
  });

  it('rejeita dialeto de banco não suportado', () => {
    expect(() => loadConfig({ JWT_SECRET: 'x', DB_DIALECT: 'oracle' })).toThrow(/DB_DIALECT/);
  });

  it('interpreta lista de origens CORS e valores padrão', () => {
    const config = loadConfig({ JWT_SECRET: 'x', CORS_ORIGIN: 'http://a.test, http://b.test ,' });
    expect(config.corsOrigins).toEqual(['http://a.test', 'http://b.test']);
    expect(config.port).toBe(3000);
    expect(config.db).toMatchObject({ dialect: 'mysql', host: 'localhost', port: 3306, name: 'clinicalcare' });
  });
});
