const {
  sequelize,
  Company,
  CompanyCredential,
  Project,
  ProjectPhase,
  ProjectBlock,
  ProjectFloor,
  ProjectUnit,
  Budget,
  BudgetItem,
  BudgetExpense,
} = require('../models');
const { DUMMY_ACCOUNTS } = require('./dummyAccounts');

const ACME_COMPANY_NAME = 'Acme Corp';
const SEED_MARKER_SLUG = 'green-valley-township';

async function findAcmeContext() {
  const company = await Company.findOne({ where: { name: ACME_COMPANY_NAME } });
  if (!company) {
    return null;
  }

  const adminCredential = await CompanyCredential.findOne({
    where: { companyId: company.id, email: DUMMY_ACCOUNTS.companyAdminEmail.toLowerCase() },
  });

  return {
    companyId: company.id,
    credentialId: adminCredential?.id || null,
  };
}

async function seedAlreadyPresent(companyId) {
  const existing = await Project.findOne({
    where: { companyId, slug: SEED_MARKER_SLUG },
  });
  return Boolean(existing);
}

async function createBudgetTree(budgetId, items, credentialId, transaction, parentId = null) {
  let sortOrder = 0;
  for (const itemData of items) {
    const item = await BudgetItem.create({
      budgetId,
      parentId,
      name: itemData.name,
      expectedAmount: itemData.expectedAmount ?? null,
      description: itemData.description || null,
      sortOrder: sortOrder++,
    }, { transaction });

    for (const expenseData of itemData.expenses || []) {
      await BudgetExpense.create({
        budgetItemId: item.id,
        amount: expenseData.amount,
        expenseDate: expenseData.expenseDate,
        description: expenseData.description || null,
        notes: expenseData.notes || null,
        createdByCredentialId: credentialId,
      }, { transaction });
    }

    if (itemData.children?.length) {
      await createBudgetTree(budgetId, itemData.children, credentialId, transaction, item.id);
    }
  }
}

async function createBudget(companyId, projectId, scope, phaseId, items, credentialId, transaction) {
  const budget = await Budget.create({
    companyId,
    projectId,
    scope,
    phaseId: phaseId || null,
    currency: 'INR',
    notes: null,
  }, { transaction });

  await createBudgetTree(budget.id, items, credentialId, transaction);
  return budget;
}

async function createFloorsWithUnits(block, floorSpecs, transaction) {
  for (const spec of floorSpecs) {
    const floor = await ProjectFloor.create({
      blockId: block.id,
      label: spec.label,
      floorNumber: spec.floorNumber,
      sortOrder: spec.floorNumber,
    }, { transaction });

    let unitIndex = 1;
    for (const unitSpec of spec.units) {
      await ProjectUnit.create({
        floorId: floor.id,
        unitNumber: unitSpec.unitNumber || `${spec.floorNumber}${String(unitIndex).padStart(2, '0')}`,
        unitType: unitSpec.unitType || '2bhk',
        carpetAreaSqft: unitSpec.carpetAreaSqft || 850,
        superBuiltUpAreaSqft: unitSpec.superBuiltUpAreaSqft || 1100,
        facing: unitSpec.facing || 'north',
        basePrice: unitSpec.basePrice || 5500000,
        status: unitSpec.status || 'available',
      }, { transaction });
      unitIndex += 1;
    }
  }
}

async function createBlock(projectId, blockData, transaction) {
  const block = await ProjectBlock.create({
    projectId,
    phaseId: blockData.phaseId || null,
    name: blockData.name,
    slug: blockData.slug,
    totalFloors: blockData.totalFloors || blockData.floors?.length || null,
    sortOrder: blockData.sortOrder || 0,
  }, { transaction });

  if (blockData.floors?.length) {
    await createFloorsWithUnits(block, blockData.floors, transaction);
  }

  return block;
}

const LAND_EXPENSES = [
  { amount: 45000000, expenseDate: '2024-03-15', description: 'Initial land parcel — Phase 1' },
  { amount: 28000000, expenseDate: '2024-08-20', description: 'Adjacent plot acquisition' },
  { amount: 12000000, expenseDate: '2025-01-10', description: 'Land registration & stamp duty' },
];

