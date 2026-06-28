const { DUMMY_ACCOUNTS } = require('./dummyAccounts');
const { createCompanyAutoLogin } = require('./companyAutoLogin');

const devAutoLoginGlobexAdmin = createCompanyAutoLogin(
  DUMMY_ACCOUNTS.globexAdminEmail,
  'Globex admin',
);

module.exports = {
  devAutoLoginGlobexAdmin,
};
