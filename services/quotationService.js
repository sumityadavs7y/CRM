const { Op } = require('sequelize');
const {
  Quotation,
  QuotationLineItem,
  Lead,
  Project,
  ProjectUnit,
  ProjectFloor,
  ProjectBlock,
  CompanyCredential,
  sequelize,
} = require('../models');
const { QUOTATION_NUMBER_PREFIX, QUOTATION_STATUSES } = require('../constants/quotations');
const { calculateLineAmounts, calculateDocumentTotals } = require('../utils/quotationCalculations');
const { getNextDocumentNumber } = require('../utils/documentNumbering');
const { buildPaginationMeta } = require('../utils/pagination');
const { assertCompanyProject } = require('./projectService');
const { recordLeadHistoryEvent } = require('./leadHistoryService');
const { LEAD_HISTORY_ACTIONS, LEAD_HISTORY_ENTITY_TYPES } = require('../constants/leadHistory');
const {
  cascadeDeleteQuotation,
  getQuotationDeleteMeta,
} = require('./accountsCascadeDeleteService');

const QUOTATION_INCLUDES = [
  { model: Lead, as: 'lead', attributes: ['id', 'customerName', 'email'] },
  { model: Project, as: 'project', attributes: ['id', 'name'] },
  { model: CompanyCredential, as: 'assignee', attributes: ['id', 'adminName'] },
  { model: CompanyCredential, as: 'createdBy', attributes: ['id', 'adminName'] },
  {
    model: QuotationLineItem,
    as: 'lineItems',
    separate: true,
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    include: [{
      model: ProjectUnit,
      as: 'projectUnit',
      attributes: ['id', 'unitNumber', 'status'],
    }],
  },
];

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function parseOptionalId(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseLineItemsFromBody(body) {
  const raw = body?.lineItems;
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw === 'object') {
    return Object.keys(raw)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((key) => raw[key]);
  }

  return [];
}

function normalizeLineItemInput(raw, index) {
  const quantity = raw?.quantity === '' || raw?.quantity === undefined ? 1 : raw.quantity;
  const unitPrice = raw?.unitPrice;
  const discountAmount = raw?.discountAmount === '' ? 0 : (raw?.discountAmount ?? 0);
  const taxRate = raw?.taxRate === '' ? 0 : (raw?.taxRate ?? 0);
  const { taxAmount, lineTotal } = calculateLineAmounts(quantity, unitPrice, discountAmount, taxRate);

  return {
    sortOrder: index,
    description: String(raw?.description || '').trim(),
    projectUnitId: parseOptionalId(raw?.projectUnitId),
    quantity,
    unitPrice,
    discountAmount,
    taxRate: taxRate === 0 ? null : taxRate,
    taxAmount,
    lineTotal,
  };
}

async function buildUnitSnapshot(companyId, projectId, projectUnitId) {
  if (!projectUnitId || !projectId) {
    return null;
  }

  await assertCompanyProject(companyId, projectId);
  const unit = await ProjectUnit.findOne({
    where: { id: projectUnitId },
    include: [{
      model: ProjectFloor,
      as: 'floor',
      required: true,
      include: [{
        model: ProjectBlock,
        as: 'block',
        required: true,
        where: { projectId },
      }],
    }],
  });

  if (!unit) {
    throw new Error('Selected unit was not found for this project.');
  }

  const project = await Project.findOne({ where: { id: projectId, companyId }, attributes: ['name'] });

  return {
    unitNumber: unit.unitNumber,
    unitType: unit.unitType,
    carpetAreaSqft: unit.carpetAreaSqft,
    projectName: project?.name || null,
    blockName: unit.floor?.block?.name || null,
  };
}

