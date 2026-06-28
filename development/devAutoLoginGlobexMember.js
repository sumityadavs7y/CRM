const { DUMMY_ACCOUNTS } = require('./dummyAccounts');
const { createCompanyAutoLogin } = require('./companyAutoLogin');

const devAutoLoginGlobexMember = createCompanyAutoLogin(
  DUMMY_ACCOUNTS.globexMemberEmail,
  'Globex member',
);

module.exports = {
  devAutoLoginGlobexMember,
};
