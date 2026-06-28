require('dotenv').config();

const bcrypt = require('bcrypt');
const {
  sequelize,
  Company,
  CompanyCredential,
  CompanyRole,
  Lead,
  Pipeline,
  PipelineStage,
  Source,
  SubscriptionPlan,
  CompanySubscription,
} = require('../models');
const { seedDefaultRoles, MEMBER_SLUG } = require('../services/companyRbacService');
const { seedDefaultPipelines } = require('../services/pipelineService');
const { seedDefaultSources } = require('../services/sourceService');
const { createLead } = require('../services/leadService');
const { isDevEnvMode } = require('../utils/helpers');
const { getAccountsFeatureKeys } = require('../constants/accountsModules');
const { DUMMY_PASSWORD, DUMMY_ACCOUNTS } = require('./dummyAccounts');
const { ACME_DUMMY_LEADS } = require('./dummyLeads');

const ACCOUNTS_FEATURE_KEYS = getAccountsFeatureKeys();

const DUMMY_PLANS = [
  {
    name: 'Starter',
    description: 'For small teams getting started',
    maxUsers: 5,
    maxContacts: 100,
    maxDeals: 25,
    maxStorageMb: 512,
    features: ['user_management', 'access_demo', 'crm_setup', 'leads', 'project_management', 'media_library', ...ACCOUNTS_FEATURE_KEYS],
  },
  {
    name: 'Professional',
    description: 'For growing teams with full RBAC',
    maxUsers: 25,
    maxContacts: 1000,
    maxDeals: 250,
    maxStorageMb: 4096,
    features: ['user_management', 'role_management', 'access_demo', 'crm_setup', 'leads', 'project_management', 'media_library', ...ACCOUNTS_FEATURE_KEYS],
  },
];

const DUMMY_COMPANY_MEMBERS = [
  {
    companyName: 'Acme Corp',
    name: 'Charlie Employee',
    email: DUMMY_ACCOUNTS.companyMemberEmail,
  },
  {
    companyName: 'Globex Inc',
    name: 'Dana Employee',
    email: DUMMY_ACCOUNTS.globexMemberEmail,
  },
];

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
    email: DUMMY_ACCOUNTS.globexAdminEmail,
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

async function resolveLeadReferences(companyId, leadData) {
  let pipelineId = null;
  let stageId = null;
  const sourceIds = [];

  if (leadData.pipelineName) {
    const pipeline = await Pipeline.findOne({
      where: { companyId, name: leadData.pipelineName, isActive: true },
    });
    if (pipeline) {
      pipelineId = pipeline.id;

      if (leadData.stageName) {
        const stage = await PipelineStage.findOne({
          where: {
            pipelineId: pipeline.id,
            name: leadData.stageName,
            stageType: 'lead',
            isActive: true,
          },
        });
        if (stage) {
          stageId = stage.id;
        }
      }
    }
  }

  if (leadData.sourceSlugs?.length) {
    const sources = await Source.findAll({
      where: { companyId, slug: leadData.sourceSlugs, isActive: true },
    });
    sourceIds.push(...sources.map((source) => source.id));
  }

  return { pipelineId, stageId, sourceIds };
}

async function seedAcmeLeads() {
  const company = await Company.findOne({ where: { name: 'Acme Corp' } });
  if (!company) {
    return { skipped: true, reason: 'company not found', created: 0 };
  }

  const alice = await CompanyCredential.findOne({
    where: {
      companyId: company.id,
      email: DUMMY_ACCOUNTS.companyAdminEmail.toLowerCase(),
    },
  });
  if (!alice) {
    return { skipped: true, reason: 'assignee not found', created: 0 };
  }

  let created = 0;

  for (const leadData of ACME_DUMMY_LEADS) {
    const normalizedEmail = leadData.email.toLowerCase();
    const existing = await Lead.findOne({
      where: { companyId: company.id, email: normalizedEmail },
    });
    if (existing) {
      continue;
    }

    const { pipelineId, stageId, sourceIds } = await resolveLeadReferences(company.id, leadData);

    await createLead(company.id, {
      customerName: leadData.customerName,
      email: normalizedEmail,
      subject: leadData.subject,
      assigneeId: alice.id,
      phone: leadData.phone,
      followUpDate: leadData.followUpDate,
      score: leadData.score,
      quality: leadData.quality,
      pipelineId,
      stageId,
      sourceIds,
      notes: leadData.notes,
    });
    created += 1;
  }

  return { skipped: created === 0, created };
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

  let membersCreated = 0;
  for (const memberData of DUMMY_COMPANY_MEMBERS) {
    const { skipped: memberSkipped } = await seedCompanyMember(memberData);
    if (memberSkipped) {
      console.log(`   ℹ️  Company member ${memberData.email} already exists; skipped.`);
    } else {
      membersCreated += 1;
      console.log(`   ✅ Created company member (login: ${memberData.email} / ${DUMMY_PASSWORD})`);
    }
  }

  const { created: leadsCreated } = await seedAcmeLeads();
  if (leadsCreated > 0) {
    console.log(`   ✅ Created ${leadsCreated} lead(s) for Acme Corp (assignee: Alice Admin)`);
  } else {
    console.log('   ℹ️  Acme Corp dummy leads already exist; skipped.');
  }

  if (companiesCreated === 0 && newPlans === 0 && membersCreated === 0 && leadsCreated === 0) {
    console.log('   ℹ️  Dummy data already present; nothing to seed.');
  } else {
    console.log('🌱 Dummy data seed complete.');
  }
}

module.exports = {
  seedDummyData,
  seedAcmeLeads,
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
