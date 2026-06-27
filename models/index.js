const { sequelize, Sequelize, testConnection } = require('./sequelize');
const UserModel = require('./User');
const CompanyModel = require('./Company');
const CompanyCredentialModel = require('./CompanyCredential');
const CompanyRoleModel = require('./CompanyRole');
const SubscriptionPlanModel = require('./SubscriptionPlan');
const CompanySubscriptionModel = require('./CompanySubscription');
const PipelineModel = require('./Pipeline');
const PipelineStageModel = require('./PipelineStage');

const User = UserModel(sequelize, Sequelize.DataTypes);
const Company = CompanyModel(sequelize, Sequelize.DataTypes);
const CompanyCredential = CompanyCredentialModel(sequelize, Sequelize.DataTypes);
const CompanyRole = CompanyRoleModel(sequelize, Sequelize.DataTypes);
const SubscriptionPlan = SubscriptionPlanModel(sequelize, Sequelize.DataTypes);
const CompanySubscription = CompanySubscriptionModel(sequelize, Sequelize.DataTypes);
const Pipeline = PipelineModel(sequelize, Sequelize.DataTypes);
const PipelineStage = PipelineStageModel(sequelize, Sequelize.DataTypes);

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
};
