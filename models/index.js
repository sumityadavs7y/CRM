const { sequelize, Sequelize, testConnection } = require('./sequelize');
const UserModel = require('./User');
const CompanyModel = require('./Company');
const CompanyCredentialModel = require('./CompanyCredential');
const CompanyRoleModel = require('./CompanyRole');
const SubscriptionPlanModel = require('./SubscriptionPlan');
const CompanySubscriptionModel = require('./CompanySubscription');
const PipelineModel = require('./Pipeline');
const PipelineStageModel = require('./PipelineStage');
const PipelineLabelModel = require('./PipelineLabel');
const SourceModel = require('./Source');
const LeadModel = require('./Lead');
const LeadCommunicationModel = require('./LeadCommunication');
const LeadDiscussionModel = require('./LeadDiscussion');
const LeadTaskModel = require('./LeadTask');
const LeadHistoryEventModel = require('./LeadHistoryEvent');

const User = UserModel(sequelize, Sequelize.DataTypes);
const Company = CompanyModel(sequelize, Sequelize.DataTypes);
const CompanyCredential = CompanyCredentialModel(sequelize, Sequelize.DataTypes);
const CompanyRole = CompanyRoleModel(sequelize, Sequelize.DataTypes);
const SubscriptionPlan = SubscriptionPlanModel(sequelize, Sequelize.DataTypes);
const CompanySubscription = CompanySubscriptionModel(sequelize, Sequelize.DataTypes);
const Pipeline = PipelineModel(sequelize, Sequelize.DataTypes);
const PipelineStage = PipelineStageModel(sequelize, Sequelize.DataTypes);
const PipelineLabel = PipelineLabelModel(sequelize, Sequelize.DataTypes);
const Source = SourceModel(sequelize, Sequelize.DataTypes);
const Lead = LeadModel(sequelize, Sequelize.DataTypes);
const LeadCommunication = LeadCommunicationModel(sequelize, Sequelize.DataTypes);
const LeadDiscussion = LeadDiscussionModel(sequelize, Sequelize.DataTypes);
const LeadTask = LeadTaskModel(sequelize, Sequelize.DataTypes);
const LeadHistoryEvent = LeadHistoryEventModel(sequelize, Sequelize.DataTypes);

Company.hasMany(CompanyCredential, { foreignKey: 'companyId', as: 'credentials' });
CompanyCredential.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Company.hasMany(CompanyRole, { foreignKey: 'companyId', as: 'roles' });
CompanyRole.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

CompanyRole.hasMany(CompanyCredential, { foreignKey: 'companyRoleId', as: 'credentials' });
CompanyCredential.belongsTo(CompanyRole, { foreignKey: 'companyRoleId', as: 'companyRole' });

Company.hasOne(CompanySubscription, { foreignKey: 'companyId', as: 'subscription' });
CompanySubscription.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
CompanySubscription.belongsTo(SubscriptionPlan, { foreignKey: 'subscriptionPlanId', as: 'plan' });

SubscriptionPlan.hasMany(CompanySubscription, { foreignKey: 'subscriptionPlanId', as: 'companySubscriptions' });

Company.hasMany(Pipeline, { foreignKey: 'companyId', as: 'pipelines' });
Pipeline.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Pipeline.hasMany(PipelineStage, { foreignKey: 'pipelineId', as: 'stages' });
PipelineStage.belongsTo(Pipeline, { foreignKey: 'pipelineId', as: 'pipeline' });

Pipeline.hasMany(PipelineLabel, { foreignKey: 'pipelineId', as: 'labels' });
PipelineLabel.belongsTo(Pipeline, { foreignKey: 'pipelineId', as: 'pipeline' });

Company.hasMany(Source, { foreignKey: 'companyId', as: 'sources' });
Source.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Company.hasMany(Lead, { foreignKey: 'companyId', as: 'leads' });
Lead.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Lead.belongsTo(CompanyCredential, { foreignKey: 'assigneeId', as: 'assignee' });
CompanyCredential.hasMany(Lead, { foreignKey: 'assigneeId', as: 'assignedLeads' });

Lead.belongsTo(Pipeline, { foreignKey: 'pipelineId', as: 'pipeline' });
Pipeline.hasMany(Lead, { foreignKey: 'pipelineId', as: 'leads' });

Lead.belongsTo(PipelineStage, { foreignKey: 'stageId', as: 'stage' });
PipelineStage.hasMany(Lead, { foreignKey: 'stageId', as: 'leads' });

Lead.belongsToMany(Source, {
  through: 'LeadSources',
  foreignKey: 'leadId',
  otherKey: 'sourceId',
  as: 'sources',
});
Source.belongsToMany(Lead, {
  through: 'LeadSources',
  foreignKey: 'sourceId',
  otherKey: 'leadId',
  as: 'leads',
});

Lead.hasMany(LeadCommunication, { foreignKey: 'leadId', as: 'communications' });
LeadCommunication.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

Lead.hasMany(LeadDiscussion, { foreignKey: 'leadId', as: 'discussions' });
LeadDiscussion.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
LeadDiscussion.belongsTo(CompanyCredential, { foreignKey: 'userId', as: 'user' });
CompanyCredential.hasMany(LeadDiscussion, { foreignKey: 'userId', as: 'leadDiscussions' });

Lead.hasMany(LeadTask, { foreignKey: 'leadId', as: 'tasks' });
LeadTask.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });

Lead.hasMany(LeadHistoryEvent, { foreignKey: 'leadId', as: 'historyEvents' });
LeadHistoryEvent.belongsTo(Lead, { foreignKey: 'leadId', as: 'lead' });
LeadHistoryEvent.belongsTo(CompanyCredential, { foreignKey: 'userId', as: 'user' });
CompanyCredential.hasMany(LeadHistoryEvent, { foreignKey: 'userId', as: 'leadHistoryEvents' });

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  User,
  Company,
  CompanyCredential,
  CompanyRole,
  SubscriptionPlan,
  CompanySubscription,
  Pipeline,
  PipelineStage,
  PipelineLabel,
  Source,
  Lead,
  LeadCommunication,
  LeadDiscussion,
  LeadTask,
  LeadHistoryEvent,
};
