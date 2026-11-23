'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adicionar GUEST ao ENUM de roles
    await queryInterface.sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('DOCTOR', 'RECEPTIONIST', 'GUEST') NOT NULL
    `);
  },

  async down (queryInterface, Sequelize) {
    // Remover GUEST do ENUM (cuidado: isso pode falhar se houver usuários GUEST)
    await queryInterface.sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('DOCTOR', 'RECEPTIONIST') NOT NULL
    `);
  }
};
