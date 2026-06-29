const express = require('express');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const {
  listCompanyPipelines,
  getPipelineWithDetails,
  createPipeline,
  updatePipeline,
  deletePipeline,
  createStage,
  updateStage,
  deleteStage,
  createLabel,
  updateLabel,
  deleteLabel,
  syncStages,
  syncLabels,
  DEFAULT_LABEL_COLOR,
} = require('../services/pipelineService');

const router = express.Router();

const VALID_TABS = ['deal', 'labels'];

function resolveActiveTab(tab) {
  return VALID_TABS.includes(tab) ? tab : 'deal';
}

function pipelineEditUrl(pipelineId, { tab, success, error } = {}) {
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
  return `/company/crm-setup/pipelines/${pipelineId}/edit${query ? `?${query}` : ''}`;
}

function groupStages(stages) {
  return (stages || []).filter((stage) => stage.stageType === 'deal');
}

function buildPipelineViewData(pipeline) {
  return {
    pipeline,
    dealStages: groupStages(pipeline.stages),
    labels: pipeline.labels || [],
  };
}

router.get('/pipelines', isCompanyAuthenticated, requirePermission('crm_setup', 'view'), async (req, res) => {
  const pipelines = await listCompanyPipelines(req.session.companyId);

  const pipelineSummaries = pipelines.map((pipeline) => {
    const dealStageCount = (pipeline.stages || []).filter((stage) => stage.stageType === 'deal').length;
    return {
      ...pipeline.toJSON(),
      dealStageCount,
      labelCount: (pipeline.labels || []).length,
    };
  });

  res.render('crm-setup/pipelines/index', withTheme(req, {
    user: buildUserContext(req),
    pipelines: pipelineSummaries,
    success: req.query.success || null,
    error: req.query.error || null,
    activeNav: 'crm-setup-pipelines',
  }));
});

router.get('/pipelines/new', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), (req, res) => {
  res.render('crm-setup/pipelines/create', withTheme(req, {
    user: buildUserContext(req),
    error: null,
    values: {},
    activeNav: 'crm-setup-pipelines',
  }));
});

router.post('/pipelines', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { name, description } = req.body;
  const values = { name, description };

  function renderCreate(error) {
    return res.render('crm-setup/pipelines/create', withTheme(req, {
      user: buildUserContext(req),
      error,
      values,
      activeNav: 'crm-setup-pipelines',
    }));
  }

  try {
    const pipeline = await createPipeline(req.session.companyId, { name, description });
    res.redirect(pipelineEditUrl(pipeline.id, { success: 'Pipeline created successfully.' }));
  } catch (error) {
    return renderCreate(error.message || 'Unable to create pipeline. Please try again.');
  }
});

router.get('/pipelines/:id', isCompanyAuthenticated, requirePermission('crm_setup', 'view'), async (req, res) => {
  const pipeline = await getPipelineWithDetails(req.session.companyId, req.params.id);

  if (!pipeline) {
    return res.redirect('/company/crm-setup/pipelines');
  }

  res.render('crm-setup/pipelines/show', withTheme(req, {
    user: buildUserContext(req),
    ...buildPipelineViewData(pipeline),
    activeTab: resolveActiveTab(req.query.tab),
    defaultLabelColor: DEFAULT_LABEL_COLOR,
    activeNav: 'crm-setup-pipelines',
  }));
});

router.get('/pipelines/:id/edit', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const pipeline = await getPipelineWithDetails(req.session.companyId, req.params.id);

  if (!pipeline) {
    return res.redirect('/company/crm-setup/pipelines');
  }

  res.render('crm-setup/pipelines/edit', withTheme(req, {
    user: buildUserContext(req),
    ...buildPipelineViewData(pipeline),
    error: req.query.error || null,
    values: {},
    success: req.query.success || null,
    activeTab: resolveActiveTab(req.query.tab),
    defaultLabelColor: DEFAULT_LABEL_COLOR,
    activeNav: 'crm-setup-pipelines',
  }));
});

