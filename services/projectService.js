const { Op } = require('sequelize');
const {
  Project,
  ProjectReraRegistration,
  ProjectPhase,
  ProjectBlock,
  ProjectFloor,
  ProjectUnit,
  MediaFile,
  sequelize,
} = require('../models');
const { buildPaginationMeta } = require('../utils/pagination');
const { escapeIlikePattern } = require('../utils/projectListFilters');
const { isImageMimeType } = require('../constants/mediaLibrary');
const { enrichProjectAvatar } = require('../utils/projectAvatar');
const {
  PROJECT_TYPES,
  PROJECT_STATUSES,
} = require('../constants/projectManagement');
const {
  DEFAULT_PROJECT_LIST_PAGE_SIZE,
  PROJECT_LIST_PAGE_SIZES,
  DEFAULT_PROJECT_LIST_SORT,
  DEFAULT_PROJECT_LIST_DIR,
  PROJECT_LIST_SORT_COLUMNS,
} = require('../constants/projectList');

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueProjectSlug(companyId, name, excludeProjectId = null) {
  const baseSlug = slugify(name) || 'project';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const where = { companyId, slug };
    if (excludeProjectId) {
      where.id = { [Op.ne]: excludeProjectId };
    }

    const existing = await Project.findOne({ where });
    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function parseOptionalDecimal(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed || null;
}

function parseOptionalId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProjectInput(data) {
  return {
    name: data.name?.trim() || '',
    projectType: data.projectType?.trim() || 'residential',
    status: data.status?.trim() || 'planning',
    description: data.description?.trim() || null,
    addressLine1: data.addressLine1?.trim() || null,
    addressLine2: data.addressLine2?.trim() || null,
    city: data.city?.trim() || null,
    state: data.state?.trim() || null,
    pincode: data.pincode?.trim() || null,
    totalLandAreaSqft: parseOptionalDecimal(data.totalLandAreaSqft),
    launchDate: parseOptionalDate(data.launchDate),
    possessionDate: parseOptionalDate(data.possessionDate),
    expectedStartDate: parseOptionalDate(data.expectedStartDate),
    expectedEndDate: parseOptionalDate(data.expectedEndDate),
    expectedProfits: parseOptionalDecimal(data.expectedProfits),
    avatarMediaFileId: parseOptionalId(data.avatarMediaFileId),
    isActive: data.isActive === 'false' || data.isActive === false ? false : true,
  };
}

async function assertValidProjectAvatarMedia(companyId, avatarMediaFileId) {
  if (!avatarMediaFileId) {
    return;
  }

  const file = await MediaFile.findOne({
    where: { id: avatarMediaFileId, companyId },
  });

  if (!file) {
    throw new Error('Selected image was not found in your media library.');
  }

  if (!isImageMimeType(file.mimeType)) {
    throw new Error('Project avatar must be an image file.');
  }
}

function validateProjectInput(input) {
  const errors = [];

  if (!input.name) {
    errors.push('Project name is required.');
  }

  if (!PROJECT_TYPES.includes(input.projectType)) {
    errors.push('Invalid project type.');
  }

  if (!PROJECT_STATUSES.includes(input.status)) {
    errors.push('Invalid project status.');
  }

  if (input.expectedStartDate && input.expectedEndDate && input.expectedEndDate < input.expectedStartDate) {
    errors.push('Expected end date must be on or after expected start date.');
  }

  return errors;
}

async function findCompanyProject(companyId, projectId, options = {}) {
  return Project.findOne({
    where: { id: projectId, companyId },
    ...options,
  });
}

async function assertCompanyProject(companyId, projectId) {
  const project = await findCompanyProject(companyId, projectId);
  if (!project) {
    throw new Error('Project not found.');
  }
  return project;
}

const PROJECT_DETAIL_INCLUDES = [
  {
    model: MediaFile,
    as: 'avatarMedia',
    attributes: ['id', 'mimeType', 'originalName'],
    required: false,
  },
  {
    model: ProjectReraRegistration,
    as: 'reraRegistrations',
    separate: true,
    order: [['validUntil', 'DESC']],
  },
];

const INVENTORY_INCLUDES = [
  {
    model: ProjectPhase,
    as: 'phases',
    separate: true,
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    include: [
      {
        model: ProjectBlock,
        as: 'blocks',
        separate: true,
        order: [['sortOrder', 'ASC'], ['name', 'ASC']],
        include: [
          {
            model: ProjectFloor,
            as: 'floors',
            separate: true,
            order: [['sortOrder', 'ASC'], ['floorNumber', 'ASC']],
            include: [
              {
                model: ProjectUnit,
                as: 'units',
                separate: true,
                order: [['unitNumber', 'ASC']],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    model: ProjectBlock,
    as: 'blocks',
    separate: true,
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    include: [
      {
        model: ProjectPhase,
        as: 'phase',
        attributes: ['id', 'name'],
      },
      {
        model: ProjectFloor,
        as: 'floors',
        separate: true,
        order: [['sortOrder', 'ASC'], ['floorNumber', 'ASC']],
        include: [
          {
            model: ProjectUnit,
            as: 'units',
            separate: true,
            order: [['unitNumber', 'ASC']],
          },
        ],
      },
    ],
  },
];

async function findCompanyProjectWithDetails(companyId, projectId) {
  return Project.findOne({
    where: { id: projectId, companyId },
    include: [...PROJECT_DETAIL_INCLUDES, ...INVENTORY_INCLUDES],
  });
}

function buildProjectListWhere(companyId, filters) {
  const where = { companyId };

  if (filters.q) {
    const pattern = `%${escapeIlikePattern(filters.q)}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: pattern } },
      { city: { [Op.iLike]: pattern } },
      { state: { [Op.iLike]: pattern } },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.projectType) {
    where.projectType = filters.projectType;
  }

  if (filters.isActive !== null) {
    where.isActive = filters.isActive;
  }

  if (filters.city) {
    where.city = { [Op.iLike]: `%${escapeIlikePattern(filters.city)}%` };
  }

  if (filters.launchFrom || filters.launchTo) {
    where.launchDate = {};
    if (filters.launchFrom) {
      where.launchDate[Op.gte] = filters.launchFrom;
    }
    if (filters.launchTo) {
      where.launchDate[Op.lte] = filters.launchTo;
    }
  }

  if (filters.createdFrom || filters.createdTo) {
    where.createdAt = {};
    if (filters.createdFrom) {
      where.createdAt[Op.gte] = new Date(`${filters.createdFrom}T00:00:00.000Z`);
    }
    if (filters.createdTo) {
      where.createdAt[Op.lte] = new Date(`${filters.createdTo}T23:59:59.999Z`);
    }
  }

  return where;
}

async function getProjectUnitStats(projectIds) {
  if (!projectIds.length) {
    return new Map();
  }

  const dialect = sequelize.getDialect();
  const projectIdList = projectIds.join(',');

  const sql = dialect === 'postgres'
    ? `
      SELECT p.id AS "projectId",
        COUNT(u.id)::int AS "totalUnits",
        COUNT(u.id) FILTER (WHERE u.status = 'available')::int AS "availableUnits",
        COUNT(u.id) FILTER (WHERE u.status = 'booked')::int AS "bookedUnits",
        COUNT(u.id) FILTER (WHERE u.status = 'sold')::int AS "soldUnits"
      FROM "Projects" p
      LEFT JOIN "ProjectBlocks" b ON b."projectId" = p.id
      LEFT JOIN "ProjectFloors" f ON f."blockId" = b.id
      LEFT JOIN "ProjectUnits" u ON u."floorId" = f.id
      WHERE p.id IN (${projectIdList})
      GROUP BY p.id
    `
    : `
      SELECT p.id AS projectId,
        COUNT(u.id) AS totalUnits,
        SUM(CASE WHEN u.status = 'available' THEN 1 ELSE 0 END) AS availableUnits,
        SUM(CASE WHEN u.status = 'booked' THEN 1 ELSE 0 END) AS bookedUnits,
        SUM(CASE WHEN u.status = 'sold' THEN 1 ELSE 0 END) AS soldUnits
      FROM Projects p
      LEFT JOIN ProjectBlocks b ON b.projectId = p.id
      LEFT JOIN ProjectFloors f ON f.blockId = b.id
      LEFT JOIN ProjectUnits u ON u.floorId = f.id
      WHERE p.id IN (${projectIdList})
      GROUP BY p.id
    `;

  const rows = await sequelize.query(sql, {
    type: sequelize.QueryTypes.SELECT,
  });

  return new Map(rows.map((row) => [row.projectId, {
    totalUnits: Number(row.totalUnits) || 0,
    availableUnits: Number(row.availableUnits) || 0,
    bookedUnits: Number(row.bookedUnits) || 0,
    soldUnits: Number(row.soldUnits) || 0,
  }]));
}

async function getProjectReraSummary(projectIds) {
  if (!projectIds.length) {
    return new Map();
  }

  const registrations = await ProjectReraRegistration.findAll({
    where: { projectId: projectIds },
    attributes: ['projectId', 'status'],
    order: [['validUntil', 'DESC']],
  });

  const summary = new Map();
  registrations.forEach((reg) => {
    if (!summary.has(reg.projectId)) {
      summary.set(reg.projectId, reg.status);
    }
  });

  return summary;
}

async function listCompanyProjectsPaginated(companyId, {
  page = 1,
  pageSize = DEFAULT_PROJECT_LIST_PAGE_SIZE,
  sort = DEFAULT_PROJECT_LIST_SORT,
  dir = DEFAULT_PROJECT_LIST_DIR,
  filters = {},
  canLoadMedia = true,
} = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safePageSize = PROJECT_LIST_PAGE_SIZES.includes(parseInt(pageSize, 10))
    ? parseInt(pageSize, 10)
    : DEFAULT_PROJECT_LIST_PAGE_SIZE;
  const safeSort = PROJECT_LIST_SORT_COLUMNS.has(sort) ? sort : DEFAULT_PROJECT_LIST_SORT;
  const safeDir = dir === 'desc' ? 'DESC' : 'ASC';
  const where = buildProjectListWhere(companyId, filters);

  const { count, rows } = await Project.findAndCountAll({
    where,
    include: [{
      model: MediaFile,
      as: 'avatarMedia',
      attributes: ['id', 'mimeType', 'originalName'],
      required: false,
    }],
    order: [[safeSort, safeDir]],
    limit: safePageSize,
    offset: (safePage - 1) * safePageSize,
  });

  const projectIds = rows.map((p) => p.id);
  const [unitStats, reraSummary] = await Promise.all([
    getProjectUnitStats(projectIds),
    getProjectReraSummary(projectIds),
  ]);

  const projects = rows.map((project) => {
    const enriched = enrichProjectAvatar(project, { canLoadMedia });
    enriched.unitStats = unitStats.get(project.id) || {
      totalUnits: 0,
      availableUnits: 0,
      bookedUnits: 0,
      soldUnits: 0,
    };
    enriched.reraStatus = reraSummary.get(project.id) || null;
    return enriched;
  });

  return {
    projects,
    pagination: buildPaginationMeta({
      page: safePage,
      pageSize: safePageSize,
      total: count,
      sort: safeSort,
      dir: safeDir.toLowerCase(),
    }),
  };
}

async function createProject(companyId, data) {
  const input = normalizeProjectInput(data);
  const errors = validateProjectInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  await assertValidProjectAvatarMedia(companyId, input.avatarMediaFileId);

  const slug = await generateUniqueProjectSlug(companyId, input.name);

  return Project.create({
    companyId,
    slug,
    ...input,
  });
}

async function updateProject(companyId, projectId, data) {
  const project = await assertCompanyProject(companyId, projectId);
  const input = normalizeProjectInput(data);
  const errors = validateProjectInput(input);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  await assertValidProjectAvatarMedia(companyId, input.avatarMediaFileId);

  if (input.name !== project.name) {
    project.slug = await generateUniqueProjectSlug(companyId, input.name, projectId);
  }

  await project.update(input);
  return project;
}

async function deleteProject(companyId, projectId) {
  const project = await assertCompanyProject(companyId, projectId);
  await project.destroy();
}

function getProjectFormOptions() {
  return {
    projectTypes: PROJECT_TYPES,
    projectStatuses: PROJECT_STATUSES,
  };
}

module.exports = {
  slugify,
  normalizeProjectInput,
  validateProjectInput,
  findCompanyProject,
  assertCompanyProject,
  findCompanyProjectWithDetails,
  listCompanyProjectsPaginated,
  createProject,
  updateProject,
  deleteProject,
  getProjectFormOptions,
};
