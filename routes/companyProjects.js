const express = require('express');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const { PROJECT_TABS, resolveActiveProjectTab, getVisibleProjectTabs } = require('../constants/projectTabs');
const {
  formatProjectType,
  formatProjectStatus,
  getProjectStatusBadgeClass,
  getProjectStatusAvatarBgClass,
  getProjectStatusHeroBgClass,
  formatPhaseStatus,
  formatUnitType,
  formatUnitStatus,
  getUnitStatusBadgeClass,
  formatUnitFacing,
  formatReraStatus,
  getReraStatusBadgeClass,
  PROJECT_TYPES,
  PROJECT_STATUSES,
  UNIT_STATUS_LABELS,
  UNIT_STATUS_BADGE_CLASSES,
} = require('../constants/projectManagement');
const { parsePaginationQuery, buildQueryString, buildPageNumbers } = require('../utils/pagination');
const {
  findUnitInventoryPath,
  inventoryFocusNodeKeysArray,
  resolveInventoryPhaseTab,
} = require('../utils/inventoryFocus');
const {
  PROJECT_LIST_PAGE_SIZES,
  DEFAULT_PROJECT_LIST_PAGE_SIZE,
  DEFAULT_PROJECT_LIST_SORT,
  DEFAULT_PROJECT_LIST_DIR,
  PROJECT_LIST_SORT_COLUMNS,
  PROJECT_LIST_COLUMNS,
  PROJECT_LIST_DEFAULT_VISIBLE_COLUMNS,
  PROJECT_LIST_COLUMNS_STORAGE_KEY,
  PROJECT_LIST_FILTERS_EXPANDED_STORAGE_KEY,
  PROJECT_LIST_VIEW_MODES,
  DEFAULT_PROJECT_LIST_VIEW,
  PROJECT_LIST_VIEW_STORAGE_KEY,
} = require('../constants/projectList');
const {
  parseProjectListFilters,
  hasActiveProjectListFilters,
  buildProjectListFilterQuery,
} = require('../utils/projectListFilters');
const {
  formatProjectListDate,
  formatProjectListLocation,
  formatProjectListUnits,
  formatProjectListCurrency,
  formatProjectListUpdatedAt,
  getProjectUnitProgress,
  getProjectCardDescription,
} = require('../utils/projectListView');
const {
  findCompanyProjectWithDetails,
  listCompanyProjectsPaginated,
  normalizeProjectInput,
  createProject,
  updateProject,
  deleteProject,
  getProjectFormOptions,
} = require('../services/projectService');
const {
  normalizePhaseInput,
  normalizeBlockInput,
  normalizeFloorInput,
  normalizeUnitInput,
  createPhase,
  updatePhase,
  deletePhase,
  createBlock,
  updateBlock,
  deleteBlock,
  createFloor,
  updateFloor,
  deleteFloor,
  createUnit,
  updateUnit,
  deleteUnit,
  getInventoryFormOptions,
} = require('../services/projectInventoryService');
const {
  normalizeReraInput,
  createReraRegistration,
  updateReraRegistration,
  deleteReraRegistration,
  getReraFormOptions,
} = require('../services/projectReraService');
const {
  listProjectBudgetsEnriched,
  indexBudgetsByScopeTab,
} = require('../services/budgetService');
const { enrichProjectAvatar } = require('../utils/projectAvatar');
const { formatBudgetCurrency } = require('../constants/budgetManagement');

const router = express.Router();

function buildFormValues(body, project = null) {
  if (body && Object.keys(body).length > 0) {
    const normalized = normalizeProjectInput(body);
    return {
      ...normalized,
      isActive: normalized.isActive ? 'true' : 'false',
      avatarMediaFileId: normalized.avatarMediaFileId ?? '',
    };
  }

  if (!project) {
    return {
      name: '',
      projectType: 'residential',
      status: 'planning',
      description: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      totalLandAreaSqft: '',
      launchDate: '',
      possessionDate: '',
      expectedStartDate: '',
      expectedEndDate: '',
      expectedProfits: '',
      isActive: 'true',
      avatarMediaFileId: '',
    };
  }

  return {
    name: project.name,
    projectType: project.projectType,
    status: project.status,
    description: project.description || '',
    addressLine1: project.addressLine1 || '',
    addressLine2: project.addressLine2 || '',
    city: project.city || '',
    state: project.state || '',
    pincode: project.pincode || '',
    totalLandAreaSqft: project.totalLandAreaSqft ?? '',
    launchDate: project.launchDate || '',
    possessionDate: project.possessionDate || '',
    expectedStartDate: project.expectedStartDate || '',
    expectedEndDate: project.expectedEndDate || '',
    expectedProfits: project.expectedProfits ?? '',
    isActive: project.isActive ? 'true' : 'false',
    avatarMediaFileId: project.avatarMediaFileId ?? '',
  };
}