const OFFICE_BUDGET_CHILDREN = [
  {
    name: 'Office rent',
    expectedAmount: 600000,
    expenses: [
      { amount: 50000, expenseDate: '2025-01-05', description: 'January rent' },
      { amount: 50000, expenseDate: '2025-02-05', description: 'February rent' },
      { amount: 50000, expenseDate: '2025-03-05', description: 'March rent' },
      { amount: 50000, expenseDate: '2025-04-05', description: 'April rent' },
    ],
  },
  {
    name: 'Refreshments',
    expenses: [
      { amount: 15000, expenseDate: '2025-01-12', description: 'Site team refreshments' },
      { amount: 22000, expenseDate: '2025-02-18', description: 'Client visit catering' },
      { amount: 18000, expenseDate: '2025-03-08', description: 'Monthly pantry stock' },
      { amount: 12000, expenseDate: '2025-04-02', description: 'Team lunch' },
    ],
  },
  {
    name: 'Stationery & supplies',
    expectedAmount: 80000,
    expenses: [
      { amount: 12500, expenseDate: '2025-01-20', description: 'Printer cartridges & paper' },
      { amount: 8900, expenseDate: '2025-03-15', description: 'Site office supplies' },
    ],
  },
];

const CONSTRUCTION_BUDGET = {
  name: 'Construction & civil works',
  expectedAmount: 85000000,
  expenses: [
    { amount: 12000000, expenseDate: '2024-11-01', description: 'Foundation work — Tower A' },
    { amount: 18500000, expenseDate: '2025-02-15', description: 'Structural work — Tower A (G+8)' },
    { amount: 9500000, expenseDate: '2025-04-01', description: 'Plumbing & electrical rough-in' },
  ],
  children: [
    {
      name: 'Labour contractor payments',
      expectedAmount: 25000000,
      expenses: [
        { amount: 5000000, expenseDate: '2025-01-30', description: 'Milestone 1 payout' },
        { amount: 4200000, expenseDate: '2025-03-30', description: 'Milestone 2 payout' },
      ],
    },
    {
      name: 'Raw materials',
      expectedAmount: 18000000,
      expenses: [
        { amount: 3500000, expenseDate: '2025-02-10', description: 'Cement & steel batch 1' },
        { amount: 2800000, expenseDate: '2025-03-22', description: 'Cement & steel batch 2' },
      ],
    },
  ],
};

function residentialFloorUnits(floorNumber, prefix, basePrice) {
  return [
    { unitNumber: `${prefix}-${floorNumber}01`, unitType: '2bhk', facing: 'east', basePrice, status: 'available' },
    { unitNumber: `${prefix}-${floorNumber}02`, unitType: '2bhk', facing: 'west', basePrice, status: 'booked' },
    { unitNumber: `${prefix}-${floorNumber}03`, unitType: '3bhk', facing: 'north', basePrice: basePrice + 800000, status: 'available' },
    { unitNumber: `${prefix}-${floorNumber}04`, unitType: '3bhk', facing: 'south', basePrice: basePrice + 800000, status: 'sold' },
  ];
}

function buildTowerFloors(prefix, count, startFloor, basePrice) {
  const floors = [];
  for (let i = 0; i < count; i += 1) {
    const floorNumber = startFloor + i;
    floors.push({
      label: floorNumber === 0 ? 'Ground Floor' : `Floor ${floorNumber}`,
      floorNumber,
      units: residentialFloorUnits(floorNumber, prefix, basePrice + (floorNumber * 50000)),
    });
  }
  return floors;
}

