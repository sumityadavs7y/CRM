const express = require('express');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const { roleHasPermission } = require('../utils/planFeatures');
const { parsePaginationQuery, buildQueryString } = require('../utils/pagination');
const { formatIndianCurrency } = require('../utils/quotationCalculations');
const { buildProjectInventoryUrl, hasLinkedInventoryUnits, getLineProjectUnitId } = require('../utils/projectInventoryUrl');
const {
  DEFAULT_QUOTATION_LIST_SORT,
  DEFAULT_QUOTATION_LIST_DIR,
  QUOTATION_LIST_PAGE_SIZES,
  DEFAULT_QUOTATION_LIST_PAGE_SIZE,
  QUOTATION_LIST_SORT_COLUMNS,
  QUOTATION_STATUSES,
  formatQuotationStatus,
  getQuotationStatusBadgeClass,
  isQuotationEditable,
} = require('../constants/quotations');
const {
  findCompanyQuotation,
  listCompanyQuotationsPaginated,
  getQuotationFormOptions,
  getLeadPrefill,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getQuotationDeleteMeta,
  transitionQuotationStatus,
  searchLeadsForQuotation,
  listUnitsForQuotationProject,
  buildFormValuesFromQuotation,
} = require('../services/quotationService');
const { createInvoiceFromQuotation } = require('../services/invoiceService');
const { Lead } = require('../models');

const router = express.Router();

function canEditQuotations(req) {
  return roleHasPermission(req.session.permissions, 'quotations', 'edit');
}

function canEditInvoices(req) {
  return roleHasPermission(req.session.permissions, 'invoices', 'edit');
}

function buildListUrl(query) {
  return `/company/accounts/quotations${buildQueryString(query)}`;
}

router.get('/', isCompanyAuthenticated, requirePermission('quotations', 'view'), async (req, res) => {
  try {
    const paginationQuery = parsePaginationQuery(req.query, {
      defaultSort: DEFAULT_QUOTATION_LIST_SORT,
      defaultDir: DEFAULT_QUOTATION_LIST_DIR,
      defaultPageSize: DEFAULT_QUOTATION_LIST_PAGE_SIZE,
      allowedPageSizes: QUOTATION_LIST_PAGE_SIZES,
      allowedSortColumns: QUOTATION_LIST_SORT_COLUMNS,
    });

    const { quotations, pagination } = await listCompanyQuotationsPaginated(req.session.companyId, {
      page: paginationQuery.page,
      pageSize: paginationQuery.pageSize,
      sort: paginationQuery.sort,
      dir: paginationQuery.dir,
      status: req.query.status || '',
      projectId: req.query.projectId || '',
      assigneeId: req.query.assigneeId || '',
      leadId: req.query.leadId || '',
      search: req.query.search || '',
    });

    const leadIdFilter = req.query.leadId ? parseInt(req.query.leadId, 10) : null;
    const filterLead = leadIdFilter
      ? await Lead.findOne({
        where: { id: leadIdFilter, companyId: req.session.companyId },
        attributes: ['id', 'customerName'],
      })
      : null;

    const formOptions = await getQuotationFormOptions(req.session.companyId);

    res.render('quotations/index', withTheme(req, {
      user: buildUserContext(req),
      activeNav: 'accounts-quotations',
      quotations,
      pagination,
      buildListUrl,
      statusOptions: QUOTATION_STATUSES,
      formatQuotationStatus,
      getQuotationStatusBadgeClass,
      formatIndianCurrency,
      formOptions,
      filterLead,
      filters: {
        status: req.query.status || '',
        projectId: req.query.projectId || '',
        assigneeId: req.query.assigneeId || '',
        leadId: req.query.leadId || '',
        search: req.query.search || '',
      },
      canEdit: canEditQuotations(req),
      success: req.query.success || null,
      error: req.query.error || null,
    }));
  } catch (error) {
    console.error('Quotation list failed:', error);
    res.status(500).render('errors/500', withTheme(req, { user: buildUserContext(req) }));
  }
});

router.get('/new', isCompanyAuthenticated, requirePermission('quotations', 'edit'), async (req, res) => {
  try {
    const formOptions = await getQuotationFormOptions(req.session.companyId);
    let values = buildFormValuesFromQuotation(null);

    if (req.query.leadId) {
      const prefill = await getLeadPrefill(req.session.companyId, parseInt(req.query.leadId, 10));
      if (prefill) {
        values = { ...values, ...prefill, leadId: String(prefill.leadId), assigneeId: prefill.assigneeId ? String(prefill.assigneeId) : '' };
      }
    }

    res.render('quotations/create', withTheme(req, {
      user: buildUserContext(req),
      activeNav: 'accounts-quotations',
      formOptions,
      values,
      error: null,
      isEdit: false,
      quotation: null,
    }));
  } catch (error) {
    console.error('Quotation create form failed:', error);
    res.status(500).render('errors/500', withTheme(req, { user: buildUserContext(req) }));
  }
});

router.post('/', isCompanyAuthenticated, requirePermission('quotations', 'edit'), async (req, res) => {
  try {
    const quotation = await createQuotation(req.session.companyId, req.session.credentialId, req.body);
    res.redirect(`/company/accounts/quotations/${quotation.id}?success=${encodeURIComponent('Quotation created.')}`);
  } catch (error) {
    const formOptions = await getQuotationFormOptions(req.session.companyId);
    res.status(400).render('quotations/create', withTheme(req, {
      user: buildUserContext(req),
      activeNav: 'accounts-quotations',
      formOptions,
      values: { ...buildFormValuesFromQuotation(null), ...req.body, lineItems: req.body.lineItems || buildFormValuesFromQuotation(null).lineItems },
      error: error.message || 'Failed to create quotation.',
      isEdit: false,
      quotation: null,
    }));
  }
});