function getAvatarFormContext(user, values, project = null) {
  const canPickMedia = user.can('media_library', 'view');
  const canUploadMedia = user.can('media_library', 'edit');
  const fileId = values.avatarMediaFileId ? parseInt(values.avatarMediaFileId, 10) : null;
  let avatarMedia = project?.avatarMedia || null;
  if (fileId && (!avatarMedia || avatarMedia.id !== fileId)) {
    avatarMedia = { id: fileId, mimeType: 'image/jpeg', originalName: 'Selected image' };
  }
  const previewSource = {
    name: values.name || project?.name || 'Project',
    avatarMediaFileId: fileId,
    avatarMedia,
  };
  const enriched = enrichProjectAvatar(previewSource, { canLoadMedia: canPickMedia });

  return {
    canPickMedia,
    canUploadMedia,
    avatarPreviewUrl: enriched.hasAvatar ? enriched.avatarUrl : null,
    avatarThumbUrl: enriched.hasAvatar ? enriched.avatarThumbUrl : null,
    avatarInitials: enriched.avatarInitials,
    avatarAccent: enriched.avatarAccent,
    hasAvatarPreview: enriched.hasAvatar,
  };
}

function showProjectUrl(projectId, { tab, success, error } = {}) {
  const params = new URLSearchParams();
  if (tab) {
    params.set('tab', tab);
  }
  if (success) {
    params.set('success', success);
  }
  if (error) {
    params.set('error', error);
  }
  const query = params.toString();
  return `/company/projects/${projectId}${query ? `?${query}` : ''}`;
}

function wantsJson(req) {
  const accept = req.get('Accept') || '';
  const contentType = req.get('Content-Type') || '';
  return accept.includes('application/json')
    || contentType.includes('application/json')
    || req.get('X-Requested-With') === 'fetch';
}

async function renderProjectShow(req, res, project, extras = {}) {
  const user = buildUserContext(req);
  const canLoadMedia = user.can('media_library', 'view');
  const enrichedProject = enrichProjectAvatar(project, { canLoadMedia });
  const inventoryOptions = getInventoryFormOptions();
  const reraOptions = getReraFormOptions();
  const focusUnitId = req.query.unitId || null;
  const inventoryFocus = findUnitInventoryPath(project, focusUnitId);
  const canViewBudget = user.can('budget_management', 'view');
  const canEditBudget = user.can('budget_management', 'edit');
  let budgetByTab = {};
  let projectBudget = null;

  if (canViewBudget) {
    const budgets = await listProjectBudgetsEnriched(req.session.companyId, project.id);
    budgetByTab = indexBudgetsByScopeTab(budgets, project.phases || []);
    projectBudget = budgetByTab.project || null;
  }

  const visibleProjectTabs = getVisibleProjectTabs(user);
  const requestedTab = resolveActiveProjectTab(req.query.tab || (inventoryFocus.unitId ? 'inventory' : undefined));
  const activeTab = visibleProjectTabs.some((tab) => tab.key === requestedTab) ? requestedTab : 'general';

  res.render('projects/show', withTheme(req, {
    user,
    project: enrichedProject,
    canEdit: user.can('project_management', 'edit'),
    canViewBudget,
    canEditBudget,
    budgetByTab,
    projectBudget,
    formatBudgetCurrency,
    success: req.query.success || null,
    error: req.query.error || null,
    activeTab,
    focusUnitId: inventoryFocus.unitId,
    inventoryFocusNodeKeys: inventoryFocusNodeKeysArray(inventoryFocus.nodeKeys),
    inventoryPhaseTab: resolveInventoryPhaseTab(req.query.phaseTab, inventoryFocus, project),
    projectTabs: visibleProjectTabs,
    formatProjectType,
    formatProjectStatus,
    getProjectStatusBadgeClass,
    getProjectStatusAvatarBgClass,
    getProjectStatusHeroBgClass,
    formatProjectListLocation,
    getProjectUnitProgress,
    formatProjectListUpdatedAt,
    formatPhaseStatus,
    formatUnitType,
    formatUnitStatus,
    getUnitStatusBadgeClass,
    formatUnitFacing,
    formatReraStatus,
    getReraStatusBadgeClass,
    unitStatusLabels: UNIT_STATUS_LABELS,
    unitStatusBadgeClasses: UNIT_STATUS_BADGE_CLASSES,
    ...inventoryOptions,
    ...reraOptions,
    ...extras,
    activeNav: 'projects',
  }));
}

