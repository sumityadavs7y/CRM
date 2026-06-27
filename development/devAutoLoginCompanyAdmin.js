const { DUMMY_ACCOUNTS } = require('./dummyAccounts');
const { createCompanyAutoLogin } = require('./companyAutoLogin');

const devAutoLoginCompanyAdmin = createCompanyAutoLogin(
  DUMMY_ACCOUNTS.companyAdminEmail,
  'company admin',
);

module.exports = {
  devAutoLoginCompanyAdmin,
};
