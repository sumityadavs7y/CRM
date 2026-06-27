const express = require('express');
const { isCompanyAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/companyFeatures');
const { withTheme } = require('../utils/themes');
const { buildUserContext } = require('../utils/sessionUser');
const {
  listCompanyPipelines,
  getPipelineWithStages,
  createPipeline,
  updatePipeline,
  deletePipeline,
  createStage,
  updateStage,
  deleteStage,
} = require('../services/pipelineService');

const router = express.Router();

function groupStages(stages) {
  const leadStages = [];
  const dealStages = [];

  (stages || []).forEach((stage) => {
    if (stage.stageType === 'lead') {
      leadStages.push(stage);
    } else if (stage.stageType === 'deal') {
      dealStages.push(stage);
    }
  });

  return { leadStages, dealStages };
}

function countStagesByType(stages) {
  const counts = { lead: 0, deal: 0 };
  (stages || []).forEach((stage) => {
    if (counts[stage.stageType] !== undefined) {
      counts[stage.stageType] += 1;
    }
  });
  return counts;
}

router.get('/pipelines', isCompanyAuthenticated, requirePermission('crm_setup', 'view'), async (req, res) => {
  const pipelines = await listCompanyPipelines(req.session.companyId);

  const pipelineSummaries = pipelines.map((pipeline) => {
    const counts = countStagesByType(pipeline.stages);
    return {
      ...pipeline.toJSON(),
      leadStageCount: counts.lead,
      dealStageCount: counts.deal,
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
    res.redirect(`/company/crm-setup/pipelines/${pipeline.id}/edit?success=Pipeline created successfully.`);
  } catch (error) {
    return renderCreate(error.message || 'Unable to create pipeline. Please try again.');
  }
});

router.get('/pipelines/:id', isCompanyAuthenticated, requirePermission('crm_setup', 'view'), async (req, res) => {
  const pipeline = await getPipelineWithStages(req.session.companyId, req.params.id);

  if (!pipeline) {
    return res.redirect('/company/crm-setup/pipelines');
  }

  const { leadStages, dealStages } = groupStages(pipeline.stages);

  res.render('crm-setup/pipelines/show', withTheme(req, {
    user: buildUserContext(req),
    pipeline,
    leadStages,
    dealStages,
    activeNav: 'crm-setup-pipelines',
  }));
});

router.get('/pipelines/:id/edit', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const pipeline = await getPipelineWithStages(req.session.companyId, req.params.id);

  if (!pipeline) {
    return res.redirect('/company/crm-setup/pipelines');
  }

  const { leadStages, dealStages } = groupStages(pipeline.stages);

  res.render('crm-setup/pipelines/edit', withTheme(req, {
    user: buildUserContext(req),
    pipeline,
    leadStages,
    dealStages,
    error: null,
    values: {},
    success: req.query.success || null,
    activeNav: 'crm-setup-pipelines',
  }));
});

router.post('/pipelines/:id/edit', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { name, description } = req.body;
  const pipeline = await getPipelineWithStages(req.session.companyId, req.params.id);

  if (!pipeline) {
    return res.redirect('/company/crm-setup/pipelines');
  }

  const { leadStages, dealStages } = groupStages(pipeline.stages);
  const values = { name, description };

  function renderEdit(error) {
    return res.render('crm-setup/pipelines/edit', withTheme(req, {
      user: buildUserContext(req),
      pipeline,
      leadStages,
      dealStages,
      error,
      values,
      success: null,
      activeNav: 'crm-setup-pipelines',
    }));
  }

  try {
    await updatePipeline(req.session.companyId, pipeline.id, { name, description });
    res.redirect(`/company/crm-setup/pipelines/${pipeline.id}/edit?success=Pipeline updated successfully.`);
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

router.post('/pipelines/:id/stages', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { stageType, name } = req.body;
  const pipelineId = req.params.id;

  try {
    await createStage(req.session.companyId, pipelineId, { stageType, name });
    res.redirect(`/company/crm-setup/pipelines/${pipelineId}/edit?success=Stage added successfully.`);
  } catch (error) {
    res.redirect(`/company/crm-setup/pipelines/${pipelineId}/edit?error=${encodeURIComponent(error.message || 'Unable to add stage.')}`);
  }
});

router.post('/pipelines/:id/stages/:stageId/edit', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { name, sortOrder } = req.body;
  const { id: pipelineId, stageId } = req.params;

  try {
    await updateStage(req.session.companyId, pipelineId, stageId, { name, sortOrder });
    res.redirect(`/company/crm-setup/pipelines/${pipelineId}/edit?success=Stage updated successfully.`);
  } catch (error) {
    res.redirect(`/company/crm-setup/pipelines/${pipelineId}/edit?error=${encodeURIComponent(error.message || 'Unable to update stage.')}`);
  }
});

router.post('/pipelines/:id/stages/:stageId/delete', isCompanyAuthenticated, requirePermission('crm_setup', 'edit'), async (req, res) => {
  const { id: pipelineId, stageId } = req.params;

  try {
    await deleteStage(req.session.companyId, pipelineId, stageId);
    res.redirect(`/company/crm-setup/pipelines/${pipelineId}/edit?success=Stage deleted successfully.`);
  } catch (error) {
    res.redirect(`/company/crm-setup/pipelines/${pipelineId}/edit?error=${encodeURIComponent(error.message || 'Unable to delete stage.')}`);
  }
});

module.exports = router;
