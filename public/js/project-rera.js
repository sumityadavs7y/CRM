(function () {
  const config = window.projectDetailConfig || {};
  const projectId = config.projectId;
  if (!projectId || !config.canEdit) {
    return;
  }

  function getModal(id) {
    const el = document.getElementById(id);
    if (!el || !window.bootstrap) {
      return null;
    }
    return window.bootstrap.Modal.getOrCreateInstance(el);
  }

  function parseJsonAttr(button, attr) {
    const raw = button.getAttribute(attr);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  let editingReraId = null;

  function showFormError(message) {
    const errorEl = document.getElementById('reraFormError');
    errorEl.textContent = message;
    errorEl.classList.remove('d-none');
  }

  function clearFormError() {
    const errorEl = document.getElementById('reraFormError');
    errorEl.textContent = '';
    errorEl.classList.add('d-none');
  }

  async function submitJson(url, method, body) {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'fetch',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Request failed.');
    }
    return data;
  }

  function reloadReraTab() {
    window.location.href = `/company/projects/${projectId}?tab=rera&success=Saved+successfully.`;
  }

  function getFormData(form) {
    const formData = new FormData(form);
    const body = {};
    formData.forEach((value, key) => {
      if (value !== '') {
        body[key] = value;
      }
    });
    return body;
  }

  function openReraModal(reg) {
    const reraModal = getModal('reraModal');
    if (!reraModal) {
      return;
    }

    editingReraId = reg ? reg.id : null;
    document.getElementById('reraModalLabel').textContent = reg ? 'Edit RERA Registration' : 'Add RERA Registration';
    document.getElementById('registrationNumber').value = reg ? reg.registrationNumber : '';
    document.getElementById('reraState').value = reg ? reg.state : '';
    document.getElementById('promoterName').value = reg ? (reg.promoterName || '') : '';
    document.getElementById('projectNameOnRera').value = reg ? (reg.projectNameOnRera || '') : '';
    document.getElementById('validFrom').value = reg ? (reg.validFrom || '') : '';
    document.getElementById('validUntil').value = reg ? (reg.validUntil || '') : '';
    document.getElementById('reraStatus').value = reg ? reg.status : 'pending';
    document.getElementById('reraPortalUrl').value = reg ? (reg.reraPortalUrl || '') : '';
    document.getElementById('reraNotes').value = reg ? (reg.notes || '') : '';
    clearFormError();
    reraModal.show();
  }

  function init() {
    const reraForm = document.getElementById('reraForm');
    if (!reraForm) {
      return;
    }

    reraForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearFormError();

      try {
        const body = getFormData(event.target);
        if (editingReraId) {
          await submitJson(`/company/projects/${projectId}/rera/${editingReraId}`, 'PATCH', body);
        } else {
          await submitJson(`/company/projects/${projectId}/rera`, 'POST', body);
        }
        getModal('reraModal')?.hide();
        reloadReraTab();
      } catch (error) {
        showFormError(error.message);
      }
    });

    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-rera-action]');
      if (!button) {
        return;
      }

      event.preventDefault();
      const action = button.getAttribute('data-rera-action');

      if (action === 'add') {
        openReraModal(null);
        return;
      }

      if (action === 'edit') {
        openReraModal(parseJsonAttr(button, 'data-rera'));
        return;
      }

      if (action === 'delete') {
        if (!confirm('Delete this RERA registration?')) {
          return;
        }
        const reraId = button.getAttribute('data-rera-id');
        await submitJson(`/company/projects/${projectId}/rera/${reraId}/delete`, 'POST');
        reloadReraTab();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
