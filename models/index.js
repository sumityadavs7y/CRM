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
const ProjectModel = require('./Project');
const ProjectPhaseModel = require('./ProjectPhase');
const ProjectBlockModel = require('./ProjectBlock');
const ProjectFloorModel = require('./ProjectFloor');
const ProjectUnitModel = require('./ProjectUnit');
const ProjectReraRegistrationModel = require('./ProjectReraRegistration');
const MediaFolderModel = require('./MediaFolder');
const MediaFileModel = require('./MediaFile');

const User = UserModel(sequelize, Sequelize.DataTypes);
const Company = CompanyModel(sequelize, Sequelize.DataTypes);
const CompanyCredential = CompanyCredentialModel(sequelize, Sequelize.DataTypes);
const CompanyRole = CompanyRoleModel(sequelize, Sequelize.DataTypes);
const SubscriptionPlan = SubscriptionPlanModel(sequelize, Sequelize.DataTypes);
const CompanySubscription = CompanySubscriptionModel(sequelize, Sequelize.DataTypes);
const Pipeline = PipelineModel(sequelize, Sequelize.DataTypes);
const PipelineStage = PipelineStageModel(sequelize, Sequelize.DataTypes);
const PipelineLabel = PipelineLabelModel(sequelize, Sequelize.DataTypes);
const Project = ProjectModel(sequelize, Sequelize.DataTypes);
const ProjectPhase = ProjectPhaseModel(sequelize, Sequelize.DataTypes);
const ProjectBlock = ProjectBlockModel(sequelize, Sequelize.DataTypes);
const ProjectFloor = ProjectFloorModel(sequelize, Sequelize.DataTypes);
const ProjectUnit = ProjectUnitModel(sequelize, Sequelize.DataTypes);
const ProjectReraRegistration = ProjectReraRegistrationModel(sequelize, Sequelize.DataTypes);
const MediaFolder = MediaFolderModel(sequelize, Sequelize.DataTypes);
const MediaFile = MediaFileModel(sequelize, Sequelize.DataTypes);

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

Company.hasMany(Project, { foreignKey: 'companyId', as: 'projects' });
Project.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Project.hasMany(ProjectPhase, { foreignKey: 'projectId', as: 'phases' });
ProjectPhase.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Project.hasMany(ProjectBlock, { foreignKey: 'projectId', as: 'blocks' });
ProjectBlock.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
ProjectPhase.hasMany(ProjectBlock, { foreignKey: 'phaseId', as: 'blocks' });
ProjectBlock.belongsTo(ProjectPhase, { foreignKey: 'phaseId', as: 'phase' });

ProjectBlock.hasMany(ProjectFloor, { foreignKey: 'blockId', as: 'floors' });
ProjectFloor.belongsTo(ProjectBlock, { foreignKey: 'blockId', as: 'block' });

ProjectFloor.hasMany(ProjectUnit, { foreignKey: 'floorId', as: 'units' });
ProjectUnit.belongsTo(ProjectFloor, { foreignKey: 'floorId', as: 'floor' });

Project.hasMany(ProjectReraRegistration, { foreignKey: 'projectId', as: 'reraRegistrations' });
ProjectReraRegistration.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Company.hasMany(MediaFolder, { foreignKey: 'companyId', as: 'mediaFolders' });
MediaFolder.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Company.hasMany(MediaFile, { foreignKey: 'companyId', as: 'mediaFiles' });
MediaFile.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
MediaFile.belongsTo(MediaFolder, { foreignKey: 'folderId', as: 'folder' });
MediaFolder.hasMany(MediaFile, { foreignKey: 'folderId', as: 'files' });
MediaFile.belongsTo(CompanyCredential, { foreignKey: 'uploadedById', as: 'uploadedBy' });
CompanyCredential.hasMany(MediaFile, { foreignKey: 'uploadedById', as: 'uploadedMediaFiles' });

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
  Project,
  ProjectPhase,
  ProjectBlock,
  ProjectFloor,
  ProjectUnit,
  ProjectReraRegistration,
  MediaFolder,
  MediaFile,
};
