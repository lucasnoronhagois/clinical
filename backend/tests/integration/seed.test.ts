import { seedDemoData } from '../../src/seeders/seed';
import { Patient, User } from '../../src/models';
import { FIXED_NOW, setupTestApp, TestContext } from '../helpers';

describe('seed de demonstração', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await ctx.sequelize.close();
  });

  it('não duplica dados quando executado novamente', async () => {
    const log = jest.fn();
    const result = await seedDemoData(ctx.sequelize, { log });
    expect(result).toEqual({ skipped: true });
    expect(log).toHaveBeenCalled();
    expect(await User.count()).toBe(10);
  });

  it('recria os dados com --reset', async () => {
    await Patient.update({ name: 'Alterado' }, { where: { id: 1 } });
    const result = await seedDemoData(ctx.sequelize, { reset: true, now: FIXED_NOW });
    expect(result).toMatchObject({ skipped: false, companies: 2, users: 10, patients: 58, attendances: 300 });
    expect(await Patient.count({ where: { name: 'Alterado' } })).toBe(0);
  });
});