router.get('/api/leads', isCompanyAuthenticated, requirePermission('quotations', 'view'), async (req, res) => {
  try {
    const leads = await searchLeadsForQuotation(req.session.companyId, req.query.q || '');
    res.json({ leads });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search leads.' });
  }
});

router.get('/api/projects/:projectId/units', isCompanyAuthenticated, requirePermission('quotations', 'view'), async (req, res) => {
  try {
    const units = await listUnitsForQuotationProject(req.session.companyId, parseInt(req.params.projectId, 10));
    res.json({ units });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to load units.' });
  }
});

router.get('/:id/edit', isCompanyAuthenticated, requirePermission('quotations', 'edit'), async (req, res) => {
  try {
    const quotation = await findCompanyQuotation(req.session.companyId, parseInt(req.params.id, 10));
    if (!isQuotationEditable(quotation.status)) {
      return res.redirect(`/company/accounts/quotations/${quotation.id}?error=${encodeURIComponent('This quotation cannot be edited.')}`);
    }

    const formOptions = await getQuotationFormOptions(req.session.companyId);
    res.render('quotations/create', withTheme(req, {
      user: buildUserContext(req),
      activeNav: 'accounts-quotations',
      formOptions,
      values: buildFormValuesFromQuotation(quotation),
      error: null,
      isEdit: true,
      quotation,
    }));
  } catch (error) {
    res.status(404).render('errors/404', withTheme(req, { user: buildUserContext(req) }));
  }
});

router.post('/:id', isCompanyAuthenticated, requirePermission('quotations', 'edit'), async (req, res) => {
  try {
    const quotation = await updateQuotation(req.session.companyId, parseInt(req.params.id, 10), req.body);
    res.redirect(`/company/accounts/quotations/${quotation.id}?success=${encodeURIComponent('Quotation updated.')}`);
  } catch (error) {
    try {
      const quotation = await findCompanyQuotation(req.session.companyId, parseInt(req.params.id, 10));
      const formOptions = await getQuotationFormOptions(req.session.companyId);
      res.status(400).render('quotations/create', withTheme(req, {
        user: buildUserContext(req),
        activeNav: 'accounts-quotations',
        formOptions,
        values: { ...buildFormValuesFromQuotation(quotation), ...req.body },
        error: error.message || 'Failed to update quotation.',
        isEdit: true,
        quotation,
      }));
    } catch {
      res.redirect(`/company/accounts/quotations?error=${encodeURIComponent(error.message || 'Failed to update quotation.')}`);
    }
  }
});

router.get('/:id', isCompanyAuthenticated, requirePermission('quotations', 'view'), async (req, res) => {
  try {
    const quotation = await findCompanyQuotation(req.session.companyId, parseInt(req.params.id, 10));
    const deleteMeta = await getQuotationDeleteMeta(req.session.companyId, quotation);
    const user = buildUserContext(req);

    res.render('quotations/show', withTheme(req, {
      user,
      activeNav: 'accounts-quotations',
      quotation,
      formatQuotationStatus,
      getQuotationStatusBadgeClass,
      formatIndianCurrency,
      canEdit: canEditQuotations(req),
      canEditInvoices: canEditInvoices(req),
      canViewProjects: user.can('project_management', 'view'),
      hasLinkedInventory: hasLinkedInventoryUnits(quotation.lineItems),
      getLineProjectUnitId,
      buildProjectInventoryUrl,
      isEditable: isQuotationEditable(quotation.status),
      canDelete: canEditQuotations(req),
      deleteBlockReason: deleteMeta.blockReason,
      deleteConfirmMessage: deleteMeta.confirmMessage,
      deleteMeta,
      success: req.query.success || null,
      error: req.query.error || null,
    }));
  } catch (error) {
    res.status(404).render('errors/404', withTheme(req, { user: buildUserContext(req) }));
  }
});

router.post('/:id/delete', isCompanyAuthenticated, requirePermission('quotations', 'edit'), async (req, res) => {
  try {
    await deleteQuotation(
      req.session.companyId,
      parseInt(req.params.id, 10),
      req.session.credentialId
    );
    res.redirect(`/company/accounts/quotations?success=${encodeURIComponent('Quotation deleted.')}`);
  } catch (error) {
    res.redirect(`/company/accounts/quotations/${req.params.id}?error=${encodeURIComponent(error.message || 'Failed to delete quotation.')}`);
  }
});

router.post('/:id/status', isCompanyAuthenticated, requirePermission('quotations', 'edit'), async (req, res) => {
  try {
    await transitionQuotationStatus(
      req.session.companyId,
      parseInt(req.params.id, 10),
      req.body.status,
      req.session.credentialId
    );
    res.redirect(`/company/accounts/quotations/${req.params.id}?success=${encodeURIComponent('Quotation status updated.')}`);
  } catch (error) {
    res.redirect(`/company/accounts/quotations/${req.params.id}?error=${encodeURIComponent(error.message || 'Failed to update status.')}`);
  }
});

router.post('/:id/convert', isCompanyAuthenticated, requirePermission('invoices', 'edit'), async (req, res) => {
  try {
    const invoice = await createInvoiceFromQuotation(
      req.session.companyId,
      parseInt(req.params.id, 10),
      req.session.credentialId
    );
    res.redirect(`/company/accounts/invoices/${invoice.id}?success=${encodeURIComponent('Invoice created from quotation.')}`);
  } catch (error) {
    res.redirect(`/company/accounts/quotations/${req.params.id}?error=${encodeURIComponent(error.message || 'Failed to convert quotation.')}`);
  }
});

module.exports = router;
