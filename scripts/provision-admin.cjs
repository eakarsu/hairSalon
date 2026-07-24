/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') throw new Error('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required');
  const email = String(process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.PROVISION_ADMIN_PASSWORD || '');
  const name = String(process.env.PROVISION_ADMIN_NAME || '').trim();
  if (!email.includes('@') || password.length < 12 || !name) throw new Error('Valid PROVISION_ADMIN_* environment is required');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { console.log(JSON.stringify({ event: 'initial_admin_exists' })); return; }
  const salon = await prisma.salon.create({
    data: {
      name: process.env.PROVISION_COMPANY_NAME || `${name} Salon`,
      address: 'Runtime acceptance fixture',
      phone: '000-000-0000',
      email,
    },
  });
  const user = await prisma.user.create({
    data: {
      salonId: salon.id,
      name,
      email,
      hashedPassword: await hash(password, 12),
      role: 'OWNER',
      active: true,
      emailVerified: true,
    },
  });
  console.log(JSON.stringify({ event: 'initial_admin_created', userId: user.id, salonId: salon.id }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