async function renderCreateForm(req, res, { error, values }) {
  const user = buildUserContext(req);
  const formOptions = getProjectFormOptions();

  res.render('projects/create', withTheme(req, {
    user,
    error,
    values,
    ...formOptions,
    ...getAvatarFormContext(user, values),
    formatProjectType,
    formatProjectStatus,
    activeNav: 'projects',
  }));
}

async function renderEditForm(req, res, project, { error, values }) {
  const user = buildUserContext(req);
  const formOptions = getProjectFormOptions();
  const canLoadMedia = user.can('media_library', 'view');
  const enrichedProject = enrichProjectAvatar(project, { canLoadMedia });

  res.render('projects/edit', withTheme(req, {
    user,
    project: enrichedProject,
    error,
    values,
    ...formOptions,
    ...getAvatarFormContext(user, values, project),
    formatProjectType,
    formatProjectStatus,
    getProjectStatusBadgeClass,
    activeNav: 'projects',
  }));
}

router.get('/', isCompanyAuthenticated, requirePermission('project_management', 'view'), async (req, res) => {
  const user = buildUserContext(req);
  const canLoadMedia = user.can('media_library', 'view');
  const paginationParams = parsePaginationQuery(req.query, {
    defaultPageSize: DEFAULT_PROJECT_LIST_PAGE_SIZE,
    allowedPageSizes: PROJECT_LIST_PAGE_SIZES,
    defaultSort: DEFAULT_PROJECT_LIST_SORT,
    allowedSortColumns: PROJECT_LIST_SORT_COLUMNS,
    defaultDir: DEFAULT_PROJECT_LIST_DIR,
  });

  const filters = parseProjectListFilters(req.query);

  const result = await listCompanyProjectsPaginated(req.session.companyId, {
    ...paginationParams,
    filters,
    canLoadMedia,
  });

  const listQuery = {
    ...buildProjectListFilterQuery(filters),
    pageSize: result.pagination.pageSize,
    sort: result.pagination.sort,
    dir: result.pagination.dir,
    success: req.query.success || null,
  };

  const buildListUrl = (overrides = {}) => `/company/projects${buildQueryString(listQuery, overrides)}`;

  res.render('projects/index', withTheme(req, {
    user,
    projects: result.projects,
    pagination: result.pagination,
    filters,
    hasActiveFilters: hasActiveProjectListFilters(filters),
    pageSizes: PROJECT_LIST_PAGE_SIZES,
    pageNumbers: buildPageNumbers(result.pagination.page, result.pagination.totalPages),
    buildListUrl,
    listColumns: PROJECT_LIST_COLUMNS,
    listDefaultVisibleColumns: PROJECT_LIST_DEFAULT_VISIBLE_COLUMNS,
    listSortColumns: PROJECT_LIST_SORT_COLUMNS,
    listColumnsStorageKey: PROJECT_LIST_COLUMNS_STORAGE_KEY,
    listFiltersExpandedStorageKey: PROJECT_LIST_FILTERS_EXPANDED_STORAGE_KEY,
    listViewModes: PROJECT_LIST_VIEW_MODES,
    listViewStorageKey: PROJECT_LIST_VIEW_STORAGE_KEY,
    defaultListView: DEFAULT_PROJECT_LIST_VIEW,
    projectTypes: PROJECT_TYPES,
    projectStatuses: PROJECT_STATUSES,
    formatProjectType,
    formatProjectStatus,
    getProjectStatusBadgeClass,
    getProjectStatusAvatarBgClass,
    formatReraStatus,
    getReraStatusBadgeClass,
    formatProjectListDate,
    formatProjectListLocation,
    formatProjectListUnits,
    formatProjectListCurrency,
    formatProjectListUpdatedAt,
    getProjectUnitProgress,
    getProjectCardDescription,
    formatProjectListLocation,
    success: req.query.success || null,
    activeNav: 'projects',
  }));
});

router.get('/new', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  await renderCreateForm(req, res, {
    error: null,
    values: buildFormValues({}),
  });
});

router.post('/', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  try {
    const project = await createProject(req.session.companyId, req.body);
    return res.redirect(showProjectUrl(project.id, { success: 'Project created successfully.' }));
  } catch (error) {
    return renderCreateForm(req, res, {
      error: error.message,
      values: buildFormValues(req.body),
    });
  }
});

router.get('/:id/edit', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const project = await findCompanyProjectWithDetails(req.session.companyId, req.params.id);
  if (!project) {
    return res.redirect('/company/projects');
  }

  return renderEditForm(req, res, project, {
    error: null,
    values: buildFormValues(null, project),
  });
});

