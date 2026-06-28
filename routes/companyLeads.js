const express = require('express');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const { LEAD_TABS, resolveActiveTab } = require('../constants/leadTabs');
const { formatLeadQuality, getLeadQualityBadgeClass } = require('../constants/leadQuality');
const {
  LEAD_TASK_PRIORITY_OPTIONS,
  LEAD_TASK_STATUS_OPTIONS,
  formatLeadTaskPriority,
  formatLeadTaskStatus,
  getLeadTaskPriorityBadgeClass,
  getLeadTaskStatusBadgeClass,
} = require('../constants/leadTask');
const { sanitizeNotesHtml } = require('../utils/sanitizeHtml');
const {
  findCompanyLead,
  listCompanyLeadsPaginated,
  getLeadFormOptions,
  normalizeLeadInput,
  createLead,
  patchLead,
  deleteLead,
  serializeLeadForJson,
} = require('../services/leadService');
const {
  createLeadCommunication,
  updateLeadCommunication,
  deleteLeadCommunication,
} = require('../services/leadCommunicationService');
const {
  createLeadDiscussion,
  updateLeadDiscussion,
  deleteLeadDiscussion,
} = require('../services/leadDiscussionService');
const {
  createLeadTask,
  updateLeadTask,
  deleteLeadTask,
} = require('../services/leadTaskService');
const {
  LEAD_LIST_PAGE_SIZES,
  DEFAULT_LEAD_LIST_PAGE_SIZE,
  DEFAULT_LEAD_LIST_SORT,
  DEFAULT_LEAD_LIST_DIR,
  LEAD_LIST_SORT_COLUMNS,
  LEAD_LIST_COLUMNS,
  LEAD_LIST_DEFAULT_VISIBLE_COLUMNS,
  LEAD_LIST_COLUMNS_STORAGE_KEY,
} = require('../constants/leadList');
const { parsePaginationQuery, buildQueryString, buildPageNumbers } = require('../utils/pagination');
const {
  formatLeadListNotesPreview,
  formatLeadListDate,
  formatLeadListCount,
  formatLeadListSources,
} = require('../utils/leadListView');

const router = express.Router();

function buildFormValues(body, lead = null) {
  if (body && Object.keys(body).length > 0) {
    const normalized = normalizeLeadInput(body);
    return {
      ...normalized,
      sourceIds: normalized.sourceIds.map(String),
    };
  }

  if (!lead) {
    return {
      customerName: '',
      email: '',
      subject: '',
      assigneeId: '',
      phone: '',
      followUpDate: '',
      score: '',
      quality: '',
      pipelineId: '',
      stageId: '',
      notes: '',
      sourceIds: [],
    };
  }

  return {
    customerName: lead.customerName,
    email: lead.email,
    subject: lead.subject,
    assigneeId: String(lead.assigneeId),
    phone: lead.phone || '',
    followUpDate: lead.followUpDate || '',
    score: lead.score ?? '',
    quality: lead.quality || '',
    pipelineId: lead.pipelineId ? String(lead.pipelineId) : '',
    stageId: lead.stageId ? String(lead.stageId) : '',
    notes: lead.notes || '',
    sourceIds: (lead.sources || []).map((source) => String(source.id)),
  };
}

function showLeadUrl(leadId, { tab, success, error } = {}) {
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
  return `/company/leads/${leadId}${query ? `?${query}` : ''}`;
}

function wantsJson(req) {
  const accept = req.get('Accept') || '';
  const contentType = req.get('Content-Type') || '';
  return accept.includes('application/json')
    || contentType.includes('application/json')
    || req.get('X-Requested-With') === 'fetch';
}

async function renderCreateForm(req, res, { error, values }) {
  const formOptions = await getLeadFormOptions(req.session.companyId);

  res.render('leads/create', withTheme(req, {
    user: buildUserContext(req),
    error,
    values,
    ...formOptions,
    activeNav: 'leads',
  }));
}

router.get('/', isCompanyAuthenticated, requirePermission('leads', 'view'), async (req, res) => {
  const paginationParams = parsePaginationQuery(req.query, {
    defaultPageSize: DEFAULT_LEAD_LIST_PAGE_SIZE,
    allowedPageSizes: LEAD_LIST_PAGE_SIZES,
    defaultSort: DEFAULT_LEAD_LIST_SORT,
    allowedSortColumns: LEAD_LIST_SORT_COLUMNS,
    defaultDir: DEFAULT_LEAD_LIST_DIR,
  });

  const pagination = await listCompanyLeadsPaginated(req.session.companyId, paginationParams);

  const listQuery = {
    pageSize: pagination.pageSize,
    sort: pagination.sort,
    dir: pagination.dir,
    success: req.query.success || null,
  };

  const buildLeadsListUrl = (overrides = {}) => `/company/leads${buildQueryString(listQuery, overrides)}`;

  res.render('leads/index', withTheme(req, {
    user: buildUserContext(req),
    leads: pagination.rows,
    pagination,
    pageSizes: LEAD_LIST_PAGE_SIZES,
    pageNumbers: buildPageNumbers(pagination.page, pagination.totalPages),
    buildLeadsListUrl,
    listColumns: LEAD_LIST_COLUMNS,
    leadListDefaultVisibleColumns: LEAD_LIST_DEFAULT_VISIBLE_COLUMNS,
    leadListSortColumns: LEAD_LIST_SORT_COLUMNS,
    leadListColumnsStorageKey: LEAD_LIST_COLUMNS_STORAGE_KEY,
    formatLeadListNotesPreview,
    formatLeadListDate,
    formatLeadListCount,
    formatLeadListSources,
    success: req.query.success || null,
    formatLeadQuality,
    getLeadQualityBadgeClass,
    activeNav: 'leads',
  }));
});