router.post('/pipelines/:id/edit', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { name, description } = req.body;
  const pipeline = await getPipelineWithDetails(req.session.companyId, req.params.id);

  if (!pipeline) {
    return res.redirect('/company/crm-setup/pipelines');
  }

  const viewData = buildPipelineViewData(pipeline);
  const values = { name, description };
  const activeTab = resolveActiveTab(req.query.tab);

  function renderEdit(error) {
    return res.render('crm-setup/pipelines/edit', withTheme(req, {
      user: buildUserContext(req),
      ...viewData,
      error,
      values,
      success: null,
      activeTab,
      defaultLabelColor: DEFAULT_LABEL_COLOR,
      activeNav: 'crm-setup-pipelines',
    }));
  }

  try {
    await updatePipeline(req.session.companyId, pipeline.id, { name, description });
    res.redirect(pipelineEditUrl(pipeline.id, { tab: activeTab, success: 'Pipeline updated successfully.' }));
  } catch (error) {
    return renderEdit(error.message || 'Unable to update pipeline. Please try again.');
  }
});

router.post('/pipelines/:id/delete', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  try {
    await deletePipeline(req.session.companyId, req.params.id);
    res.redirect('/company/crm-setup/pipelines?success=Pipeline deleted successfully.');
  } catch (error) {
    res.redirect(`/company/crm-setup/pipelines?error=${encodeURIComponent(error.message || 'Unable to delete pipeline.')}`);
  }
});

router.post('/pipelines/:id/stages/sync', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { stageType, stages, deletedIds } = req.body;
  const pipelineId = req.params.id;

  try {
    await syncStages(req.session.companyId, pipelineId, stageType, {
      items: stages,
      deletedIds,
    });
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'deal', success: 'Stages saved successfully.' }));
  } catch (error) {
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'deal', error: error.message || 'Unable to save stages.' }));
  }
});

router.post('/pipelines/:id/labels/sync', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { labels, deletedIds } = req.body;
  const pipelineId = req.params.id;

  try {
    await syncLabels(req.session.companyId, pipelineId, {
      items: labels,
      deletedIds,
    });
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'labels', success: 'Labels saved successfully.' }));
  } catch (error) {
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'labels', error: error.message || 'Unable to save labels.' }));
  }
});

router.post('/pipelines/:id/stages', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { stageType, name } = req.body;
  const pipelineId = req.params.id;

  try {
    await createStage(req.session.companyId, pipelineId, { stageType, name });
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'deal', success: 'Stage added successfully.' }));
  } catch (error) {
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'deal', error: error.message || 'Unable to add stage.' }));
  }
});

router.post('/pipelines/:id/stages/:stageId/edit', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { name, sortOrder } = req.body;
  const { id: pipelineId, stageId } = req.params;
  const tab = resolveActiveTab(req.query.tab);

  try {
    await updateStage(req.session.companyId, pipelineId, stageId, { name, sortOrder });
    res.redirect(pipelineEditUrl(pipelineId, { tab, success: 'Stage updated successfully.' }));
  } catch (error) {
    res.redirect(pipelineEditUrl(pipelineId, { tab, error: error.message || 'Unable to update stage.' }));
  }
});

router.post('/pipelines/:id/stages/:stageId/delete', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { id: pipelineId, stageId } = req.params;
  const tab = resolveActiveTab(req.query.tab);

  try {
    await deleteStage(req.session.companyId, pipelineId, stageId);
    res.redirect(pipelineEditUrl(pipelineId, { tab, success: 'Stage deleted successfully.' }));
  } catch (error) {
    res.redirect(pipelineEditUrl(pipelineId, { tab, error: error.message || 'Unable to delete stage.' }));
  }
});

router.post('/pipelines/:id/labels', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { name, color } = req.body;
  const pipelineId = req.params.id;

  try {
    await createLabel(req.session.companyId, pipelineId, { name, color });
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'labels', success: 'Label added successfully.' }));
  } catch (error) {
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'labels', error: error.message || 'Unable to add label.' }));
  }
});

router.post('/pipelines/:id/labels/:labelId/edit', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { name, color, sortOrder } = req.body;
  const { id: pipelineId, labelId } = req.params;

  try {
    await updateLabel(req.session.companyId, pipelineId, labelId, { name, color, sortOrder });
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'labels', success: 'Label updated successfully.' }));
  } catch (error) {
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'labels', error: error.message || 'Unable to update label.' }));
  }
});

router.post('/pipelines/:id/labels/:labelId/delete', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { id: pipelineId, labelId } = req.params;

  try {
    await deleteLabel(req.session.companyId, pipelineId, labelId);
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'labels', success: 'Label deleted successfully.' }));
  } catch (error) {
    res.redirect(pipelineEditUrl(pipelineId, { tab: 'labels', error: error.message || 'Unable to delete label.' }));
  }
});

module.exports = router;
