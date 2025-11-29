import { PrismaClient, UserRole, AppointmentStatus, AppointmentSource, LoyaltyTier, LoyaltyTransactionType, CampaignType, CampaignStatus, MessageChannel, MessageStatus, TaskType, TaskStatus, AIContextType, InventoryCategory, GiftCardStatus, WaitlistStatus, PaymentStatus, PaymentMethod, ReviewPlatform, ServiceCategory } from '@prisma/client';
import { hash } from 'bcryptjs';
import { addDays, subDays, setHours, setMinutes, format } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.aIAuditLog.deleteMany();
  await prisma.review.deleteMany();
  await prisma.tip.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.giftCard.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.campaignMessage.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.task.deleteMany();
  await prisma.galleryPhoto.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.staffSchedule.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.salon.deleteMany();

  // Create Salon
  const salon = await prisma.salon.create({
    data: {
      name: 'Elegant Nails & Spa',
      address: '123 Main Street, Suite 100, San Jose, CA 95112',
      phone: '(408) 555-0123',
      email: 'info@elegantnails.com',
      timezone: 'America/Los_Angeles',
      primaryLanguage: 'en',
    },
  });
  console.log('Created salon:', salon.name);

  // Hash password for all users
  const hashedPassword = await hash('password123', 12);

  // Create Users
  const users = await Promise.all([
    // Owner
    prisma.user.create({
      data: {
        salonId: salon.id,
        name: 'Linda Nguyen',
        email: 'linda@elegantnails.com',
        hashedPassword,
        role: UserRole.OWNER,
        phone: '(408) 555-0100',
        preferredLanguage: 'vi',
      },
    }),
    // Manager
    prisma.user.create({
      data: {
        salonId: salon.id,
        name: 'Maria Garcia',
        email: 'maria@elegantnails.com',
        hashedPassword,
        role: UserRole.MANAGER,
        phone: '(408) 555-0101',
        preferredLanguage: 'es',
      },
    }),
    // Technicians
    prisma.user.create({
      data: {
        salonId: salon.id,
        name: 'Kim Tran',
        email: 'kim@elegantnails.com',
        hashedPassword,
        role: UserRole.TECHNICIAN,
        phone: '(408) 555-0102',
        preferredLanguage: 'vi',
      },
    }),
    prisma.user.create({
      data: {
        salonId: salon.id,
        name: 'Jenny Le',
        email: 'jenny@elegantnails.com',
        hashedPassword,
        role: UserRole.TECHNICIAN,
        phone: '(408) 555-0103',
        preferredLanguage: 'vi',
      },
    }),
    prisma.user.create({
      data: {
        salonId: salon.id,
        name: 'David Chen',
        email: 'david@elegantnails.com',
        hashedPassword,
        role: UserRole.TECHNICIAN,
        phone: '(408) 555-0104',
        preferredLanguage: 'zh',
      },
    }),
    prisma.user.create({
      data: {
        salonId: salon.id,
        name: 'Sarah Kim',
        email: 'sarah@elegantnails.com',
        hashedPassword,
        role: UserRole.TECHNICIAN,
        phone: '(408) 555-0105',
        preferredLanguage: 'ko',
      },
    }),
    // Front Desk
    prisma.user.create({
      data: {
        salonId: salon.id,
        name: 'Emily Wilson',
        email: 'emily@elegantnails.com',
        hashedPassword,
        role: UserRole.FRONTDESK,
        phone: '(408) 555-0106',
        preferredLanguage: 'en',
      },
    }),
  ]);
  console.log('Created', users.length, 'users');

  const technicians = users.filter(u => u.role === UserRole.TECHNICIAN);

  // Create Services (20+)
  const servicesData = [
    // Basic Manicures
    { name: 'Classic Manicure', description: 'Basic nail shaping, cuticle care, and polish', durationMinutes: 30, basePrice: 20, category: ServiceCategory.MANICURE },
    { name: 'French Manicure', description: 'Classic white-tip French style finish', durationMinutes: 40, basePrice: 30, category: ServiceCategory.MANICURE },
    { name: 'Deluxe Manicure', description: 'Includes hand massage and premium polish', durationMinutes: 45, basePrice: 35, category: ServiceCategory.MANICURE },
    { name: 'Express Manicure', description: 'Quick polish change and nail shaping', durationMinutes: 15, basePrice: 15, category: ServiceCategory.MANICURE },
    // Gel Services
    { name: 'Gel Manicure', description: 'Long-lasting gel polish application', durationMinutes: 45, basePrice: 40, category: ServiceCategory.GEL },
    { name: 'Gel French Manicure', description: 'French tips with gel polish', durationMinutes: 50, basePrice: 50, category: ServiceCategory.GEL },
    { name: 'Gel Removal', description: 'Safe removal of gel polish', durationMinutes: 15, basePrice: 10, category: ServiceCategory.GEL },
    { name: 'Gel Fill', description: 'Gel maintenance and fill service', durationMinutes: 40, basePrice: 35, category: ServiceCategory.GEL },
    // Acrylic Services
    { name: 'Full Set Acrylic', description: 'Complete acrylic nail application', durationMinutes: 75, basePrice: 55, category: ServiceCategory.ACRYLIC },
    { name: 'Acrylic Fill', description: 'Acrylic maintenance and fill', durationMinutes: 45, basePrice: 35, category: ServiceCategory.ACRYLIC },
    { name: 'Acrylic Removal', description: 'Safe acrylic nail removal', durationMinutes: 30, basePrice: 20, category: ServiceCategory.ACRYLIC },
    { name: 'Pink & White Full Set', description: 'Classic pink and white acrylic', durationMinutes: 90, basePrice: 75, category: ServiceCategory.ACRYLIC },
    // Pedicures
    { name: 'Classic Pedicure', description: 'Basic foot care with polish', durationMinutes: 45, basePrice: 35, category: ServiceCategory.PEDICURE },
    { name: 'Spa Pedicure', description: 'Includes mask, scrub, and hot towels', durationMinutes: 60, basePrice: 50, category: ServiceCategory.PEDICURE },
    { name: 'Deluxe Pedicure', description: 'Premium spa experience with paraffin', durationMinutes: 75, basePrice: 65, category: ServiceCategory.PEDICURE },
    { name: 'Gel Pedicure', description: 'Pedicure with gel polish finish', durationMinutes: 60, basePrice: 55, category: ServiceCategory.PEDICURE },
    // Nail Art
    { name: 'Basic Nail Art (per nail)', description: 'Simple designs and patterns', durationMinutes: 10, basePrice: 5, category: ServiceCategory.NAIL_ART },
    { name: 'Complex Nail Art (per nail)', description: '3D art, rhinestones, detailed designs', durationMinutes: 15, basePrice: 10, category: ServiceCategory.NAIL_ART },
    { name: 'Full Set Nail Art', description: 'Complete design on all nails', durationMinutes: 30, basePrice: 25, category: ServiceCategory.NAIL_ART },
    // Add-ons
    { name: 'Paraffin Treatment (Hands)', description: 'Moisturizing paraffin wax treatment', durationMinutes: 15, basePrice: 15, category: ServiceCategory.ADDON },
    { name: 'Paraffin Treatment (Feet)', description: 'Moisturizing paraffin wax for feet', durationMinutes: 15, basePrice: 15, category: ServiceCategory.ADDON },
    { name: 'Hot Stone Massage', description: 'Relaxing hot stone addition', durationMinutes: 20, basePrice: 20, category: ServiceCategory.ADDON },
    { name: 'Callus Removal', description: 'Professional callus treatment', durationMinutes: 15, basePrice: 15, category: ServiceCategory.ADDON },
    { name: 'Nail Repair (per nail)', description: 'Fix broken or damaged nails', durationMinutes: 10, basePrice: 8, category: ServiceCategory.ADDON },
    { name: 'Polish Change (Hands)', description: 'Quick polish change only', durationMinutes: 15, basePrice: 12, category: ServiceCategory.ADDON },
    { name: 'Polish Change (Feet)', description: 'Quick polish change for toes', durationMinutes: 15, basePrice: 15, category: ServiceCategory.ADDON },
    // Barbershop Services
    { name: "Men's Haircut", description: 'Classic men\'s haircut with styling', durationMinutes: 30, basePrice: 25, category: ServiceCategory.HAIRCUT },
    { name: "Kid's Haircut", description: 'Haircut for children under 12', durationMinutes: 20, basePrice: 18, category: ServiceCategory.HAIRCUT },
    { name: 'Beard Trim', description: 'Professional beard shaping and trim', durationMinutes: 15, basePrice: 15, category: ServiceCategory.BEARD },
    { name: 'Hot Towel Shave', description: 'Traditional hot towel straight razor shave', durationMinutes: 30, basePrice: 30, category: ServiceCategory.SHAVE },
    { name: 'Hair Coloring', description: 'Full hair color service', durationMinutes: 60, basePrice: 50, category: ServiceCategory.COLORING },
  ];

  const services = await Promise.all(
    servicesData.map(s =>
      prisma.service.create({
        data: { ...s, salonId: salon.id },
      })
    )
  );
  console.log('Created', services.length, 'services');

  // Create Clients (30+)
  const clientsData = [
    { name: 'Jessica Martinez', phone: '(408) 555-1001', email: 'jessica.m@email.com', preferredLanguage: 'es', birthday: new Date('1990-05-15') },
    { name: 'Amy Wong', phone: '(408) 555-1002', email: 'amy.wong@email.com', preferredLanguage: 'zh', birthday: new Date('1985-08-22') },
    { name: 'Thu Pham', phone: '(408) 555-1003', email: 'thu.pham@email.com', preferredLanguage: 'vi', birthday: new Date('1992-03-10') },
    { name: 'Jennifer Smith', phone: '(408) 555-1004', email: 'jen.smith@email.com', preferredLanguage: 'en', birthday: new Date('1988-11-30') },
    { name: 'Linh Vo', phone: '(408) 555-1005', email: 'linh.vo@email.com', preferredLanguage: 'vi', birthday: new Date('1995-07-18') },
    { name: 'Michelle Lee', phone: '(408) 555-1006', email: 'michelle.lee@email.com', preferredLanguage: 'ko', birthday: new Date('1991-02-28') },
    { name: 'Sandra Reyes', phone: '(408) 555-1007', email: 'sandra.r@email.com', preferredLanguage: 'es', birthday: new Date('1987-09-05') },
    { name: 'Tina Chen', phone: '(408) 555-1008', email: 'tina.chen@email.com', preferredLanguage: 'zh', birthday: new Date('1993-12-12') },
    { name: 'Hanh Nguyen', phone: '(408) 555-1009', email: 'hanh.n@email.com', preferredLanguage: 'vi', birthday: new Date('1989-04-25') },
    { name: 'Rachel Brown', phone: '(408) 555-1010', email: 'rachel.b@email.com', preferredLanguage: 'en', birthday: new Date('1994-06-08') },
    { name: 'Mai Tran', phone: '(408) 555-1011', email: 'mai.tran@email.com', preferredLanguage: 'vi', birthday: new Date('1986-01-17') },
    { name: 'Patricia Davis', phone: '(408) 555-1012', email: 'pat.davis@email.com', preferredLanguage: 'en', birthday: new Date('1982-10-03') },
    { name: 'Yuki Tanaka', phone: '(408) 555-1013', email: 'yuki.t@email.com', preferredLanguage: 'en', birthday: new Date('1990-08-14') },
    { name: 'Carmen Lopez', phone: '(408) 555-1014', email: 'carmen.l@email.com', preferredLanguage: 'es', birthday: new Date('1988-03-22') },
    { name: 'Huong Le', phone: '(408) 555-1015', email: 'huong.le@email.com', preferredLanguage: 'vi', birthday: new Date('1991-11-09') },
    { name: 'Grace Park', phone: '(408) 555-1016', email: 'grace.park@email.com', preferredLanguage: 'ko', birthday: new Date('1993-05-27') },
    { name: 'Diana Torres', phone: '(408) 555-1017', email: 'diana.t@email.com', preferredLanguage: 'es', birthday: new Date('1985-07-31') },
    { name: 'Wei Liu', phone: '(408) 555-1018', email: 'wei.liu@email.com', preferredLanguage: 'zh', birthday: new Date('1992-09-19') },
    { name: 'Lan Hoang', phone: '(408) 555-1019', email: 'lan.hoang@email.com', preferredLanguage: 'vi', birthday: new Date('1989-02-14') },
    { name: 'Ashley Johnson', phone: '(408) 555-1020', email: 'ashley.j@email.com', preferredLanguage: 'en', birthday: new Date('1996-12-01') },
    { name: 'Nga Bui', phone: '(408) 555-1021', email: 'nga.bui@email.com', preferredLanguage: 'vi', birthday: new Date('1984-06-16') },
    { name: 'Emily Thompson', phone: '(408) 555-1022', email: 'emily.t@email.com', preferredLanguage: 'en', birthday: new Date('1990-04-08') },
    { name: 'Rosa Hernandez', phone: '(408) 555-1023', email: 'rosa.h@email.com', preferredLanguage: 'es', birthday: new Date('1987-08-25') },
    { name: 'Mei Ling', phone: '(408) 555-1024', email: 'mei.ling@email.com', preferredLanguage: 'zh', birthday: new Date('1991-10-11') },
    { name: 'Thao Dang', phone: '(408) 555-1025', email: 'thao.d@email.com', preferredLanguage: 'vi', birthday: new Date('1988-01-29') },
    { name: 'Stephanie Clark', phone: '(408) 555-1026', email: 'steph.c@email.com', preferredLanguage: 'en', birthday: new Date('1993-03-17') },
    { name: 'Soo-Jin Kim', phone: '(408) 555-1027', email: 'soojin.k@email.com', preferredLanguage: 'ko', birthday: new Date('1989-07-04') },
    { name: 'Lucia Sanchez', phone: '(408) 555-1028', email: 'lucia.s@email.com', preferredLanguage: 'es', birthday: new Date('1986-11-21') },
    { name: 'Quynh Ly', phone: '(408) 555-1029', email: 'quynh.ly@email.com', preferredLanguage: 'vi', birthday: new Date('1994-05-13') },
    { name: 'Amber White', phone: '(408) 555-1030', email: 'amber.w@email.com', preferredLanguage: 'en', birthday: new Date('1992-09-07') },
    { name: 'Jade Huang', phone: '(408) 555-1031', email: 'jade.h@email.com', preferredLanguage: 'zh', birthday: new Date('1990-02-19') },
    { name: 'Diem Ngo', phone: '(408) 555-1032', email: 'diem.ngo@email.com', preferredLanguage: 'vi', birthday: new Date('1985-12-28') },
  ];

  const clients = await Promise.all(
    clientsData.map((c, i) =>
      prisma.client.create({
        data: {
          ...c,
          salonId: salon.id,
          preferredTechId: technicians[i % technicians.length].id,
          marketingOptIn: i % 5 !== 0, // 80% opt-in
          notes: i % 3 === 0 ? 'VIP customer - always prioritize' : null,
        },
      })
    )
  );
  console.log('Created', clients.length, 'clients');

  // Create Appointments (45+)
  const now = new Date();
  const appointments = [];
  const appointmentStatuses = [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.BOOKED,
    AppointmentStatus.CONFIRMED,
  ];

  for (let i = 0; i < 60; i++) {
    const daysOffset = Math.floor(i / 4) - 10; // Spread over past 10 days to future 5 days
    const hour = 9 + (i % 8); // Hours from 9 AM to 4 PM
    const client = clients[i % clients.length];
    const technician = technicians[i % technicians.length];
    const service = services[i % services.length];
    const startTime = setMinutes(setHours(addDays(now, daysOffset), hour), (i % 2) * 30);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60000);

    const status = daysOffset < 0
      ? appointmentStatuses[i % 5] // Past appointments: completed, no-show, cancelled
      : (i % 3 === 0 ? AppointmentStatus.CONFIRMED : AppointmentStatus.BOOKED); // Future: booked or confirmed

    const sources = [AppointmentSource.ONLINE, AppointmentSource.PHONE, AppointmentSource.WALKIN];

    appointments.push(
      await prisma.appointment.create({
        data: {
          salonId: salon.id,
          clientId: client.id,
          technicianId: technician.id,
          serviceId: service.id,
          startTime,
          endTime,
          status,
          source: sources[i % 3],
          notes: i % 5 === 0 ? 'Client prefers quiet environment' : null,
        },
      })
    );
  }
  console.log('Created', appointments.length, 'appointments');

  // Create Visits for completed appointments (25+)
  const completedAppts = appointments.filter(a => a.status === AppointmentStatus.COMPLETED);
  const nailShapes = ['Square', 'Round', 'Oval', 'Almond', 'Coffin', 'Stiletto', 'Squoval'];
  const lengths = ['Short', 'Medium', 'Long', 'Extra Long'];
  const designs = [
    'Solid color - classic red',
    'French tips with glitter accent',
    'Ombre pink to white',
    'Marble effect with gold flakes',
    'Floral design on accent nails',
    'Minimalist geometric patterns',
    'Chrome finish',
    'Matte black with rhinestones',
  ];

  const visits = await Promise.all(
    completedAppts.map((appt, i) =>
      prisma.visit.create({
        data: {
          appointmentId: appt.id,
          clientId: appt.clientId,
          technicianId: appt.technicianId,
          nailShape: nailShapes[i % nailShapes.length],
          length: lengths[i % lengths.length],
          designDescription: designs[i % designs.length],
          colorCodes: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
          rating: i % 4 === 0 ? null : Math.floor(Math.random() * 2) + 4, // Mostly 4-5 stars
        },
      })
    )
  );
  console.log('Created', visits.length, 'visits');

  // Create Loyalty Accounts (20+)
  const tiers = [LoyaltyTier.BRONZE, LoyaltyTier.SILVER, LoyaltyTier.GOLD, LoyaltyTier.PLATINUM];
  const loyaltyAccounts = await Promise.all(
    clients.slice(0, 25).map((client, i) =>
      prisma.loyaltyAccount.create({
        data: {
          salonId: salon.id,
          clientId: client.id,
          pointsBalance: Math.floor(Math.random() * 2000) + 100,
          tier: tiers[Math.floor(i / 7)],
        },
      })
    )
  );
  console.log('Created', loyaltyAccounts.length, 'loyalty accounts');

  // Create Loyalty Transactions (40+)
  const transactionTypes = [
    { type: LoyaltyTransactionType.EARN, points: 50, desc: 'Earned from Gel Manicure visit' },
    { type: LoyaltyTransactionType.EARN, points: 75, desc: 'Earned from Deluxe Pedicure visit' },
    { type: LoyaltyTransactionType.EARN, points: 100, desc: 'Bonus points for referral' },
    { type: LoyaltyTransactionType.REDEEM, points: -200, desc: 'Redeemed for $20 off service' },
    { type: LoyaltyTransactionType.EARN, points: 40, desc: 'Earned from Classic Manicure' },
    { type: LoyaltyTransactionType.ADJUST, points: 50, desc: 'Adjustment - Birthday bonus' },
  ];

  const transactions = [];
  for (let i = 0; i < 50; i++) {
    const account = loyaltyAccounts[i % loyaltyAccounts.length];
    const txType = transactionTypes[i % transactionTypes.length];
    transactions.push(
      await prisma.loyaltyTransaction.create({
        data: {
          loyaltyAccountId: account.id,
          type: txType.type,
          points: txType.points,
          description: txType.desc,
          createdAt: subDays(now, Math.floor(Math.random() * 60)),
        },
      })
    );
  }
  console.log('Created', transactions.length, 'loyalty transactions');

  // Create Staff Schedules (20+ rows)
  const schedules = [];
  for (const tech of technicians) {
    for (let day = 0; day < 7; day++) {
      // Most work Mon-Sat (1-6), some work Sunday (0)
      if (day === 0 && technicians.indexOf(tech) > 1) continue;

      schedules.push(
        await prisma.staffSchedule.create({
          data: {
            salonId: salon.id,
            technicianId: tech.id,
            dayOfWeek: day,
            startTime: day === 0 ? '10:00' : '09:00',
            endTime: day === 6 ? '18:00' : '19:00',
            isWorking: true,
          },
        })
      );
    }
  }
  console.log('Created', schedules.length, 'staff schedules');

  // Create Campaigns (15+)
  const campaignsData = [
    { name: '24-Hour Appointment Reminder', type: CampaignType.REMINDER, status: CampaignStatus.ACTIVE },
    { name: '2-Hour Appointment Reminder', type: CampaignType.REMINDER, status: CampaignStatus.ACTIVE },
    { name: 'No-Show Follow-Up', type: CampaignType.NO_SHOW_RECOVERY, status: CampaignStatus.ACTIVE },
    { name: 'We Miss You - 30 Day Inactive', type: CampaignType.NO_SHOW_RECOVERY, status: CampaignStatus.ACTIVE },
    { name: 'Birthday Special Offer', type: CampaignType.PROMO, status: CampaignStatus.ACTIVE },
    { name: 'Holiday Season Promotion', type: CampaignType.PROMO, status: CampaignStatus.PAUSED },
    { name: 'New Year Nail Art Special', type: CampaignType.PROMO, status: CampaignStatus.COMPLETED },
    { name: 'Points Expiring Reminder', type: CampaignType.LOYALTY, status: CampaignStatus.ACTIVE },
    { name: 'Tier Upgrade Notification', type: CampaignType.LOYALTY, status: CampaignStatus.ACTIVE },
    { name: 'Double Points Weekend', type: CampaignType.LOYALTY, status: CampaignStatus.PAUSED },
    { name: 'Referral Bonus Program', type: CampaignType.PROMO, status: CampaignStatus.ACTIVE },
    { name: 'Weekly Specials Newsletter', type: CampaignType.PROMO, status: CampaignStatus.ACTIVE },
    { name: 'VIP Early Access', type: CampaignType.LOYALTY, status: CampaignStatus.ACTIVE },
    { name: 'Feedback Request', type: CampaignType.REMINDER, status: CampaignStatus.ACTIVE },
    { name: 'Summer Nail Trends', type: CampaignType.PROMO, status: CampaignStatus.COMPLETED },
    { name: 'Spa Day Bundle', type: CampaignType.PROMO, status: CampaignStatus.ACTIVE },
  ];

  const campaigns = await Promise.all(
    campaignsData.map(c =>
      prisma.campaign.create({
        data: {
          ...c,
          salonId: salon.id,
          audienceQuery: { language: ['en', 'vi', 'es'], tier: ['GOLD', 'PLATINUM'] },
        },
      })
    )
  );
  console.log('Created', campaigns.length, 'campaigns');

  // Create Campaign Messages (30+)
  const messageStatuses = [MessageStatus.SENT, MessageStatus.SENT, MessageStatus.PENDING, MessageStatus.FAILED];
  const messages = [];
  for (let i = 0; i < 40; i++) {
    const campaign = campaigns[i % campaigns.length];
    const client = clients[i % clients.length];
    const status = messageStatuses[i % messageStatuses.length];

    messages.push(
      await prisma.campaignMessage.create({
        data: {
          campaignId: campaign.id,
          clientId: client.id,
          channel: i % 3 === 0 ? MessageChannel.EMAIL : MessageChannel.SMS,
          language: client.preferredLanguage,
          scheduledAt: addDays(now, i % 7 - 3),
          sentAt: status === MessageStatus.SENT ? subDays(now, Math.floor(Math.random() * 7)) : null,
          status,
          body: `Hello ${client.name}! ${campaign.name} - Special offer just for you!`,
        },
      })
    );
  }
  console.log('Created', messages.length, 'campaign messages');

  // Create Tasks (15+)
  const tasksData = [
    { title: 'Follow up with Jessica Martinez', type: TaskType.FOLLOW_UP, status: TaskStatus.OPEN },
    { title: 'Order gel polish supplies', type: TaskType.INVENTORY, status: TaskStatus.IN_PROGRESS },
    { title: 'Schedule staff meeting', type: TaskType.STAFFING, status: TaskStatus.OPEN },
    { title: 'Review no-show clients', type: TaskType.FOLLOW_UP, status: TaskStatus.OPEN },
    { title: 'Update holiday schedule', type: TaskType.STAFFING, status: TaskStatus.DONE },
    { title: 'Restock sanitization supplies', type: TaskType.INVENTORY, status: TaskStatus.OPEN },
    { title: 'Train new nail art techniques', type: TaskType.STAFFING, status: TaskStatus.IN_PROGRESS },
    { title: 'Contact VIP clients for feedback', type: TaskType.FOLLOW_UP, status: TaskStatus.OPEN },
    { title: 'Order new pedicure chairs', type: TaskType.INVENTORY, status: TaskStatus.CANCELLED },
    { title: 'Update service menu prices', type: TaskType.OTHER, status: TaskStatus.DONE },
    { title: 'Fix appointment booking system', type: TaskType.OTHER, status: TaskStatus.IN_PROGRESS },
    { title: 'Send birthday promotions', type: TaskType.FOLLOW_UP, status: TaskStatus.OPEN },
    { title: 'Clean UV lamps', type: TaskType.OTHER, status: TaskStatus.DONE },
    { title: 'Review monthly performance', type: TaskType.OTHER, status: TaskStatus.OPEN },
    { title: 'Interview new technician', type: TaskType.STAFFING, status: TaskStatus.OPEN },
    { title: 'Update Google Business hours', type: TaskType.OTHER, status: TaskStatus.DONE },
    { title: 'Reorder acrylic powder', type: TaskType.INVENTORY, status: TaskStatus.OPEN },
  ];

  const tasks = await Promise.all(
    tasksData.map((t, i) =>
      prisma.task.create({
        data: {
          ...t,
          salonId: salon.id,
          description: `Task details for: ${t.title}`,
          dueDate: addDays(now, i % 14 - 7),
          assignedToUserId: users[i % users.length].id,
        },
      })
    )
  );
  console.log('Created', tasks.length, 'tasks');

  // Create Inventory Items (25+)
  const inventoryData = [
    // Nail Polish
    { name: 'OPI Red Hot Rio', sku: 'OPI-RHR-001', category: InventoryCategory.NAIL_POLISH, quantity: 12, minQuantity: 5, costPrice: 5.50, retailPrice: 12.00, supplier: 'OPI Distribution' },
    { name: 'OPI Lincoln Park After Dark', sku: 'OPI-LPAD-002', category: InventoryCategory.NAIL_POLISH, quantity: 8, minQuantity: 5, costPrice: 5.50, retailPrice: 12.00, supplier: 'OPI Distribution' },
    { name: 'Essie Ballet Slippers', sku: 'ESS-BS-001', category: InventoryCategory.NAIL_POLISH, quantity: 15, minQuantity: 5, costPrice: 4.00, retailPrice: 10.00, supplier: 'Essie Pro' },
    { name: 'Essie Bordeaux', sku: 'ESS-BDX-002', category: InventoryCategory.NAIL_POLISH, quantity: 6, minQuantity: 5, costPrice: 4.00, retailPrice: 10.00, supplier: 'Essie Pro' },
    { name: 'CND Vinylux Top Coat', sku: 'CND-VTC-001', category: InventoryCategory.NAIL_POLISH, quantity: 20, minQuantity: 8, costPrice: 6.00, retailPrice: 14.00, supplier: 'CND Professional' },
    // Gel Products
    { name: 'Gelish Foundation Base Coat', sku: 'GEL-FBC-001', category: InventoryCategory.GEL, quantity: 10, minQuantity: 5, costPrice: 12.00, retailPrice: 25.00, supplier: 'Gelish Pro' },
    { name: 'Gelish Top It Off', sku: 'GEL-TIO-001', category: InventoryCategory.GEL, quantity: 8, minQuantity: 5, costPrice: 12.00, retailPrice: 25.00, supplier: 'Gelish Pro' },
    { name: 'OPI GelColor Red', sku: 'OPI-GCR-001', category: InventoryCategory.GEL, quantity: 4, minQuantity: 3, costPrice: 15.00, retailPrice: 28.00, supplier: 'OPI Distribution' },
    { name: 'CND Shellac Base Coat', sku: 'CND-SBC-001', category: InventoryCategory.GEL, quantity: 6, minQuantity: 4, costPrice: 14.00, retailPrice: 26.00, supplier: 'CND Professional' },
    { name: 'CND Shellac French Pink', sku: 'CND-SFP-001', category: InventoryCategory.GEL, quantity: 3, minQuantity: 4, costPrice: 14.00, retailPrice: 26.00, supplier: 'CND Professional' },
    // Acrylic Products
    { name: 'Acrylic Powder Clear', sku: 'ACR-PC-001', category: InventoryCategory.ACRYLIC, quantity: 5, minQuantity: 3, costPrice: 20.00, retailPrice: 40.00, supplier: 'Young Nails' },
    { name: 'Acrylic Powder Pink', sku: 'ACR-PP-001', category: InventoryCategory.ACRYLIC, quantity: 4, minQuantity: 3, costPrice: 20.00, retailPrice: 40.00, supplier: 'Young Nails' },
    { name: 'Acrylic Powder White', sku: 'ACR-PW-001', category: InventoryCategory.ACRYLIC, quantity: 3, minQuantity: 3, costPrice: 20.00, retailPrice: 40.00, supplier: 'Young Nails' },
    { name: 'Monomer Liquid', sku: 'ACR-ML-001', category: InventoryCategory.ACRYLIC, quantity: 2, minQuantity: 2, costPrice: 25.00, retailPrice: 45.00, supplier: 'Young Nails' },
    { name: 'Primer Acid Free', sku: 'ACR-PAF-001', category: InventoryCategory.ACRYLIC, quantity: 8, minQuantity: 4, costPrice: 10.00, retailPrice: 20.00, supplier: 'Young Nails' },
    // Tools
    { name: 'Nail File 100/180 Grit (Pack 50)', sku: 'TOOL-NF-001', category: InventoryCategory.TOOLS, quantity: 10, minQuantity: 5, costPrice: 15.00, retailPrice: 30.00, supplier: 'Beauty Supplies Inc' },
    { name: 'Cuticle Pusher', sku: 'TOOL-CP-001', category: InventoryCategory.TOOLS, quantity: 25, minQuantity: 10, costPrice: 3.00, retailPrice: 8.00, supplier: 'Beauty Supplies Inc' },
    { name: 'Nail Brush Set', sku: 'TOOL-NBS-001', category: InventoryCategory.TOOLS, quantity: 12, minQuantity: 5, costPrice: 8.00, retailPrice: 18.00, supplier: 'Beauty Supplies Inc' },
    { name: 'UV LED Lamp Bulb', sku: 'TOOL-UVB-001', category: InventoryCategory.TOOLS, quantity: 4, minQuantity: 2, costPrice: 25.00, retailPrice: 45.00, supplier: 'Tech Beauty Supply' },
    // Sanitization
    { name: 'Hand Sanitizer 1 Gallon', sku: 'SAN-HS-001', category: InventoryCategory.SANITIZATION, quantity: 6, minQuantity: 3, costPrice: 15.00, retailPrice: 25.00, supplier: 'CleanPro Supplies' },
    { name: 'Disinfectant Spray', sku: 'SAN-DS-001', category: InventoryCategory.SANITIZATION, quantity: 8, minQuantity: 4, costPrice: 8.00, retailPrice: 15.00, supplier: 'CleanPro Supplies' },
    { name: 'Barbicide Solution', sku: 'SAN-BS-001', category: InventoryCategory.SANITIZATION, quantity: 5, minQuantity: 3, costPrice: 12.00, retailPrice: 22.00, supplier: 'Barbicide Inc' },
    // Disposables
    { name: 'Disposable Gloves (Box 100)', sku: 'DISP-GL-001', category: InventoryCategory.DISPOSABLES, quantity: 15, minQuantity: 8, costPrice: 8.00, retailPrice: 15.00, supplier: 'MedSupply Co' },
    { name: 'Disposable Towels (Pack 50)', sku: 'DISP-TW-001', category: InventoryCategory.DISPOSABLES, quantity: 20, minQuantity: 10, costPrice: 10.00, retailPrice: 18.00, supplier: 'MedSupply Co' },
    { name: 'Cotton Pads (Pack 500)', sku: 'DISP-CP-001', category: InventoryCategory.DISPOSABLES, quantity: 12, minQuantity: 5, costPrice: 5.00, retailPrice: 10.00, supplier: 'MedSupply Co' },
    { name: 'Toe Separators (Pack 100)', sku: 'DISP-TS-001', category: InventoryCategory.DISPOSABLES, quantity: 8, minQuantity: 4, costPrice: 6.00, retailPrice: 12.00, supplier: 'Beauty Supplies Inc' },
  ];

  const inventoryItems = await Promise.all(
    inventoryData.map(item =>
      prisma.inventoryItem.create({
        data: { ...item, salonId: salon.id },
      })
    )
  );
  console.log('Created', inventoryItems.length, 'inventory items');

  // Create Gallery Photos (15+)
  const galleryData = [
    { title: 'Elegant French Tips', description: 'Classic French manicure with a modern twist', tags: ['French Tips', 'Gel Nails', 'Almond'], featured: true, imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800' },
    { title: 'Rose Gold Chrome', description: 'Stunning rose gold chrome finish', tags: ['Chrome', 'Gel Nails', 'Coffin'], featured: true, imageUrl: 'https://images.unsplash.com/photo-1610992015732-2449b0dd2b3f?w=800' },
    { title: 'Floral Nail Art', description: 'Hand-painted spring flowers', tags: ['Nail Art', 'Gel Nails', 'Almond'], featured: true, imageUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800' },
    { title: 'Matte Black Beauty', description: 'Sleek matte black with gold accents', tags: ['Matte', 'Nail Art', 'Stiletto'], featured: false, imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800' },
    { title: 'Ombre Pink Perfection', description: 'Soft pink to white ombre gradient', tags: ['Ombre', 'Gel Nails', 'Square'], featured: true, imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800' },
    { title: 'Glitter Party Nails', description: 'Sparkly glitter for special occasions', tags: ['Glitter', 'Acrylic', 'Coffin'], featured: false, imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800' },
    { title: 'Minimalist Lines', description: 'Clean geometric line art design', tags: ['Nail Art', 'Gel Nails', 'Almond'], featured: false, imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800' },
    { title: 'Classic Red Glamour', description: 'Timeless red nail polish', tags: ['Gel Nails', 'Square'], featured: false, imageUrl: 'https://images.unsplash.com/photo-1610992015732-2449b0dd2b3f?w=800' },
    { title: 'Marble Magic', description: 'Beautiful marble effect design', tags: ['Nail Art', 'Gel Nails', 'Coffin'], featured: true, imageUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800' },
    { title: 'Summer Citrus', description: 'Bright orange and yellow summer vibes', tags: ['Nail Art', 'Gel Nails', 'Square'], featured: false, imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800' },
    { title: 'Holographic Dreams', description: 'Mesmerizing holographic effect', tags: ['Chrome', 'Gel Nails', 'Stiletto'], featured: true, imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800' },
    { title: 'Natural Nude', description: 'Soft nude tones for everyday elegance', tags: ['Gel Nails', 'Almond'], featured: false, imageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800' },
    { title: 'Butterfly Wings', description: 'Delicate butterfly wing nail art', tags: ['Nail Art', 'Acrylic', 'Coffin'], featured: false, imageUrl: 'https://images.unsplash.com/photo-1610992015732-2449b0dd2b3f?w=800' },
    { title: 'Winter Wonderland', description: 'Snowy white with silver glitter', tags: ['Glitter', 'Gel Nails', 'Almond'], featured: false, imageUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800' },
    { title: 'Geometric Patterns', description: 'Bold geometric shapes and colors', tags: ['Nail Art', 'Gel Nails', 'Square'], featured: false, imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800' },
  ];

  const galleryPhotos = await Promise.all(
    galleryData.map((photo, i) =>
      prisma.galleryPhoto.create({
        data: {
          ...photo,
          salonId: salon.id,
          technicianId: technicians[i % technicians.length].id,
        },
      })
    )
  );
  console.log('Created', galleryPhotos.length, 'gallery photos');

  // Create Gift Cards (10+)
  const giftCardsData = [
    { code: 'GIFT-001-2024', initialValue: 50, balance: 50, purchasedBy: 'John Smith', status: GiftCardStatus.ACTIVE },
    { code: 'GIFT-002-2024', initialValue: 100, balance: 75, purchasedBy: 'Jane Doe', status: GiftCardStatus.ACTIVE },
    { code: 'GIFT-003-2024', initialValue: 25, balance: 0, purchasedBy: 'Mike Johnson', status: GiftCardStatus.USED },
    { code: 'GIFT-004-2024', initialValue: 75, balance: 75, purchasedBy: 'Sarah Wilson', status: GiftCardStatus.ACTIVE },
    { code: 'GIFT-005-2024', initialValue: 150, balance: 100, purchasedBy: 'Emily Brown', status: GiftCardStatus.ACTIVE },
    { code: 'GIFT-006-2024', initialValue: 50, balance: 50, purchasedBy: 'David Lee', status: GiftCardStatus.EXPIRED, expiresAt: subDays(now, 30) },
    { code: 'GIFT-007-2024', initialValue: 200, balance: 200, purchasedBy: 'Lisa Chen', status: GiftCardStatus.ACTIVE },
    { code: 'GIFT-008-2024', initialValue: 100, balance: 0, purchasedBy: 'Tom Miller', status: GiftCardStatus.USED },
    { code: 'GIFT-009-2024', initialValue: 75, balance: 25, purchasedBy: 'Amy Taylor', status: GiftCardStatus.ACTIVE },
    { code: 'GIFT-010-2024', initialValue: 50, balance: 50, purchasedBy: 'Chris Davis', status: GiftCardStatus.CANCELLED },
  ];

  const giftCards = await Promise.all(
    giftCardsData.map((gc, i) =>
      prisma.giftCard.create({
        data: {
          ...gc,
          salonId: salon.id,
          recipientId: i < clients.length ? clients[i].id : null,
          expiresAt: gc.expiresAt || addDays(now, 365),
        },
      })
    )
  );
  console.log('Created', giftCards.length, 'gift cards');

  // Create Waitlist entries (8+)
  const waitlistData = [
    { clientName: 'Walk-in Customer 1', clientPhone: '(408) 555-9001', partySize: 1, status: WaitlistStatus.WAITING, estimatedWait: 15 },
    { clientName: 'Walk-in Customer 2', clientPhone: '(408) 555-9002', partySize: 2, status: WaitlistStatus.WAITING, estimatedWait: 30 },
    { clientName: 'Walk-in Customer 3', clientPhone: '(408) 555-9003', partySize: 1, status: WaitlistStatus.NOTIFIED, estimatedWait: 5 },
    { clientName: 'Walk-in Customer 4', clientPhone: '(408) 555-9004', partySize: 1, status: WaitlistStatus.SEATED, estimatedWait: 0 },
    { clientName: 'Walk-in Customer 5', clientPhone: '(408) 555-9005', partySize: 3, status: WaitlistStatus.LEFT, estimatedWait: 45 },
    { clientName: 'Walk-in Customer 6', clientPhone: '(408) 555-9006', partySize: 1, status: WaitlistStatus.CANCELLED, estimatedWait: 20 },
    { clientName: 'Walk-in Customer 7', clientPhone: '(408) 555-9007', partySize: 2, status: WaitlistStatus.WAITING, estimatedWait: 25 },
    { clientName: 'Walk-in Customer 8', clientPhone: '(408) 555-9008', partySize: 1, status: WaitlistStatus.WAITING, estimatedWait: 35 },
  ];

  const waitlistEntries = await Promise.all(
    waitlistData.map((w, i) =>
      prisma.waitlist.create({
        data: {
          ...w,
          salonId: salon.id,
          clientId: i < 3 ? clients[i].id : null,
          serviceId: services[i % services.length].id,
          notes: i % 2 === 0 ? 'Prefers quiet area' : null,
        },
      })
    )
  );
  console.log('Created', waitlistEntries.length, 'waitlist entries');

  // Create Payments (20+)
  const paymentsData = [];
  for (let i = 0; i < completedAppts.length && i < 25; i++) {
    const appt = completedAppts[i];
    const service = services.find(s => s.id === appt.serviceId);
    paymentsData.push({
      salonId: salon.id,
      appointmentId: appt.id,
      clientId: appt.clientId,
      amount: service?.basePrice || 50,
      method: [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.CARD, PaymentMethod.CARD][i % 4],
      status: PaymentStatus.COMPLETED,
    });
  }

  const payments = await Promise.all(
    paymentsData.map(p => prisma.payment.create({ data: p }))
  );
  console.log('Created', payments.length, 'payments');

  // Create Tips (15+)
  const tipsData = [];
  for (let i = 0; i < completedAppts.length && i < 20; i++) {
    // Only add tips for appointments that don't already have one
    if (i % 4 !== 3) { // Skip some appointments to simulate no-tip scenarios
      tipsData.push({
        salonId: salon.id,
        appointmentId: completedAppts[i].id,
        technicianId: completedAppts[i].technicianId,
        amount: [5, 8, 10, 15, 20][i % 5],
        method: [PaymentMethod.CASH, PaymentMethod.CARD][i % 2],
      });
    }
  }

  const tips = await Promise.all(
    tipsData.map(t => prisma.tip.create({ data: t }))
  );
  console.log('Created', tips.length, 'tips');

  // Create Reviews (15+)
  const reviewContents = [
    'Amazing service! My nails look absolutely gorgeous. Will definitely be back!',
    'Great experience. The staff was friendly and professional.',
    'Love this place! Kim did an amazing job on my gel nails.',
    'Quick and efficient service. Very happy with the results.',
    'Best nail salon in the area! Highly recommend.',
    'Nice atmosphere and skilled technicians.',
    'Good service but a bit pricey.',
    'Jenny is the best! She always knows exactly what I want.',
    'Clean salon with great attention to detail.',
    'Perfect French manicure every time!',
    null, // Some reviews without content
    'Excellent spa pedicure. So relaxing!',
    null,
    'David did an incredible job with my nail art.',
    'Friendly staff and beautiful results.',
  ];

  const reviews = [];
  for (let i = 0; i < 15; i++) {
    const appt = completedAppts[i % completedAppts.length];
    reviews.push(
      await prisma.review.create({
        data: {
          salonId: salon.id,
          clientId: appt.clientId,
          appointmentId: appt.id,
          platform: [ReviewPlatform.INTERNAL, ReviewPlatform.GOOGLE, ReviewPlatform.YELP, ReviewPlatform.INTERNAL][i % 4],
          rating: i < 12 ? [5, 5, 4, 5, 5, 4, 3, 5, 5, 4, 5, 4][i % 12] : 5,
          content: reviewContents[i] || null,
          response: i < 5 ? 'Thank you so much for your kind words! We appreciate your feedback and look forward to seeing you again soon!' : null,
          respondedAt: i < 5 ? subDays(now, i) : null,
          reviewDate: subDays(now, i * 3),
        },
      })
    );
  }
  console.log('Created', reviews.length, 'reviews');

  // Create AI Audit Logs
  const auditLogs = await Promise.all([
    prisma.aIAuditLog.create({
      data: {
        salonId: salon.id,
        clientId: clients[0].id,
        contextType: AIContextType.REMINDER,
        inputSummary: 'Generated appointment reminder for Jessica Martinez - Gel Manicure',
        outputSummary: 'Reminder sent in Spanish: Hola Jessica! Recordatorio de tu cita...',
      },
    }),
    prisma.aIAuditLog.create({
      data: {
        salonId: salon.id,
        contextType: AIContextType.KPI,
        inputSummary: 'Monthly KPI analysis request',
        outputSummary: 'Analysis complete: No-show rate improved by 5%, loyalty engagement up 12%',
      },
    }),
    prisma.aIAuditLog.create({
      data: {
        salonId: salon.id,
        clientId: clients[2].id,
        contextType: AIContextType.LOYALTY,
        inputSummary: 'Generated loyalty message for Thu Pham',
        outputSummary: 'Message in Vietnamese: Chào Thu! Bạn có 500 điểm...',
      },
    }),
  ]);
  console.log('Created', auditLogs.length, 'AI audit logs');

  // ============================================================
  // SECOND SALON: Glamour Nails - Downtown Location
  // ============================================================
  console.log('\n--- Creating Second Salon: Glamour Nails Downtown ---');

  const salon2 = await prisma.salon.create({
    data: {
      name: 'Glamour Nails Downtown',
      address: '456 Market Street, Suite 200, San Francisco, CA 94102',
      phone: '(415) 555-0200',
      email: 'info@glamournails.com',
      timezone: 'America/Los_Angeles',
      primaryLanguage: 'en',
    },
  });
  console.log('Created salon:', salon2.name);

  // Create Users for Salon 2
  const users2 = await Promise.all([
    // Owner (same owner can own multiple salons)
    prisma.user.create({
      data: {
        salonId: salon2.id,
        name: 'Linda Nguyen',
        email: 'linda+glamour@elegantnails.com',
        hashedPassword,
        role: UserRole.OWNER,
        phone: '(415) 555-0200',
        preferredLanguage: 'vi',
      },
    }),
    // Manager
    prisma.user.create({
      data: {
        salonId: salon2.id,
        name: 'Michelle Chen',
        email: 'michelle@glamournails.com',
        hashedPassword,
        role: UserRole.MANAGER,
        phone: '(415) 555-0201',
        preferredLanguage: 'zh',
      },
    }),
    // Technicians
    prisma.user.create({
      data: {
        salonId: salon2.id,
        name: 'Amy Wong',
        email: 'amy@glamournails.com',
        hashedPassword,
        role: UserRole.TECHNICIAN,
        phone: '(415) 555-0202',
        preferredLanguage: 'zh',
      },
    }),
    prisma.user.create({
      data: {
        salonId: salon2.id,
        name: 'Lisa Park',
        email: 'lisa@glamournails.com',
        hashedPassword,
        role: UserRole.TECHNICIAN,
        phone: '(415) 555-0203',
        preferredLanguage: 'ko',
      },
    }),
    prisma.user.create({
      data: {
        salonId: salon2.id,
        name: 'Nancy Tran',
        email: 'nancy@glamournails.com',
        hashedPassword,
        role: UserRole.TECHNICIAN,
        phone: '(415) 555-0204',
        preferredLanguage: 'vi',
      },
    }),
    // Front Desk
    prisma.user.create({
      data: {
        salonId: salon2.id,
        name: 'Rachel Adams',
        email: 'rachel@glamournails.com',
        hashedPassword,
        role: UserRole.FRONTDESK,
        phone: '(415) 555-0205',
        preferredLanguage: 'en',
      },
    }),
  ]);
  console.log('Created', users2.length, 'users for Salon 2');

  const technicians2 = users2.filter(u => u.role === UserRole.TECHNICIAN);

  // Services for Salon 2 (Premium urban pricing)
  const servicesData2 = [
    // Basic Manicures
    { name: 'Classic Manicure', description: 'Basic nail shaping, cuticle care, and polish', durationMinutes: 30, basePrice: 25, category: ServiceCategory.MANICURE },
    { name: 'French Manicure', description: 'Classic white-tip French style finish', durationMinutes: 40, basePrice: 35, category: ServiceCategory.MANICURE },
    { name: 'Signature Manicure', description: 'Includes hand massage, paraffin, and premium polish', durationMinutes: 50, basePrice: 45, category: ServiceCategory.MANICURE },
    // Gel Services
    { name: 'Gel Manicure', description: 'Long-lasting gel polish application', durationMinutes: 45, basePrice: 45, category: ServiceCategory.GEL },
    { name: 'Gel French Manicure', description: 'French tips with gel polish', durationMinutes: 55, basePrice: 55, category: ServiceCategory.GEL },
    { name: 'Builder Gel Overlay', description: 'Strengthening gel overlay on natural nails', durationMinutes: 60, basePrice: 60, category: ServiceCategory.GEL },
    // Acrylic Services
    { name: 'Full Set Acrylic', description: 'Complete acrylic nail application', durationMinutes: 75, basePrice: 65, category: ServiceCategory.ACRYLIC },
    { name: 'Acrylic Fill', description: 'Acrylic maintenance and fill', durationMinutes: 45, basePrice: 40, category: ServiceCategory.ACRYLIC },
    { name: 'Acrylic with Design', description: 'Full set with custom nail art', durationMinutes: 90, basePrice: 85, category: ServiceCategory.ACRYLIC },
    // Pedicures
    { name: 'Classic Pedicure', description: 'Basic pedicure with polish', durationMinutes: 45, basePrice: 35, category: ServiceCategory.PEDICURE },
    { name: 'Spa Pedicure', description: 'Luxurious spa treatment with mask and massage', durationMinutes: 60, basePrice: 55, category: ServiceCategory.PEDICURE },
    { name: 'Gel Pedicure', description: 'Pedicure with long-lasting gel polish', durationMinutes: 55, basePrice: 50, category: ServiceCategory.PEDICURE },
    // Specialty Services
    { name: 'Nail Art (per nail)', description: 'Custom hand-painted designs', durationMinutes: 15, basePrice: 8, category: ServiceCategory.NAIL_ART },
    { name: 'Chrome/Mirror Nails', description: 'Trendy chrome powder finish', durationMinutes: 20, basePrice: 15, category: ServiceCategory.NAIL_ART },
    { name: 'Dip Powder Full Set', description: 'Durable dip powder application', durationMinutes: 60, basePrice: 55, category: ServiceCategory.ACRYLIC },
    { name: 'Nail Repair (per nail)', description: 'Fix broken or damaged nails', durationMinutes: 15, basePrice: 8, category: ServiceCategory.ADDON },
  ];

  const services2 = await Promise.all(
    servicesData2.map(s => prisma.service.create({ data: { salonId: salon2.id, ...s } }))
  );
  console.log('Created', services2.length, 'services for Salon 2');

  // Clients for Salon 2 (20 clients)
  const clientsData2 = [
    { name: 'Sophia Rodriguez', phone: '(415) 600-0001', email: 'sophia.r@email.com', preferredLanguage: 'es' },
    { name: 'Emma Thompson', phone: '(415) 600-0002', email: 'emma.t@email.com', preferredLanguage: 'en' },
    { name: 'Olivia Martinez', phone: '(415) 600-0003', email: 'olivia.m@email.com', preferredLanguage: 'es' },
    { name: 'Ava Williams', phone: '(415) 600-0004', email: 'ava.w@email.com', preferredLanguage: 'en' },
    { name: 'Isabella Johnson', phone: '(415) 600-0005', email: 'isabella.j@email.com', preferredLanguage: 'en' },
    { name: 'Mia Brown', phone: '(415) 600-0006', email: 'mia.b@email.com', preferredLanguage: 'en' },
    { name: 'Charlotte Davis', phone: '(415) 600-0007', email: 'charlotte.d@email.com', preferredLanguage: 'en' },
    { name: 'Amelia Garcia', phone: '(415) 600-0008', email: 'amelia.g@email.com', preferredLanguage: 'es' },
    { name: 'Harper Lee', phone: '(415) 600-0009', email: 'harper.l@email.com', preferredLanguage: 'en' },
    { name: 'Evelyn Kim', phone: '(415) 600-0010', email: 'evelyn.k@email.com', preferredLanguage: 'ko' },
    { name: 'Luna Chen', phone: '(415) 600-0011', email: 'luna.c@email.com', preferredLanguage: 'zh' },
    { name: 'Chloe Wilson', phone: '(415) 600-0012', email: 'chloe.w@email.com', preferredLanguage: 'en' },
    { name: 'Penelope Moore', phone: '(415) 600-0013', email: 'penelope.m@email.com', preferredLanguage: 'en' },
    { name: 'Layla Taylor', phone: '(415) 600-0014', email: 'layla.t@email.com', preferredLanguage: 'en' },
    { name: 'Riley Anderson', phone: '(415) 600-0015', email: 'riley.a@email.com', preferredLanguage: 'en' },
    { name: 'Zoey Thomas', phone: '(415) 600-0016', email: 'zoey.t@email.com', preferredLanguage: 'en' },
    { name: 'Nora Jackson', phone: '(415) 600-0017', email: 'nora.j@email.com', preferredLanguage: 'en' },
    { name: 'Lily White', phone: '(415) 600-0018', email: 'lily.w@email.com', preferredLanguage: 'en' },
    { name: 'Eleanor Harris', phone: '(415) 600-0019', email: 'eleanor.h@email.com', preferredLanguage: 'en' },
    { name: 'Hannah Martin', phone: '(415) 600-0020', email: 'hannah.m@email.com', preferredLanguage: 'en' },
  ];

  const clients2 = await Promise.all(
    clientsData2.map((c, i) => prisma.client.create({
      data: {
        salonId: salon2.id,
        ...c,
        birthday: new Date(1985 + (i % 20), i % 12, (i % 28) + 1),
        preferredTechId: technicians2[i % technicians2.length].id,
        marketingOptIn: i % 4 !== 0,
        notes: i % 5 === 0 ? 'VIP client - always request Amy' : null,
      },
    }))
  );
  console.log('Created', clients2.length, 'clients for Salon 2');

  // Create Staff Schedules for Salon 2
  for (const tech of technicians2) {
    for (let day = 1; day <= 6; day++) { // Mon-Sat
      await prisma.staffSchedule.create({
        data: {
          salonId: salon2.id,
          technicianId: tech.id,
          dayOfWeek: day,
          startTime: day === 6 ? '10:00' : '09:00',
          endTime: day === 6 ? '18:00' : '19:00',
          isWorking: true,
        },
      });
    }
  }
  console.log('Created staff schedules for Salon 2');

  // Create Appointments for Salon 2 (30 appointments)
  const appointments2 = [];
  for (let i = 0; i < 30; i++) {
    const daysOffset = i < 15 ? -(i * 2) : (i - 15) * 2; // Past and future
    const hour = 9 + (i % 8);
    const status = i < 12 ? AppointmentStatus.COMPLETED :
                   i < 20 ? AppointmentStatus.CONFIRMED :
                   i < 25 ? AppointmentStatus.BOOKED :
                   i === 25 ? AppointmentStatus.NO_SHOW : AppointmentStatus.CANCELLED;

    appointments2.push(
      await prisma.appointment.create({
        data: {
          salonId: salon2.id,
          clientId: clients2[i % clients2.length].id,
          technicianId: technicians2[i % technicians2.length].id,
          serviceId: services2[i % services2.length].id,
          startTime: setMinutes(setHours(addDays(now, daysOffset), hour), 0),
          endTime: setMinutes(setHours(addDays(now, daysOffset), hour + 1), 0),
          status,
          source: [AppointmentSource.ONLINE, AppointmentSource.PHONE, AppointmentSource.WALKIN][i % 3],
          notes: i % 6 === 0 ? 'Prefers natural look' : null,
        },
      })
    );
  }
  console.log('Created', appointments2.length, 'appointments for Salon 2');

  // Create Loyalty Accounts for Salon 2
  for (let i = 0; i < clients2.length; i++) {
    const pointsBalance = [150, 350, 600, 1200, 50, 200, 800, 100, 450, 900][i % 10];
    await prisma.loyaltyAccount.create({
      data: {
        salonId: salon2.id,
        clientId: clients2[i].id,
        pointsBalance,
        tier: pointsBalance >= 1000 ? LoyaltyTier.PLATINUM :
              pointsBalance >= 500 ? LoyaltyTier.GOLD :
              pointsBalance >= 200 ? LoyaltyTier.SILVER : LoyaltyTier.BRONZE,
      },
    });
  }
  console.log('Created loyalty accounts for Salon 2');

  // Create Gift Cards for Salon 2
  const giftCards2 = await Promise.all([
    prisma.giftCard.create({
      data: {
        salonId: salon2.id,
        code: 'GLAM-100-001',
        initialValue: 100,
        balance: 100,
        status: GiftCardStatus.ACTIVE,
        expiresAt: addDays(now, 365),
      },
    }),
    prisma.giftCard.create({
      data: {
        salonId: salon2.id,
        code: 'GLAM-50-002',
        initialValue: 50,
        balance: 25,
        status: GiftCardStatus.ACTIVE,
        purchasedBy: clients2[0].id,
        expiresAt: addDays(now, 365),
      },
    }),
    prisma.giftCard.create({
      data: {
        salonId: salon2.id,
        code: 'GLAM-75-003',
        initialValue: 75,
        balance: 0,
        status: GiftCardStatus.USED,
        purchasedBy: clients2[1].id,
      },
    }),
  ]);
  console.log('Created', giftCards2.length, 'gift cards for Salon 2');

  // Create Reviews for Salon 2
  const completedAppts2 = appointments2.filter(a => a.status === AppointmentStatus.COMPLETED);
  for (let i = 0; i < Math.min(8, completedAppts2.length); i++) {
    await prisma.review.create({
      data: {
        salonId: salon2.id,
        clientId: completedAppts2[i].clientId,
        appointmentId: completedAppts2[i].id,
        platform: [ReviewPlatform.GOOGLE, ReviewPlatform.YELP, ReviewPlatform.INTERNAL][i % 3],
        rating: [5, 5, 4, 5, 4, 5, 5, 4][i],
        content: [
          'Love this place! Best nail salon in downtown SF!',
          'Amy is amazing! My nails look perfect.',
          'Great service, friendly staff, clean salon.',
          'Beautiful nail art, very skilled technicians.',
          'Quick and efficient, exactly what I needed.',
          'Lisa did an incredible job on my gel manicure!',
          'Premium experience, worth every penny.',
          'My go-to salon for special occasions.',
        ][i],
        reviewDate: subDays(now, i * 4),
      },
    });
  }
  console.log('Created reviews for Salon 2');

  // Create Inventory for Salon 2
  const inventoryData2 = [
    { name: 'OPI GelColor Base Coat', category: InventoryCategory.GEL, sku: 'OPI-GC-BASE', quantity: 15, minQuantity: 5, costPrice: 12, retailPrice: 0 },
    { name: 'OPI GelColor Top Coat', category: InventoryCategory.GEL, sku: 'OPI-GC-TOP', quantity: 12, minQuantity: 5, costPrice: 12, retailPrice: 0 },
    { name: 'Essie Nail Polish Set', category: InventoryCategory.NAIL_POLISH, sku: 'ESS-SET-01', quantity: 25, minQuantity: 10, costPrice: 8, retailPrice: 12 },
    { name: 'Acrylic Powder Clear', category: InventoryCategory.ACRYLIC, sku: 'ACR-CLR-LG', quantity: 8, minQuantity: 3, costPrice: 25, retailPrice: 0 },
    { name: 'Nail Files 180 Grit', category: InventoryCategory.TOOLS, sku: 'FILE-180', quantity: 100, minQuantity: 30, costPrice: 0.50, retailPrice: 0 },
    { name: 'Cuticle Oil', category: InventoryCategory.NAIL_POLISH, sku: 'CUT-OIL-01', quantity: 20, minQuantity: 8, costPrice: 5, retailPrice: 12 },
    { name: 'Hand Sanitizer Gallon', category: InventoryCategory.SANITIZATION, sku: 'SAN-GAL-01', quantity: 6, minQuantity: 2, costPrice: 15, retailPrice: 0 },
    { name: 'Chrome Powder Set', category: InventoryCategory.GEL, sku: 'CHR-PWD-SET', quantity: 10, minQuantity: 4, costPrice: 18, retailPrice: 0 },
  ];

  await Promise.all(
    inventoryData2.map(item => prisma.inventoryItem.create({ data: { salonId: salon2.id, ...item } }))
  );
  console.log('Created inventory for Salon 2');

  console.log('\n✅ Seeding completed successfully!');
  console.log('\n=== SALON 1: Elegant Nails & Spa (San Jose) ===');
  console.log('Owner: linda@elegantnails.com / password123');
  console.log('Manager: maria@elegantnails.com / password123');
  console.log('Technician: kim@elegantnails.com / password123');
  console.log('Front Desk: emily@elegantnails.com / password123');
  console.log('\n=== SALON 2: Glamour Nails Downtown (San Francisco) ===');
  console.log('Owner: linda+glamour@elegantnails.com / password123');
  console.log('Manager: michelle@glamournails.com / password123');
  console.log('Technician: amy@glamournails.com / password123');
  console.log('Front Desk: rachel@glamournails.com / password123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