async function resolveLineItems(companyId, projectId, rawLineItems) {
  if (!Array.isArray(rawLineItems) || rawLineItems.length === 0) {
    throw new Error('Add at least one line item.');
  }

  const resolved = [];

  for (let index = 0; index < rawLineItems.length; index += 1) {
    const line = normalizeLineItemInput(rawLineItems[index], index);
    if (!line.description) {
      throw new Error(`Line item ${index + 1} requires a description.`);
    }
    if (line.unitPrice === '' || line.unitPrice === null || line.unitPrice === undefined || Number.isNaN(Number(line.unitPrice))) {
      throw new Error(`Line item ${index + 1} requires a unit price.`);
    }

    if (line.projectUnitId) {
      if (!projectId) {
        throw new Error('Select a project before linking inventory units.');
      }
      line.unitSnapshot = await buildUnitSnapshot(companyId, projectId, line.projectUnitId);
    } else {
      line.unitSnapshot = null;
    }

    resolved.push(line);
  }

  return resolved;
}

async function assertCompanyLead(companyId, leadId) {
  if (!leadId) {
    return null;
  }
  const lead = await Lead.findOne({ where: { id: leadId, companyId } });
  if (!lead) {
    throw new Error('Lead not found.');
  }
  return lead;
}

async function assertCompanyAssignee(companyId, assigneeId) {
  if (!assigneeId) {
    return null;
  }
  const assignee = await CompanyCredential.findOne({
    where: { id: assigneeId, companyId, isActive: true },
  });
  if (!assignee) {
    throw new Error('Assignee not found.');
  }
  return assignee;
}

function normalizeQuotationHeaderInput(body) {
  return {
    issueDate: body?.issueDate || todayDateOnly(),
    validUntil: body?.validUntil || null,
    leadId: parseOptionalId(body?.leadId),
    projectId: parseOptionalId(body?.projectId),
    customerName: String(body?.customerName || '').trim(),
    customerEmail: String(body?.customerEmail || '').trim().toLowerCase(),
    customerPhone: String(body?.customerPhone || '').trim() || null,
    customerAddress: String(body?.customerAddress || '').trim() || null,
    assigneeId: parseOptionalId(body?.assigneeId),
    discountAmount: body?.discountAmount === '' ? 0 : (body?.discountAmount ?? 0),
    notes: String(body?.notes || '').trim() || null,
    termsAndConditions: String(body?.termsAndConditions || '').trim() || null,
    holdUnitsOnAccept: body?.holdUnitsOnAccept === 'on' || body?.holdUnitsOnAccept === true || body?.holdUnitsOnAccept === 'true',
    lineItems: parseLineItemsFromBody(body),
  };
}

function validateQuotationHeader(header) {
  if (!header.customerName) {
    throw new Error('Customer name is required.');
  }
  if (!header.customerEmail) {
    throw new Error('Customer email is required.');
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(header.customerEmail)) {
    throw new Error('Enter a valid customer email.');
  }
}

async function applyExpiredStatus(quotation) {
  if (!quotation || quotation.status !== 'sent' || !quotation.validUntil) {
    return quotation;
  }
  if (quotation.validUntil >= todayDateOnly()) {
    return quotation;
  }
  await quotation.update({ status: 'expired' });
  quotation.status = 'expired';
  return quotation;
}

async function findCompanyQuotation(companyId, quotationId) {
  const quotation = await Quotation.findOne({
    where: { id: quotationId, companyId },
    include: QUOTATION_INCLUDES,
  });
  if (!quotation) {
    throw new Error('Quotation not found.');
  }
  return applyExpiredStatus(quotation);
}

