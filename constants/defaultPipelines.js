const DEFAULT_PIPELINES = [
  {
    name: 'Sales',
    slug: 'sales',
    leadStages: ['Draft', 'Sent', 'Open', 'Revised', 'Declined', 'Accepted'],
    dealStages: ['Meeting', 'Proposal', 'Close'],
  },
  {
    name: 'Marketing',
    slug: 'marketing',
    leadStages: ['Prospect', 'Contacted', 'Engaged', 'Qualified', 'Converted'],
    dealStages: ['Campaign Launch', 'Lead Generation', 'Nurturing', 'Qualification', 'Handoff'],
  },
  {
    name: 'Lead Qualification',
    slug: 'lead-qualification',
    leadStages: ['Unqualified', 'In Review', 'Qualified', 'Approved', 'Rejected'],
    dealStages: ['Initial Contact', 'Needs Assessment', 'Solution fit', 'Proposal sent', 'Decision'],
  },
];

const CUSTOM_PIPELINE_LEAD_STAGES = ['New', 'In Progress', 'Won'];
const CUSTOM_PIPELINE_DEAL_STAGES = ['Discovery', 'Proposal', 'Close'];

module.exports = {
  DEFAULT_PIPELINES,
  CUSTOM_PIPELINE_LEAD_STAGES,
  CUSTOM_PIPELINE_DEAL_STAGES,
};