router.get('/new', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  await renderCreateForm(req, res, {
    error: null,
    values: buildFormValues({}),
  });
});

router.post('/', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    await createLead(req.session.companyId, req.body);
    return res.redirect('/company/leads?success=Lead+created+successfully.');
  } catch (error) {
    return renderCreateForm(req, res, {
      error: error.message,
      values: buildFormValues(req.body),
    });
  }
});

router.get('/:id', isCompanyAuthenticated, requirePermission('leads', 'view'), async (req, res) => {
  const companyId = req.session.companyId;
  const lead = await findCompanyLead(companyId, req.params.id);
  if (!lead) {
    return res.redirect('/company/leads');
  }

  const user = buildUserContext(req);
  const formOptions = await getLeadFormOptions(companyId);

  res.render('leads/show', withTheme(req, {
    user,
    lead,
    canEdit: user.can('leads', 'edit'),
    notesHtml: sanitizeNotesHtml(lead.notes) || '',
    success: req.query.success || null,
    error: req.query.error || null,
    activeTab: resolveActiveTab(req.query.tab),
    leadTabs: LEAD_TABS,
    formatLeadQuality,
    getLeadQualityBadgeClass,
    formatLeadTaskPriority,
    formatLeadTaskStatus,
    getLeadTaskPriorityBadgeClass,
    getLeadTaskStatusBadgeClass,
    taskPriorityOptions: LEAD_TASK_PRIORITY_OPTIONS,
    taskStatusOptions: LEAD_TASK_STATUS_OPTIONS,
    ...formOptions,
    activeNav: 'leads',
  }));
});

router.patch('/:id', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    const lead = await patchLead(req.session.companyId, req.params.id, req.body);
    return res.json({ ok: true, lead: serializeLeadForJson(lead) });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
});

router.post('/:id/communications', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    const communication = await createLeadCommunication(
      req.session.companyId,
      req.params.id,
      req.body
    );

    if (wantsJson(req)) {
      return res.json({ ok: true, communication });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      success: 'Email/message added successfully.',
    }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      error: error.message,
    }));
  }
});

router.patch('/:id/communications/:commId', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    const communication = await updateLeadCommunication(
      req.session.companyId,
      req.params.id,
      req.params.commId,
      req.body
    );

    if (wantsJson(req)) {
      return res.json({ ok: true, communication });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      success: 'Email/message updated successfully.',
    }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      error: error.message,
    }));
  }
});

router.post('/:id/communications/:commId/delete', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    await deleteLeadCommunication(req.session.companyId, req.params.id, req.params.commId);

    if (wantsJson(req)) {
      return res.json({ ok: true });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      success: 'Email/message deleted successfully.',
    }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      error: error.message,
    }));
  }
});

router.post('/:id/discussions', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    const discussion = await createLeadDiscussion(
      req.session.companyId,
      req.params.id,
      req.body
    );

    if (wantsJson(req)) {
      return res.json({ ok: true, discussion });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      success: 'Discussion added successfully.',
    }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      error: error.message,
    }));
  }
});

router.patch('/:id/discussions/:discussionId', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    const discussion = await updateLeadDiscussion(
      req.session.companyId,
      req.params.id,
      req.params.discussionId,
      req.body
    );

    if (wantsJson(req)) {
      return res.json({ ok: true, discussion });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      success: 'Discussion updated successfully.',
    }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      error: error.message,
    }));
  }
});

router.post('/:id/discussions/:discussionId/delete', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    await deleteLeadDiscussion(req.session.companyId, req.params.id, req.params.discussionId);

    if (wantsJson(req)) {
      return res.json({ ok: true });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      success: 'Discussion deleted successfully.',
    }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'general',
      error: error.message,
    }));
  }
});

router.post('/:id/tasks', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    const task = await createLeadTask(
      req.session.companyId,
      req.params.id,
      req.body
    );

    if (wantsJson(req)) {
      return res.json({ ok: true, task });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'tasks',
      success: 'Task added successfully.',
    }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'tasks',
      error: error.message,
    }));
  }
});

router.patch('/:id/tasks/:taskId', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    const task = await updateLeadTask(
      req.session.companyId,
      req.params.id,
      req.params.taskId,
      req.body
    );

    if (wantsJson(req)) {
      return res.json({ ok: true, task });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'tasks',
      success: 'Task updated successfully.',
    }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'tasks',
      error: error.message,
    }));
  }
});

router.post('/:id/tasks/:taskId/delete', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    await deleteLeadTask(req.session.companyId, req.params.id, req.params.taskId);

    if (wantsJson(req)) {
      return res.json({ ok: true });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'tasks',
      success: 'Task deleted successfully.',
    }));
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    return res.redirect(showLeadUrl(req.params.id, {
      tab: 'tasks',
      error: error.message,
    }));
  }
});

router.post('/:id/delete', isCompanyAuthenticated, requirePermission('leads', 'edit'), async (req, res) => {
  try {
    await deleteLead(req.session.companyId, req.params.id);
    return res.redirect('/company/leads?success=Lead+deleted+successfully.');
  } catch (error) {
    return res.redirect(showLeadUrl(req.params.id, { error: error.message }));
  }
});

module.exports = router;