async function listCompanyQuotationsPaginated(companyId, options = {}) {
  const {
    page = 1,
    pageSize = 25,
    sort = 'issueDate',
    dir = 'desc',
    status,
    projectId,
    assigneeId,
    leadId,
    search,
  } = options;

  const where = { companyId };

  if (status) {
    where.status = status;
  }
  if (projectId) {
    where.projectId = projectId;
  }
  if (assigneeId) {
    where.assigneeId = assigneeId;
  }
  if (leadId) {
    where.leadId = leadId;
  }
  if (search) {
    where[Op.or] = [
      { quotationNumber: { [Op.iLike]: `%${search}%` } },
      { customerName: { [Op.iLike]: `%${search}%` } },
      { customerEmail: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const orderDir = dir === 'asc' ? 'ASC' : 'DESC';
  const { count, rows } = await Quotation.findAndCountAll({
    where,
    include: [
      { model: Project, as: 'project', attributes: ['id', 'name'] },
      { model: CompanyCredential, as: 'assignee', attributes: ['id', 'adminName'] },
    ],
    order: [[sort, orderDir]],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  });

  return {
    quotations: rows,
    pagination: buildPaginationMeta({ page, pageSize, total: count }),
  };
}

async function getQuotationFormOptions(companyId) {
  const [assignees, projects, leads] = await Promise.all([
    CompanyCredential.findAll({
      where: { companyId, isActive: true },
      attributes: ['id', 'adminName', 'email'],
      order: [['adminName', 'ASC']],
    }),
    Project.findAll({
      where: { companyId, isActive: true },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    }),
    Lead.findAll({
      where: { companyId },
      attributes: ['id', 'customerName', 'email', 'phone', 'assigneeId'],
      order: [['customerName', 'ASC']],
      limit: 500,
    }),
  ]);

  return { assignees, projects, leads };
}

async function listQuotationsForLead(companyId, leadId, { limit = 5 } = {}) {
  await assertCompanyLead(companyId, leadId);

  return Quotation.findAll({
    where: { companyId, leadId },
    attributes: ['id', 'quotationNumber', 'status', 'issueDate', 'totalAmount', 'projectId'],
    include: [
      { model: Project, as: 'project', attributes: ['id', 'name'] },
    ],
    order: [['issueDate', 'DESC'], ['id', 'DESC']],
    limit,
  });
}

async function countQuotationsForLead(companyId, leadId) {
  const lead = await assertCompanyLead(companyId, leadId);
  if (!lead) {
    return 0;
  }

  return Quotation.count({ where: { companyId, leadId } });
}

async function getLeadPrefill(companyId, leadId) {
  const lead = await assertCompanyLead(companyId, leadId);
  if (!lead) {
    return null;
  }
  return {
    leadId: lead.id,
    customerName: lead.customerName,
    customerEmail: lead.email,
    customerPhone: lead.phone || '',
    assigneeId: lead.assigneeId,
  };
}

async function createQuotation(companyId, createdById, body) {
  const header = normalizeQuotationHeaderInput(body);
  validateQuotationHeader(header);

  await assertCompanyLead(companyId, header.leadId);
  if (header.projectId) {
    await assertCompanyProject(companyId, header.projectId);
  }
  await assertCompanyAssignee(companyId, header.assigneeId);

  const lineItems = await resolveLineItems(companyId, header.projectId, header.lineItems);
  const totals = calculateDocumentTotals(lineItems, header.discountAmount);
  const quotationNumber = await getNextDocumentNumber(companyId, QUOTATION_NUMBER_PREFIX, Quotation, 'quotationNumber');

  let createdId;
  await sequelize.transaction(async (transaction) => {
    const quotation = await Quotation.create({
      companyId,
      quotationNumber,
      status: 'draft',
      issueDate: header.issueDate,
      validUntil: header.validUntil || null,
      leadId: header.leadId,
      projectId: header.projectId,
      customerName: header.customerName,
      customerEmail: header.customerEmail,
      customerPhone: header.customerPhone,
      customerAddress: header.customerAddress,
      assigneeId: header.assigneeId,
      createdById,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      notes: header.notes,
      termsAndConditions: header.termsAndConditions,
      holdUnitsOnAccept: header.holdUnitsOnAccept,
    }, { transaction });

    await QuotationLineItem.bulkCreate(
      lineItems.map((line) => ({ ...line, quotationId: quotation.id })),
      { transaction }
    );

    if (header.leadId) {
      await recordLeadHistoryEvent({
        leadId: header.leadId,
        companyId,
        userId: createdById,
        action: LEAD_HISTORY_ACTIONS.CREATED,
        entityType: LEAD_HISTORY_ENTITY_TYPES.QUOTATION,
        entityId: quotation.id,
        summary: `Quotation ${quotationNumber} created`,
      }, transaction);
    }

    createdId = quotation.id;
  });

  return findCompanyQuotation(companyId, createdId);
}

async function updateQuotation(companyId, quotationId, body) {
  const quotation = await findCompanyQuotation(companyId, quotationId);
  if (quotation.status !== 'draft') {
    throw new Error('Only draft quotations can be edited.');
  }

  const header = normalizeQuotationHeaderInput(body);
  validateQuotationHeader(header);

  await assertCompanyLead(companyId, header.leadId);
  if (header.projectId) {
    await assertCompanyProject(companyId, header.projectId);
  }
  await assertCompanyAssignee(companyId, header.assigneeId);

  const lineItems = await resolveLineItems(companyId, header.projectId, header.lineItems);
  const totals = calculateDocumentTotals(lineItems, header.discountAmount);

  await sequelize.transaction(async (transaction) => {
    await quotation.update({
      issueDate: header.issueDate,
      validUntil: header.validUntil || null,
      leadId: header.leadId,
      projectId: header.projectId,
      customerName: header.customerName,
      customerEmail: header.customerEmail,
      customerPhone: header.customerPhone,
      customerAddress: header.customerAddress,
      assigneeId: header.assigneeId,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      notes: header.notes,
      termsAndConditions: header.termsAndConditions,
      holdUnitsOnAccept: header.holdUnitsOnAccept,
    }, { transaction });

    await QuotationLineItem.destroy({ where: { quotationId: quotation.id }, transaction });
    await QuotationLineItem.bulkCreate(
      lineItems.map((line) => ({ ...line, quotationId: quotation.id })),
      { transaction }
    );
  });

  return findCompanyQuotation(companyId, quotation.id);
}

async function deleteQuotation(companyId, quotationId, userId) {
  const quotation = await findCompanyQuotation(companyId, quotationId);

  await sequelize.transaction(async (transaction) => {
    await cascadeDeleteQuotation(companyId, quotation, userId, transaction);
  });
}

async function holdUnitsForQuotation(quotation, transaction) {
  if (!quotation.holdUnitsOnAccept) {
    return;
  }

  const lines = quotation.lineItems || await QuotationLineItem.findAll({
    where: { quotationId: quotation.id },
    transaction,
  });

  for (const line of lines) {
    if (!line.projectUnitId) {
      continue;
    }
    const unit = await ProjectUnit.findByPk(line.projectUnitId, { transaction });
    if (unit && unit.status === 'available') {
      await unit.update({ status: 'hold' }, { transaction });
    }
  }
}

async function transitionQuotationStatus(companyId, quotationId, nextStatus, userId) {
  if (!QUOTATION_STATUSES.includes(nextStatus)) {
    throw new Error('Invalid quotation status.');
  }

  const quotation = await findCompanyQuotation(companyId, quotationId);
  const current = quotation.status;

  const allowed = {
    draft: ['sent', 'cancelled'],
    sent: ['accepted', 'rejected', 'cancelled', 'expired'],
    accepted: [],
    rejected: [],
    expired: [],
    cancelled: [],
  };

  if (!allowed[current]?.includes(nextStatus)) {
    throw new Error(`Cannot change quotation from ${current} to ${nextStatus}.`);
  }

  const updates = { status: nextStatus };
  const now = new Date();

  if (nextStatus === 'sent') {
    updates.sentAt = now;
  } else if (nextStatus === 'accepted') {
    updates.acceptedAt = now;
  } else if (nextStatus === 'rejected') {
    updates.rejectedAt = now;
  }

  await sequelize.transaction(async (transaction) => {
    await quotation.update(updates, { transaction });

    if (nextStatus === 'accepted') {
      await holdUnitsForQuotation(quotation, transaction);
    }

    if (quotation.leadId) {
      const summaryMap = {
        sent: `Quotation ${quotation.quotationNumber} sent`,
        accepted: `Quotation ${quotation.quotationNumber} accepted`,
        rejected: `Quotation ${quotation.quotationNumber} rejected`,
        cancelled: `Quotation ${quotation.quotationNumber} cancelled`,
      };
      if (summaryMap[nextStatus]) {
        await recordLeadHistoryEvent({
          leadId: quotation.leadId,
          companyId,
          userId,
          action: LEAD_HISTORY_ACTIONS.UPDATED,
          entityType: LEAD_HISTORY_ENTITY_TYPES.QUOTATION,
          entityId: quotation.id,
          summary: summaryMap[nextStatus],
        }, transaction);
      }
    }
  });

  return findCompanyQuotation(companyId, quotation.id);
}

async function searchLeadsForQuotation(companyId, query) {
  const where = { companyId };
  if (query) {
    where[Op.or] = [
      { customerName: { [Op.iLike]: `%${query}%` } },
      { email: { [Op.iLike]: `%${query}%` } },
      { subject: { [Op.iLike]: `%${query}%` } },
    ];
  }

  const leads = await Lead.findAll({
    where,
    attributes: ['id', 'customerName', 'email', 'phone', 'assigneeId'],
    order: [['customerName', 'ASC']],
    limit: 25,
  });

  return leads.map((lead) => ({
    id: lead.id,
    customerName: lead.customerName,
    email: lead.email,
    phone: lead.phone,
    assigneeId: lead.assigneeId,
    label: `${lead.customerName} (${lead.email})`,
  }));
}

async function listUnitsForQuotationProject(companyId, projectId) {
  await assertCompanyProject(companyId, projectId);

  const units = await ProjectUnit.findAll({
    include: [{
      model: ProjectFloor,
      as: 'floor',
      required: true,
      include: [{
        model: ProjectBlock,
        as: 'block',
        required: true,
        where: { projectId },
      }],
    }],
    order: [
      [{ model: ProjectFloor, as: 'floor' }, { model: ProjectBlock, as: 'block' }, 'sortOrder', 'ASC'],
      [{ model: ProjectFloor, as: 'floor' }, 'sortOrder', 'ASC'],
      ['unitNumber', 'ASC'],
    ],
  });

  return units.map((unit) => {
    const blockName = unit.floor?.block?.name || '';
    const description = [blockName, unit.unitNumber, unit.unitType].filter(Boolean).join(' — ');
    return {
      id: unit.id,
      unitNumber: unit.unitNumber,
      unitType: unit.unitType,
      basePrice: unit.basePrice,
      status: unit.status,
      carpetAreaSqft: unit.carpetAreaSqft,
      blockName,
      description,
      label: `${description} (${unit.status})`,
    };
  });
}

function buildFormValuesFromQuotation(quotation) {
  if (!quotation) {
    return {
      issueDate: todayDateOnly(),
      validUntil: '',
      leadId: '',
      projectId: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      assigneeId: '',
      discountAmount: '0',
      notes: '',
      termsAndConditions: '',
      holdUnitsOnAccept: true,
      lineItems: [{ description: '', projectUnitId: '', quantity: '1', unitPrice: '', discountAmount: '0', taxRate: '' }],
    };
  }

  const json = quotation.toJSON ? quotation.toJSON() : quotation;
  return {
    issueDate: json.issueDate,
    validUntil: json.validUntil || '',
    leadId: json.leadId ? String(json.leadId) : '',
    projectId: json.projectId ? String(json.projectId) : '',
    customerName: json.customerName,
    customerEmail: json.customerEmail,
    customerPhone: json.customerPhone || '',
    customerAddress: json.customerAddress || '',
    assigneeId: json.assigneeId ? String(json.assigneeId) : '',
    discountAmount: String(json.discountAmount ?? 0),
    notes: json.notes || '',
    termsAndConditions: json.termsAndConditions || '',
    holdUnitsOnAccept: json.holdUnitsOnAccept !== false,
    lineItems: (json.lineItems || []).map((line) => ({
      description: line.description,
      projectUnitId: line.projectUnitId ? String(line.projectUnitId) : '',
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
      discountAmount: String(line.discountAmount ?? 0),
      taxRate: line.taxRate !== null && line.taxRate !== undefined ? String(line.taxRate) : '',
    })),
  };
}

module.exports = {
  findCompanyQuotation,
  listCompanyQuotationsPaginated,
  listQuotationsForLead,
  countQuotationsForLead,
  getQuotationFormOptions,
  getLeadPrefill,
  normalizeQuotationHeaderInput,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  getQuotationDeleteMeta,
  transitionQuotationStatus,
  searchLeadsForQuotation,
  listUnitsForQuotationProject,
  buildFormValuesFromQuotation,
};