async function seedAcmeCorpProjectDemo() {
  const context = await findAcmeContext();
  if (!context) {
    console.log('   ℹ️  Acme Corp not found; skipping project demo seed.');
    return { skipped: true, reason: 'company' };
  }

  if (await seedAlreadyPresent(context.companyId)) {
    console.log('   ℹ️  Acme Corp project demo data already present; skipped.');
    return { skipped: true, reason: 'exists' };
  }

  const { companyId, credentialId } = context;

  await sequelize.transaction(async (transaction) => {
    const greenValley = await Project.create({
      companyId,
      name: 'Green Valley Township',
      slug: SEED_MARKER_SLUG,
      projectType: 'residential',
      status: 'under_construction',
      description: 'Large integrated township with multiple phases, club house, and retail.',
      addressLine1: 'Survey No. 142/1, Hinjawadi Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411057',
      totalLandAreaSqft: 1850000,
      launchDate: '2024-01-15',
      possessionDate: '2028-06-30',
      expectedStartDate: '2024-02-01',
      expectedEndDate: '2028-12-31',
      expectedProfits: 125000000,
      isActive: true,
    }, { transaction });

    const phase1 = await ProjectPhase.create({
      projectId: greenValley.id,
      name: 'Phase 1 — North Vista',
      slug: 'phase-1-north-vista',
      status: 'under_construction',
      launchDate: '2024-03-01',
      possessionDate: '2027-03-31',
      sortOrder: 0,
    }, { transaction });

    const phase2 = await ProjectPhase.create({
      projectId: greenValley.id,
      name: 'Phase 2 — South Gardens',
      slug: 'phase-2-south-gardens',
      status: 'planning',
      launchDate: '2025-06-01',
      possessionDate: '2028-06-30',
      sortOrder: 1,
    }, { transaction });

    const phase3 = await ProjectPhase.create({
      projectId: greenValley.id,
      name: 'Phase 3 — Club & Amenities',
      slug: 'phase-3-club-amenities',
      status: 'planning',
      launchDate: '2025-09-01',
      possessionDate: '2028-12-31',
      sortOrder: 2,
    }, { transaction });

    await createBlock(greenValley.id, {
      phaseId: phase1.id,
      name: 'Tower A — North',
      slug: 'tower-a-north',
      sortOrder: 0,
      floors: buildTowerFloors('TA', 10, 0, 6200000),
    }, transaction);

    await createBlock(greenValley.id, {
      phaseId: phase1.id,
      name: 'Tower B — North',
      slug: 'tower-b-north',
      sortOrder: 1,
      floors: buildTowerFloors('TB', 8, 0, 5800000),
    }, transaction);

    await createBlock(greenValley.id, {
      phaseId: phase2.id,
      name: 'Tower C — South',
      slug: 'tower-c-south',
      sortOrder: 0,
      floors: buildTowerFloors('TC', 12, 0, 6500000),
    }, transaction);

    await createBlock(greenValley.id, {
      phaseId: phase3.id,
      name: 'Club House',
      slug: 'club-house',
      sortOrder: 0,
      floors: [{
        label: 'Ground Floor',
        floorNumber: 0,
        units: [
          { unitNumber: 'CLUB-01', unitType: 'penthouse', carpetAreaSqft: 5000, basePrice: 0, status: 'available' },
        ],
      }],
    }, transaction);

    await createBlock(greenValley.id, {
      name: 'Retail Plaza',
      slug: 'retail-plaza',
      sortOrder: 0,
      floors: [{
        label: 'Ground Floor',
        floorNumber: 0,
        units: [
          { unitNumber: 'R-101', unitType: 'shop', carpetAreaSqft: 450, basePrice: 3500000, status: 'available' },
          { unitNumber: 'R-102', unitType: 'shop', carpetAreaSqft: 380, basePrice: 2900000, status: 'booked' },
          { unitNumber: 'R-103', unitType: 'shop', carpetAreaSqft: 520, basePrice: 4100000, status: 'available' },
        ],
      }, {
        label: 'First Floor',
        floorNumber: 1,
        units: [
          { unitNumber: 'R-201', unitType: 'shop', carpetAreaSqft: 400, basePrice: 2800000, status: 'available' },
          { unitNumber: 'R-202', unitType: 'shop', carpetAreaSqft: 360, basePrice: 2500000, status: 'sold' },
        ],
      }],
    }, transaction);

    await createBudget(companyId, greenValley.id, 'project', null, [
      {
        name: 'Master planning & approvals',
        expectedAmount: 5000000,
        expenses: [
          { amount: 2200000, expenseDate: '2024-01-20', description: 'Architect & consultant fees' },
          { amount: 850000, expenseDate: '2024-04-10', description: 'RERA registration' },
        ],
      },
      {
        name: 'Marketing & launch',
        expectedAmount: 8000000,
        expenses: [
          { amount: 1500000, expenseDate: '2024-02-01', description: 'Launch event' },
          { amount: 2300000, expenseDate: '2024-06-15', description: 'Digital & print campaign Q2' },
        ],
      },
      {
        name: 'Corporate overheads (project)',
        expectedAmount: 3000000,
        children: OFFICE_BUDGET_CHILDREN,
      },
    ], credentialId, transaction);

    await createBudget(companyId, greenValley.id, 'phase', phase1.id, [
      {
        name: 'Acquiring land — Phase 1',
        expectedAmount: 95000000,
        expenses: LAND_EXPENSES,
      },
      CONSTRUCTION_BUDGET,
      {
        name: 'Office expense — Phase 1 site',
        expectedAmount: 2500000,
        children: OFFICE_BUDGET_CHILDREN,
      },
    ], credentialId, transaction);

    await createBudget(companyId, greenValley.id, 'phase', phase2.id, [
      {
        name: 'Land acquisition — Phase 2',
        expectedAmount: 72000000,
        expenses: [
          { amount: 35000000, expenseDate: '2025-01-15', description: 'Land booking amount' },
          { amount: 8000000, expenseDate: '2025-03-01', description: 'Legal & due diligence' },
        ],
      },
      {
        name: 'Pre-construction',
        expectedAmount: 12000000,
        expenses: [
          { amount: 2500000, expenseDate: '2025-02-20', description: 'Soil testing & surveys' },
        ],
      },
    ], credentialId, transaction);

    await createBudget(companyId, greenValley.id, 'phase', phase3.id, [
      {
        name: 'Club & amenities development',
        expectedAmount: 15000000,
        expenses: [
          { amount: 1200000, expenseDate: '2025-01-10', description: 'Landscape design consultancy' },
        ],
      },
      {
        name: 'Swimming pool & gym',
        expectedAmount: 4500000,
        children: [
          {
            name: 'Pool construction',
            expectedAmount: 2800000,
            expenses: [{ amount: 450000, expenseDate: '2025-02-01', description: 'Design advance' }],
          },
          {
            name: 'Gym equipment',
            expectedAmount: 1200000,
            expenses: [],
          },
        ],
      },
    ], credentialId, transaction);

    await createBudget(companyId, greenValley.id, 'default', null, [
      {
        name: 'Retail plaza fit-out',
        expectedAmount: 3500000,
        expenses: [
          { amount: 800000, expenseDate: '2025-03-10', description: 'Common area flooring' },
          { amount: 450000, expenseDate: '2025-04-05', description: 'Signage & branding' },
        ],
      },
    ], credentialId, transaction);

    const sunriseHeights = await Project.create({
      companyId,
      name: 'Sunrise Heights',
      slug: 'sunrise-heights',
      projectType: 'residential',
      status: 'ready_to_move',
      description: 'Premium single-tower residential project in western Mumbai.',
      addressLine1: 'Plot 18, Linking Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      totalLandAreaSqft: 45000,
      launchDate: '2022-04-01',
      possessionDate: '2025-03-31',
      expectedStartDate: '2022-05-01',
      expectedEndDate: '2025-06-30',
      expectedProfits: 42000000,
      isActive: true,
    }, { transaction });

    await createBlock(sunriseHeights.id, {
      name: 'Sunrise Tower',
      slug: 'sunrise-tower',
      floors: buildTowerFloors('SH', 15, 0, 12500000),
    }, transaction);

    await createBudget(companyId, sunriseHeights.id, 'project', null, [
      {
        name: 'Tower construction',
        expectedAmount: 95000000,
        expenses: [
          { amount: 85000000, expenseDate: '2024-12-01', description: 'Final construction settlement' },
        ],
      },
      {
        name: 'Finishing & handover',
        expectedAmount: 8000000,
        expenses: [
          { amount: 3200000, expenseDate: '2025-01-15', description: 'Interior finishing' },
          { amount: 1100000, expenseDate: '2025-02-28', description: 'OC & compliance' },
        ],
      },
    ], credentialId, transaction);

    await createBudget(companyId, sunriseHeights.id, 'default', null, [
      {
        name: 'Building maintenance (pre-handover)',
        expectedAmount: 1500000,
        expenses: [
          { amount: 125000, expenseDate: '2025-03-01', description: 'Lift AMC' },
          { amount: 85000, expenseDate: '2025-03-15', description: 'Housekeeping' },
        ],
      },
    ], credentialId, transaction);

    const metroTrade = await Project.create({
      companyId,
      name: 'Metro Trade Centre',
      slug: 'metro-trade-centre',
      projectType: 'mixed_use',
      status: 'under_construction',
      description: 'Mixed-use commercial podium with residential towers above.',
      addressLine1: 'Sector 62, Golf Course Extension Road',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122102',
      totalLandAreaSqft: 320000,
      launchDate: '2023-09-01',
      possessionDate: '2027-12-31',
      expectedProfits: 98000000,
      isActive: true,
    }, { transaction });

    const commercialPhase = await ProjectPhase.create({
      projectId: metroTrade.id,
      name: 'Commercial Podium',
      slug: 'commercial-podium',
      status: 'under_construction',
      sortOrder: 0,
    }, { transaction });

    const residentialPhase = await ProjectPhase.create({
      projectId: metroTrade.id,
      name: 'Residential Towers',
      slug: 'residential-towers',
      status: 'planning',
      sortOrder: 1,
    }, { transaction });

    await createBlock(metroTrade.id, {
      phaseId: commercialPhase.id,
      name: 'Podium Block',
      slug: 'podium-block',
      floors: [
        {
          label: 'Ground Floor',
          floorNumber: 0,
          units: [
            { unitNumber: 'P-G01', unitType: 'shop', carpetAreaSqft: 1200, basePrice: 15000000, status: 'sold' },
            { unitNumber: 'P-G02', unitType: 'shop', carpetAreaSqft: 950, basePrice: 12000000, status: 'booked' },
          ],
        },
        {
          label: 'First Floor',
          floorNumber: 1,
          units: [
            { unitNumber: 'P-101', unitType: 'office', carpetAreaSqft: 2500, basePrice: 22000000, status: 'available' },
            { unitNumber: 'P-102', unitType: 'office', carpetAreaSqft: 1800, basePrice: 16500000, status: 'available' },
          ],
        },
      ],
    }, transaction);

    await createBlock(metroTrade.id, {
      phaseId: residentialPhase.id,
      name: 'Res Tower 1',
      slug: 'res-tower-1',
      floors: buildTowerFloors('MT1', 6, 0, 9800000),
    }, transaction);

    await createBlock(metroTrade.id, {
      phaseId: residentialPhase.id,
      name: 'Res Tower 2',
      slug: 'res-tower-2',
      floors: buildTowerFloors('MT2', 6, 0, 10200000),
    }, transaction);

    await createBudget(companyId, metroTrade.id, 'project', null, [
      {
        name: 'Land & development rights',
        expectedAmount: 120000000,
        expenses: [
          { amount: 65000000, expenseDate: '2023-08-01', description: 'Land purchase' },
          { amount: 8500000, expenseDate: '2023-11-15', description: 'Development charges' },
        ],
      },
    ], credentialId, transaction);

    await createBudget(companyId, metroTrade.id, 'phase', commercialPhase.id, [
      {
        name: 'Commercial construction',
        expectedAmount: 55000000,
        expenses: [
          { amount: 18000000, expenseDate: '2024-06-01', description: 'Podium structure' },
          { amount: 7500000, expenseDate: '2024-12-15', description: 'Façade & glazing' },
        ],
      },
      {
        name: 'Office expense — commercial site',
        expectedAmount: 1800000,
        children: OFFICE_BUDGET_CHILDREN,
      },
    ], credentialId, transaction);

    await createBudget(companyId, metroTrade.id, 'phase', residentialPhase.id, [
      {
        name: 'Residential towers — structure',
        expectedAmount: 78000000,
        expenses: [
          { amount: 5000000, expenseDate: '2025-01-20', description: 'Excavation start' },
        ],
      },
    ], credentialId, transaction);

    const lotusCounty = await Project.create({
      companyId,
      name: 'Lotus County Plots',
      slug: 'lotus-county-plots',
      projectType: 'plotted',
      status: 'pre_launch',
      description: 'Gated plotted development with two sectors and internal roads.',
      addressLine1: 'NH-48, Near Sadashivpet',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '502291',
      totalLandAreaSqft: 2400000,
      launchDate: '2025-07-01',
      expectedProfits: 65000000,
      isActive: true,
    }, { transaction });

    const sectorA = await ProjectPhase.create({
      projectId: lotusCounty.id,
      name: 'Sector A',
      slug: 'sector-a',
      status: 'planning',
      sortOrder: 0,
    }, { transaction });

    const sectorB = await ProjectPhase.create({
      projectId: lotusCounty.id,
      name: 'Sector B',
      slug: 'sector-b',
      status: 'planning',
      sortOrder: 1,
    }, { transaction });

    await createBlock(lotusCounty.id, {
      phaseId: sectorA.id,
      name: 'Sector A — Plots',
      slug: 'sector-a-plots',
      floors: [{
        label: 'Plot level',
        floorNumber: 0,
        units: [
          { unitNumber: 'A-001', unitType: 'plot', carpetAreaSqft: 2400, basePrice: 3600000, status: 'available' },
          { unitNumber: 'A-002', unitType: 'plot', carpetAreaSqft: 1800, basePrice: 2700000, status: 'available' },
          { unitNumber: 'A-003', unitType: 'plot', carpetAreaSqft: 3000, basePrice: 4500000, status: 'booked' },
          { unitNumber: 'A-004', unitType: 'plot', carpetAreaSqft: 2200, basePrice: 3300000, status: 'available' },
        ],
      }],
    }, transaction);

    await createBlock(lotusCounty.id, {
      phaseId: sectorB.id,
      name: 'Sector B — Plots',
      slug: 'sector-b-plots',
      floors: [{
        label: 'Plot level',
        floorNumber: 0,
        units: [
          { unitNumber: 'B-001', unitType: 'plot', carpetAreaSqft: 2000, basePrice: 3000000, status: 'available' },
          { unitNumber: 'B-002', unitType: 'plot', carpetAreaSqft: 2500, basePrice: 3750000, status: 'available' },
          { unitNumber: 'B-003', unitType: 'plot', carpetAreaSqft: 3200, basePrice: 4800000, status: 'sold' },
        ],
      }],
    }, transaction);

    await createBudget(companyId, lotusCounty.id, 'phase', sectorA.id, [
      {
        name: 'Land development — Sector A',
        expectedAmount: 28000000,
        expenses: [
          { amount: 8000000, expenseDate: '2025-02-01', description: 'Land leveling' },
          { amount: 2500000, expenseDate: '2025-03-10', description: 'Internal roads' },
        ],
      },
    ], credentialId, transaction);

    await createBudget(companyId, lotusCounty.id, 'phase', sectorB.id, [
      {
        name: 'Land development — Sector B',
        expectedAmount: 32000000,
        expenses: [
          { amount: 5000000, expenseDate: '2025-02-15', description: 'Perimeter fencing' },
        ],
      },
    ], credentialId, transaction);

    await createBudget(companyId, lotusCounty.id, 'project', null, [
      {
        name: 'Master infrastructure',
        expectedAmount: 15000000,
        expenses: [
          { amount: 3200000, expenseDate: '2025-01-05', description: 'Main gate & security cabin' },
        ],
      },
      {
        name: 'Sales office setup',
        expectedAmount: 2500000,
        children: OFFICE_BUDGET_CHILDREN,
      },
    ], credentialId, transaction);
  });

  console.log('   ✅ Seeded Acme Corp demo projects (4 projects, phases, inventory & budgets) for Alice Admin.');
  return { skipped: false };
}

module.exports = {
  seedAcmeCorpProjectDemo,
};
