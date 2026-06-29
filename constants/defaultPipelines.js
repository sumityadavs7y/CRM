const DEFAULT_PIPELINES = [
  {
    name: 'Sales',
    slug: 'sales',
    dealStages: ['Meeting', 'Proposal', 'Close'],
  },
  {
    name: 'Marketing',
    slug: 'marketing',
    dealStages: ['Campaign Launch', 'Lead Generation', 'Nurturing', 'Qualification', 'Handoff'],
  },
  {
    name: 'Lead Qualification',
    slug: 'lead-qualification',
    dealStages: ['Initial Contact', 'Needs Assessment', 'Solution fit', 'Proposal sent', 'Decision'],
  },
];

const CUSTOM_PIPELINE_DEAL_STAGES = ['Discovery', 'Proposal', 'Close'];

module.exports = {
  DEFAULT_PIPELINES,
  CUSTOM_PIPELINE_DEAL_STAGES,
};
