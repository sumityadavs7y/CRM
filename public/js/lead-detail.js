(function () {
  const dataEl = document.getElementById('lead-detail-data');
  if (!dataEl) {
    return;
  }

  let config;
  try {
    config = JSON.parse(dataEl.textContent);
  } catch {
    return;
  }

  const state = { ...config.lead };
  let activeEditContainer = null;
  let notesQuill = null;
  let sourcesSelect = null;

  function displayValue(value, emptyLabel) {
    if (value === null || value === undefined || value === '') {
      return emptyLabel || '—';
    }
    return String(value);
  }

  function setFieldStatus(container, type, message) {
    let status = container.querySelector('.lead-field-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'lead-field-status';
      container.appendChild(status);
    }
    status.className = `lead-field-status is-${type}`;
    status.textContent = message || '';
  }

  function clearFieldStatus(container) {
    const status = container.querySelector('.lead-field-status');
    if (status) {
      status.remove();
    }
  }

  async function patchField(field, value) {
    const response = await fetch(config.patchUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'fetch',
      },
      body: JSON.stringify({ [field]: value }),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Unable to save changes.');
    }

    Object.assign(state, result.lead);
    if (result.lead.sources) {
      state.sourceIds = result.lead.sources.map((source) => source.id);
    }
    return result.lead;
  }

  async function patchFields(payload) {
    const response = await fetch(config.patchUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'fetch',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || 'Unable to save changes.');
    }

    Object.assign(state, result.lead);
    if (result.lead.sources) {
      state.sourceIds = result.lead.sources.map((source) => source.id);
    }
    return result.lead;
  }

  function getPipelineStages(pipelineId) {
    const pipeline = config.pipelineStageMap.find(
      (entry) => String(entry.id) === String(pipelineId)
    );
    return pipeline ? pipeline.stages : [];
  }

  function createActionButtons(onSave, onCancel) {
    const actions = document.createElement('div');
    actions.className = 'inline-field-actions';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-sm btn-success inline-field-save';
    saveBtn.title = 'Save';
    saveBtn.innerHTML = '<i class="ri-check-line"></i>';
    saveBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      onSave();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-sm btn-light inline-field-cancel';
    cancelBtn.title = 'Cancel';
    cancelBtn.innerHTML = '<i class="ri-close-line"></i>';
    cancelBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      onCancel();
    });

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    return actions;
  }

  function closeActiveEdit() {
    if (activeEditContainer && activeEditContainer._cancelEdit) {
      activeEditContainer._cancelEdit();
    }
  }

  function restoreDisplay(container, html) {
    container.classList.remove('is-editing');
    container.innerHTML = html;
    delete container._cancelEdit;
    if (activeEditContainer === container) {
      activeEditContainer = null;
    }
  }

  function renderSourcesDisplay(sourceIds) {
    const ids = sourceIds || [];
    if (!ids.length) {
      return '<span class="inline-field-display is-empty"></span>';
    }

    const badges = ids.map((id) => {
      const source = config.sources.find((entry) => String(entry.id) === String(id));
      if (!source) {
        return '';
      }
      return `<span class="badge bg-secondary-subtle text-secondary me-1">${source.name}</span>`;
    }).filter(Boolean).join('');

    return `<span class="inline-field-display">${badges}</span>`;
  }

  function buildSourcesEditorHtml() {
    const options = config.sources.map((source) => {
      const selected = (state.sourceIds || []).includes(source.id);
      return `<option value="${source.id}"${selected ? ' selected' : ''}>${source.name}</option>`;
    }).join('');

    return `<div class="inline-field-editor lead-sources-editor"><div class="lead-sources-editor-row"><div class="lead-sources-select-wrap"><select id="leadSourcesSelect" multiple>${options}</select></div><div class="inline-field-actions-slot"></div></div></div>`;
  }

  function buildNotesEditorHtml() {
    return `<div class="inline-field-editor"><div id="leadNotesEditor" class="lead-notes-editor"></div></div>`;
  }

  function finishTextEdit(container, display) {
    restoreDisplay(container, `<span class="inline-field-display">${display}</span>`);
  }

  function startTextEdit(container) {
    closeActiveEdit();

    const field = container.dataset.field;
    const currentValue = state[field] || '';
    const emptyLabel = container.dataset.empty || '—';

    container.classList.add('is-editing');
    activeEditContainer = container;

    const editor = document.createElement('div');
    editor.className = 'inline-field-editor';

    const input = document.createElement('input');
    input.type = container.dataset.type === 'date' ? 'date' : 'text';
    input.className = 'form-control inline-field-input';
    input.value = currentValue;

    editor.appendChild(input);

    const cancel = () => {
      finishTextEdit(container, displayValue(currentValue, emptyLabel));
      clearFieldStatus(container);
    };

    container._cancelEdit = cancel;

    const save = async () => {
      const newValue = input.value.trim();
      if (field !== 'phone' && field !== 'followUpDate' && !newValue) {
        setFieldStatus(container, 'error', 'This field is required.');
        return;
      }

      if (String(newValue) === String(currentValue || '')) {
        cancel();
        return;
      }

      setFieldStatus(container, 'saving', 'Saving…');
      try {
        const updated = await patchField(field, newValue || null);
        state[field] = updated[field] || '';
        finishTextEdit(container, displayValue(updated[field], emptyLabel));
        setFieldStatus(container, 'saved', 'Saved');
        setTimeout(() => clearFieldStatus(container), 1500);

        if (field === 'customerName') {
          const titleEl = document.querySelector('.page-title-box h4');
          if (titleEl) {
            titleEl.textContent = updated.customerName;
          }
        }
      } catch (error) {
        setFieldStatus(container, 'error', error.message);
      }
    };

    editor.appendChild(createActionButtons(save, cancel));
    container.innerHTML = '';
    container.appendChild(editor);
    input.focus();
    input.select?.();

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    });
  }

  function buildSelect(options, currentValue, includeEmpty) {
    const select = document.createElement('select');
    select.className = 'form-select inline-field-select';

    if (includeEmpty) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = 'None';
      select.appendChild(emptyOption);
    }

    options.forEach((option) => {
      const el = document.createElement('option');
      el.value = String(option.value);
      el.textContent = option.label;
      if (String(option.value) === String(currentValue)) {
        el.selected = true;
      }
      select.appendChild(el);
    });

    return select;
  }

  function startSelectEdit(container, options, currentValue, includeEmpty, onSaveSuccess) {
    closeActiveEdit();

    container.classList.add('is-editing');
    activeEditContainer = container;

    const editor = document.createElement('div');
    editor.className = 'inline-field-editor';

    const select = buildSelect(options, currentValue, includeEmpty);
    editor.appendChild(select);

    const cancel = () => {
      restoreDisplay(
        container,
        `<span class="inline-field-display">${container.dataset.display || '—'}</span>`
      );
      clearFieldStatus(container);
    };

    container._cancelEdit = cancel;

    const save = async () => {
      const newValue = select.value;
      if (String(newValue) === String(currentValue || '')) {
        cancel();
        return;
      }

      setFieldStatus(container, 'saving', 'Saving…');
      try {
        await onSaveSuccess(newValue || null);
        restoreDisplay(
          container,
          `<span class="inline-field-display">${container.dataset.display || '—'}</span>`
        );
        setFieldStatus(container, 'saved', 'Saved');
        setTimeout(() => clearFieldStatus(container), 1500);
      } catch (error) {
        setFieldStatus(container, 'error', error.message);
      }
    };

    editor.appendChild(createActionButtons(save, cancel));
    container.innerHTML = '';
    container.appendChild(editor);
    select.focus();

    select.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    });
  }

  function startSourcesEdit(container) {
    closeActiveEdit();

    const currentIds = [...(state.sourceIds || [])];
    container.classList.add('is-editing');
    activeEditContainer = container;

    container.innerHTML = buildSourcesEditorHtml();
    const selectEl = container.querySelector('#leadSourcesSelect');

    try {
      sourcesSelect = new TomSelect(selectEl, {
        plugins: ['remove_button'],
        maxItems: null,
        placeholder: 'Search sources...',
        dropdownParent: 'body',
      });
    } catch (err) {
      setFieldStatus(container, 'error', err.message || 'Unable to load sources editor.');
      return;
    }

    const cancel = () => {
      if (sourcesSelect) {
        sourcesSelect.destroy();
        sourcesSelect = null;
      }
      restoreDisplay(container, renderSourcesDisplay(currentIds));
      clearFieldStatus(container);
    };

    container._cancelEdit = cancel;

    const save = async () => {
      const ids = (sourcesSelect?.getValue() || [])
        .map((id) => parseInt(id, 10))
        .filter(Number.isFinite);

      const unchanged = ids.length === currentIds.length
        && ids.every((id) => currentIds.includes(id));

      if (unchanged) {
        cancel();
        return;
      }

      setFieldStatus(container, 'saving', 'Saving…');
      try {
        const updated = await patchField('sourceIds', ids);
        state.sourceIds = updated.sources.map((source) => source.id);
        if (sourcesSelect) {
          sourcesSelect.destroy();
          sourcesSelect = null;
        }
        restoreDisplay(container, renderSourcesDisplay(state.sourceIds));
        setFieldStatus(container, 'saved', 'Saved');
        setTimeout(() => clearFieldStatus(container), 1500);
      } catch (error) {
        setFieldStatus(container, 'error', error.message);
      }
    };

    const actionsSlot = container.querySelector('.inline-field-actions-slot');
    if (actionsSlot) {
      actionsSlot.appendChild(createActionButtons(save, cancel));
    }
  }

  function startNotesEdit(container) {
    closeActiveEdit();

    const currentNotes = state.notes || '';
    container.classList.add('is-editing');
    activeEditContainer = container;

    container.innerHTML = buildNotesEditorHtml();
    const editorEl = container.querySelector('#leadNotesEditor');

    notesQuill = new Quill(editorEl, {
      theme: 'snow',
      placeholder: 'Add notes…',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link'],
          ['clean'],
        ],
      },
    });

    if (currentNotes) {
      notesQuill.clipboard.dangerouslyPasteHTML(currentNotes);
    }

    const cancel = () => {
      if (notesQuill) {
        notesQuill = null;
      }
      restoreDisplay(
        container,
        `<div class="inline-field-display lead-notes-readonly">${currentNotes}</div>`
      );
      clearFieldStatus(container);
    };

    container._cancelEdit = cancel;

    const save = async () => {
      const html = notesQuill.root.innerHTML;
      const isEmpty = !html || html === '<p><br></p>';

      if ((isEmpty ? '' : html) === (currentNotes || '')) {
        cancel();
        return;
      }

      setFieldStatus(container, 'saving', 'Saving…');
      try {
        const updated = await patchField('notes', isEmpty ? '' : html);
        state.notes = updated.notes || '';
        notesQuill = null;
        restoreDisplay(
          container,
          `<div class="inline-field-display lead-notes-readonly">${state.notes || ''}</div>`
        );
        setFieldStatus(container, 'saved', 'Saved');
        setTimeout(() => clearFieldStatus(container), 1500);
      } catch (error) {
        setFieldStatus(container, 'error', error.message);
      }
    };

    container.querySelector('.inline-field-editor').appendChild(createActionButtons(save, cancel));
  }

  function bindInlineFields() {
    if (!config.canEdit) {
      return;
    }

    document.querySelectorAll('.lead-field-value.is-editable').forEach((container) => {
      container.addEventListener('click', (event) => {
        if (container.classList.contains('is-editing')) {
          return;
        }

        if (event.target.closest('.inline-field-actions')) {
          return;
        }

        const type = container.dataset.type;
        const field = container.dataset.field;

        if (type === 'text' || type === 'date') {
          startTextEdit(container);
          return;
        }

        if (type === 'select' && field === 'assigneeId') {
          startSelectEdit(
            container,
            config.assignees.map((assignee) => ({
              value: assignee.id,
              label: assignee.adminName,
            })),
            state.assigneeId,
            false,
            async (value) => {
              const updated = await patchField('assigneeId', parseInt(value, 10));
              container.dataset.display = updated.assignee?.adminName || '—';
              state.assigneeId = updated.assigneeId;
            }
          );
          return;
        }

        if (type === 'pipeline') {
          startSelectEdit(
            container,
            config.pipelines.map((pipeline) => ({
              value: pipeline.id,
              label: pipeline.name,
            })),
            state.pipelineId,
            true,
            async (value) => {
              const updated = await patchFields({
                pipelineId: value ? parseInt(value, 10) : null,
                stageId: null,
              });
              container.dataset.display = updated.pipeline?.name || '—';
              state.pipelineId = updated.pipelineId;
              state.stageId = updated.stageId;
              const stageContainer = document.querySelector('[data-field="stageId"]');
              if (stageContainer && !stageContainer.classList.contains('is-editing')) {
                stageContainer.dataset.display = '—';
                const display = stageContainer.querySelector('.inline-field-display');
                if (display) {
                  display.textContent = '—';
                }
              }
            }
          );
          return;
        }

        if (type === 'stage') {
          if (!state.pipelineId) {
            setFieldStatus(container, 'error', 'Select a pipeline first.');
            return;
          }
          startSelectEdit(
            container,
            getPipelineStages(state.pipelineId).map((stage) => ({
              value: stage.id,
              label: stage.name,
            })),
            state.stageId,
            true,
            async (value) => {
              const updated = await patchField('stageId', value ? parseInt(value, 10) : null);
              container.dataset.display = updated.stage?.name || '—';
              state.stageId = updated.stageId;
            }
          );
          return;
        }

        if (type === 'sources') {
          startSourcesEdit(container);
          return;
        }

        if (type === 'notes') {
          startNotesEdit(container);
        }
      });
    });
  }

  function toDatetimeLocalValue(value) {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (part) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function initCommunicationModal() {
    const form = document.getElementById('leadCommunicationForm');
    const modalEl = document.getElementById('leadCommunicationModal');
    if (!form || !modalEl) {
      return;
    }

    const errorEl = document.getElementById('leadCommunicationFormError');
    const submitBtn = document.getElementById('leadCommunicationSubmit');
    const modalLabel = document.getElementById('leadCommunicationModalLabel');
    const commIdInput = document.getElementById('leadCommunicationCommId');
    const itemTypeInput = document.getElementById('modalItemType');
    const sentAtInput = document.getElementById('modalSentAt');
    const toAddressInput = document.getElementById('modalToAddress');
    const subjectInput = document.getElementById('modalCommSubject');
    const descriptionInput = document.getElementById('modalDescription');
    const commById = new Map((config.communications || []).map((item) => [String(item.id), item]));

    function resetCommunicationForm() {
      form.reset();
      commIdInput.value = '';
      modalLabel.textContent = 'Add Email / Message';
      submitBtn.textContent = 'Add';
      errorEl.classList.add('d-none');
      errorEl.textContent = '';
      submitBtn.disabled = false;
    }

    function openCommunicationModalForEdit(commId) {
      const communication = commById.get(String(commId));
      if (!communication) {
        return;
      }

      commIdInput.value = String(communication.id);
      itemTypeInput.value = communication.itemType;
      sentAtInput.value = toDatetimeLocalValue(communication.sentAt);
      toAddressInput.value = communication.toAddress;
      subjectInput.value = communication.subject;
      descriptionInput.value = communication.description || '';
      modalLabel.textContent = 'Edit Email / Message';
      submitBtn.textContent = 'Save';
      errorEl.classList.add('d-none');
      errorEl.textContent = '';
      submitBtn.disabled = false;

      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    document.getElementById('leadCommunicationAddBtn')?.addEventListener('click', () => {
      resetCommunicationForm();
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      resetCommunicationForm();
    });

    document.querySelectorAll('.lead-comm-edit').forEach((button) => {
      button.addEventListener('click', () => {
        openCommunicationModalForEdit(button.dataset.commId);
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      errorEl.classList.add('d-none');
      submitBtn.disabled = true;

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const commId = commIdInput.value;
      const url = commId ? `${config.commUrl}/${commId}` : config.commUrl;
      const method = commId ? 'PATCH' : 'POST';
      const successMessage = commId
        ? 'Email/message updated successfully.'
        : 'Email/message added successfully.';

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'fetch',
          },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Unable to save email/message.');
        }

        window.location.href = `${config.patchUrl}?tab=general&success=${encodeURIComponent(successMessage)}`;
      } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('d-none');
        submitBtn.disabled = false;
      }
    });
  }

  function initCommunicationDelete() {
    document.querySelectorAll('.lead-comm-delete').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this email/message?')) {
          return;
        }

        try {
          const response = await fetch(button.dataset.deleteUrl, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'X-Requested-With': 'fetch',
            },
          });
          const result = await response.json();
          if (!response.ok || !result.ok) {
            throw new Error(result.error || 'Unable to delete.');
          }

          window.location.href = `${config.patchUrl}?tab=general&success=${encodeURIComponent('Email/message deleted successfully.')}`;
        } catch (error) {
          window.alert(error.message);
        }
      });
    });
  }

  function initDiscussionModal() {
    const form = document.getElementById('leadDiscussionForm');
    const modalEl = document.getElementById('leadDiscussionModal');
    if (!form || !modalEl) {
      return;
    }

    const errorEl = document.getElementById('leadDiscussionFormError');
    const submitBtn = document.getElementById('leadDiscussionSubmit');
    const modalLabel = document.getElementById('leadDiscussionModalLabel');
    const discussionIdInput = document.getElementById('leadDiscussionId');
    const userIdInput = document.getElementById('modalDiscussionUserId');
    const postedAtInput = document.getElementById('modalDiscussionPostedAt');
    const messageInput = document.getElementById('modalDiscussionMessage');
    const discussionById = new Map((config.discussions || []).map((item) => [String(item.id), item]));

    function resetDiscussionForm() {
      form.reset();
      discussionIdInput.value = '';
      modalLabel.textContent = 'Add Discussion';
      submitBtn.textContent = 'Add';
      errorEl.classList.add('d-none');
      errorEl.textContent = '';
      submitBtn.disabled = false;
    }

    function openDiscussionModalForEdit(discussionId) {
      const discussion = discussionById.get(String(discussionId));
      if (!discussion) {
        return;
      }

      discussionIdInput.value = String(discussion.id);
      userIdInput.value = String(discussion.userId);
      postedAtInput.value = toDatetimeLocalValue(discussion.postedAt);
      messageInput.value = discussion.message || '';
      modalLabel.textContent = 'Edit Discussion';
      submitBtn.textContent = 'Save';
      errorEl.classList.add('d-none');
      errorEl.textContent = '';
      submitBtn.disabled = false;

      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

    document.getElementById('leadDiscussionAddBtn')?.addEventListener('click', () => {
      resetDiscussionForm();
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      resetDiscussionForm();
    });

    document.querySelectorAll('.lead-discussion-edit').forEach((button) => {
      button.addEventListener('click', () => {
        openDiscussionModalForEdit(button.dataset.discussionId);
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      errorEl.classList.add('d-none');
      submitBtn.disabled = true;

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      const discussionId = discussionIdInput.value;
      const url = discussionId ? `${config.discussionUrl}/${discussionId}` : config.discussionUrl;
      const method = discussionId ? 'PATCH' : 'POST';
      const successMessage = discussionId
        ? 'Discussion updated successfully.'
        : 'Discussion added successfully.';

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'fetch',
          },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Unable to save discussion.');
        }

        window.location.href = `${config.patchUrl}?tab=general&success=${encodeURIComponent(successMessage)}`;
      } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('d-none');
        submitBtn.disabled = false;
      }
    });
  }

  function initDiscussionDelete() {
    document.querySelectorAll('.lead-discussion-delete').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this discussion entry?')) {
          return;
        }

        try {
          const response = await fetch(button.dataset.deleteUrl, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'X-Requested-With': 'fetch',
            },
          });
          const result = await response.json();
          if (!response.ok || !result.ok) {
            throw new Error(result.error || 'Unable to delete.');
          }

          window.location.href = `${config.patchUrl}?tab=general&success=${encodeURIComponent('Discussion deleted successfully.')}`;
        } catch (error) {
          window.alert(error.message);
        }
      });
    });
  }

  bindInlineFields();
  initCommunicationModal();
  initCommunicationDelete();
  initDiscussionModal();
  initDiscussionDelete();
})();
