const { DUMMY_ACCOUNTS } = require('./dummyAccounts');
const { createCompanyAutoLogin } = require('./companyAutoLogin');

const devAutoLoginCompanyMember = createCompanyAutoLogin(
  DUMMY_ACCOUNTS.companyMemberEmail,
  'company member',
);

module.exports = {
  devAutoLoginCompanyMember,
};
