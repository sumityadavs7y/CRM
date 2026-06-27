require('dotenv').config();

const bcrypt = require('bcrypt');
const {
  sequelize,
  Company,
  CompanyCredential,
  CompanyRole,
  SubscriptionPlan,
  CompanySubscription,
} = require('../models');
const { seedDefaultRoles, MEMBER_SLUG } = require('../services/companyRbacService');
const { seedDefaultPipelines } = require('../services/pipelineService');
const { seedDefaultSources } = require('../services/sourceService');
const { isDevEnvMode } = require('../utils/helpers');
const { DUMMY_PASSWORD, DUMMY_ACCOUNTS } = require('./dummyAccounts');

const DUMMY_PLANS = [
  {
    name: 'Starter',
    description: 'For small teams getting started',
    maxUsers: 5,
    maxContacts: 100,
    maxDeals: 25,
    maxStorageMb: 512,
    features: ['user_management', 'access_demo', 'crm_setup'],
  },
  {
    name: 'Professional',
    description: 'For growing teams with full RBAC',
    maxUsers: 25,
    maxContacts: 1000,
    maxDeals: 250,
    maxStorageMb: 4096,
    features: ['user_management', 'role_management', 'access_demo', 'crm_setup'],
  },
];

const DUMMY_COMPANY_MEMBER = {
  companyName: 'Acme Corp',
  name: 'Charlie Employee',
  email: DUMMY_ACCOUNTS.companyMemberEmail,
};

const DUMMY_COMPANIES = [
  {
    name: 'Acme Corp',
    adminName: 'Alice Admin',
    email: DUMMY_ACCOUNTS.companyAdminEmail,
    planName: 'Starter',
  },
  {
    name: 'Globex Inc',
    adminName: 'Bob Manager',
    email: 'admin@globex.example.com',
    planName: 'Professional',
  },
];

function subscriptionWindow() {
  const startsAt = new Date();
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  return { startsAt, expiresAt };
}

async function seedPlans() {
  const created = [];

  for (const planData of DUMMY_PLANS) {
    const [plan, wasCreated] = await SubscriptionPlan.findOrCreate({
      where: { name: planData.name },
      defaults: planData,
    });

    if (!wasCreated) {
      await plan.update({
        description: planData.description,
        maxUsers: planData.maxUsers,
        maxContacts: planData.maxContacts,
        maxDeals: planData.maxDeals,
        maxStorageMb: planData.maxStorageMb,
        features: planData.features,
      });
    }

    created.push({ plan, wasCreated });
  }

  return created;
}

async function seedCompany(companyData, plansByName) {
  const normalizedEmail = companyData.email.toLowerCase();
  const existingCredential = await CompanyCredential.findOne({
    where: { email: normalizedEmail },
  });
  if (existingCredential) {
    return { company: null, skipped: true };
  }

  const passwordHash = await bcrypt.hash(DUMMY_PASSWORD, 10);
  const plan = plansByName.get(companyData.planName);

  const company = await sequelize.transaction(async (transaction) => {
    const createdCompany = await Company.create(
      { name: companyData.name },
      { transaction },
    );
    const { adminRole } = await seedDefaultRoles(createdCompany.id, transaction);
    await seedDefaultPipelines(createdCompany.id, transaction);
    await seedDefaultSources(createdCompany.id, transaction);

    await CompanyCredential.create(
      {
        companyId: createdCompany.id,
        companyRoleId: adminRole.id,
        adminName: companyData.adminName,
        email: normalizedEmail,
        password: passwordHash,
      },
      { transaction },
    );

    if (plan) {
      const { startsAt, expiresAt } = subscriptionWindow();
      await CompanySubscription.create(
        {
          companyId: createdCompany.id,
          subscriptionPlanId: plan.id,
          startsAt,
          expiresAt,
          isActive: true,
        },
        { transaction },
      );
    }

    return createdCompany;
  });

  return { company, skipped: false };
}

async function seedCompanyMember(memberData) {
  const normalizedEmail = memberData.email.toLowerCase();
  const existingCredential = await CompanyCredential.findOne({
    where: { email: normalizedEmail },
  });
  if (existingCredential) {
    return { skipped: true };
  }

  const company = await Company.findOne({ where: { name: memberData.companyName } });
  if (!company) {
    return { skipped: true, reason: 'company not found' };
  }

  const memberRole = await CompanyRole.findOne({
    where: { companyId: company.id, slug: MEMBER_SLUG, isActive: true },
  });
  if (!memberRole) {
    return { skipped: true, reason: 'member role not found' };
  }

  const passwordHash = await bcrypt.hash(DUMMY_PASSWORD, 10);
  await CompanyCredential.create({
    companyId: company.id,
    companyRoleId: memberRole.id,
    adminName: memberData.name,
    email: normalizedEmail,
    password: passwordHash,
  });

  return { skipped: false };
}

async function seedDummyData() {
  if (!isDevEnvMode()) {
    console.log('⚠️  Skipping dummy data seed (ENV_MODE is not development).');
    return;
  }

  console.log('🌱 Seeding development dummy data...');

  const planResults = await seedPlans();
  const plansByName = new Map(
    planResults.map(({ plan }) => [plan.name, plan]),
  );

  const newPlans = planResults.filter(({ wasCreated }) => wasCreated).length;
  if (newPlans > 0) {
    console.log(`   ✅ Created ${newPlans} subscription plan(s)`);
  } else {
    console.log('   ℹ️  Subscription plans already exist; skipped.');
  }

  let companiesCreated = 0;
  for (const companyData of DUMMY_COMPANIES) {
    const { company, skipped } = await seedCompany(companyData, plansByName);
    if (skipped) {
      console.log(`   ℹ️  Company credential ${companyData.email} already exists; skipped.`);
      const existingCompany = await Company.findOne({ where: { name: companyData.name } });
      if (existingCompany) {
        await seedDefaultPipelines(existingCompany.id);
        await seedDefaultSources(existingCompany.id);
      }
      continue;
    }
    companiesCreated += 1;
    console.log(`   ✅ Created company "${company.name}" (login: ${companyData.email} / ${DUMMY_PASSWORD})`);
  }

  const { skipped: memberSkipped } = await seedCompanyMember(DUMMY_COMPANY_MEMBER);
  if (memberSkipped) {
    console.log(`   ℹ️  Company member ${DUMMY_COMPANY_MEMBER.email} already exists; skipped.`);
  } else {
    console.log(`   ✅ Created company member (login: ${DUMMY_COMPANY_MEMBER.email} / ${DUMMY_PASSWORD})`);
  }

  if (companiesCreated === 0 && newPlans === 0 && memberSkipped) {
    console.log('   ℹ️  Dummy data already present; nothing to seed.');
  } else {
    console.log('🌱 Dummy data seed complete.');
  }
}

module.exports = {
  seedDummyData,
};

if (require.main === module) {
  const { testConnection } = require('../models');
  const { runMigrations } = require('../utils/migrate');

  (async () => {
    try {
      await testConnection();
      await runMigrations();
      await seedDummyData();
      process.exit(0);
    } catch (error) {
      console.error('❌ Dummy data seed failed:', error);
      process.exit(1);
    }
  })();
}
