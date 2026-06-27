document.addEventListener('DOMContentLoaded', function () {
  const passwordInput = document.querySelector('#password');
  const toggleButton = document.querySelector('#password-addon');
  if (!passwordInput || !toggleButton) return;

  toggleButton.addEventListener('click', function () {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleButton.textContent = isPassword ? 'Hide' : 'Show';
  });
});