router.post('/:id', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const project = await findCompanyProjectWithDetails(req.session.companyId, req.params.id);
  if (!project) {
    return res.redirect('/company/projects');
  }

  try {
    await updateProject(req.session.companyId, req.params.id, req.body);
    return res.redirect(showProjectUrl(project.id, { success: 'Project updated successfully.' }));
  } catch (error) {
    return renderEditForm(req, res, project, {
      error: error.message,
      values: buildFormValues(req.body),
    });
  }
});

router.post('/:id/delete', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  try {
    await deleteProject(req.session.companyId, req.params.id);
    return res.redirect('/company/projects?success=Project+deleted+successfully.');
  } catch (error) {
    return res.redirect(showProjectUrl(req.params.id, { error: error.message }));
  }
});

router.get('/:id', isCompanyAuthenticated, requirePermission('project_management', 'view'), async (req, res) => {
  const project = await findCompanyProjectWithDetails(req.session.companyId, req.params.id);
  if (!project) {
    return res.redirect('/company/projects');
  }

  return renderProjectShow(req, res, project);
});

// --- Phases ---

router.post('/:id/phases', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const projectId = req.params.id;
  try {
    await createPhase(req.session.companyId, projectId, req.body);
    if (wantsJson(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Phase created successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

router.patch('/:id/phases/:phaseId', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, phaseId } = req.params;
  try {
    const phase = await updatePhase(req.session.companyId, projectId, phaseId, req.body);
    if (wantsJson(req)) {
      return res.json({ ok: true, phase });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Phase updated successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

router.post('/:id/phases/:phaseId/delete', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, phaseId } = req.params;
  try {
    await deletePhase(req.session.companyId, projectId, phaseId);
    if (wantsJson(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Phase deleted successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

// --- Blocks ---

router.post('/:id/blocks', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const projectId = req.params.id;
  try {
    await createBlock(req.session.companyId, projectId, req.body);
    if (wantsJson(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Block created successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

router.patch('/:id/blocks/:blockId', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, blockId } = req.params;
  try {
    const block = await updateBlock(req.session.companyId, projectId, blockId, req.body);
    if (wantsJson(req)) {
      return res.json({ ok: true, block });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Block updated successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

router.post('/:id/blocks/:blockId/delete', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, blockId } = req.params;
  try {
    await deleteBlock(req.session.companyId, projectId, blockId);
    if (wantsJson(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Block deleted successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

// --- Floors ---

router.post('/:id/blocks/:blockId/floors', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, blockId } = req.params;
  try {
    await createFloor(req.session.companyId, projectId, blockId, req.body);
    if (wantsJson(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Floor created successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

router.patch('/:id/floors/:floorId', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, floorId } = req.params;
  try {
    const floor = await updateFloor(req.session.companyId, projectId, floorId, req.body);
    if (wantsJson(req)) {
      return res.json({ ok: true, floor });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Floor updated successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

router.post('/:id/floors/:floorId/delete', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, floorId } = req.params;
  try {
    await deleteFloor(req.session.companyId, projectId, floorId);
    if (wantsJson(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Floor deleted successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

// --- Units ---

router.post('/:id/floors/:floorId/units', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, floorId } = req.params;
  try {
    await createUnit(req.session.companyId, projectId, floorId, req.body);
    if (wantsJson(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Unit created successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

router.patch('/:id/units/:unitId', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, unitId } = req.params;
  try {
    const unit = await updateUnit(req.session.companyId, projectId, unitId, req.body);
    if (wantsJson(req)) {
      return res.json({ ok: true, unit });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Unit updated successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

router.post('/:id/units/:unitId/delete', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, unitId } = req.params;

  try {
    await deleteUnit(req.session.companyId, projectId, unitId);
    if (wantsJson(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', success: 'Unit deleted successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'inventory', error: error.message }));
  }
});

// --- RERA ---

router.post('/:id/rera', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const projectId = req.params.id;
  try {
    await createReraRegistration(req.session.companyId, projectId, req.body);
    if (wantsJson(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'rera', success: 'RERA registration created successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'rera', error: error.message }));
  }
});

router.patch('/:id/rera/:reraId', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, reraId } = req.params;
  try {
    const registration = await updateReraRegistration(req.session.companyId, projectId, reraId, req.body);
    if (wantsJson(req)) {
      return res.json({ ok: true, registration });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'rera', success: 'RERA registration updated successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'rera', error: error.message }));
  }
});

router.post('/:id/rera/:reraId/delete', isCompanyAuthenticated, requirePermission('project_management', 'edit'), async (req, res) => {
  const { id: projectId, reraId } = req.params;
  try {
    await deleteReraRegistration(req.session.companyId, projectId, reraId);
    if (wantsJson(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'rera', success: 'RERA registration deleted successfully.' }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }
    return res.redirect(showProjectUrl(projectId, { tab: 'rera', error: error.message }));
  }
});

module.exports = router;
