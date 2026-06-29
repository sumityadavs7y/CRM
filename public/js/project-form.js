(function () {
  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getProjectInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'P';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  function getProjectAvatarAccent(name) {
    const input = String(name || 'project');
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 58% 42%)`;
  }

  function initProjectAvatarField() {
    const preview = document.getElementById('projectAvatarPreview');
    const hiddenInput = document.getElementById('avatarMediaFileId');
    const chooseBtn = document.getElementById('projectAvatarChooseBtn');
    const removeBtn = document.getElementById('projectAvatarRemoveBtn');
    const nameInput = document.getElementById('name');

    if (!preview || !hiddenInput) {
      return;
    }

    function renderPreview({ mediaId, previewUrl, name }) {
      const initials = getProjectInitials(name);
      const accent = getProjectAvatarAccent(name);
      preview.style.setProperty('--project-avatar-accent', accent);

      if (mediaId && previewUrl) {
        preview.innerHTML = `<img src="${escapeHtml(previewUrl)}" alt="" class="project-avatar-field__image" id="projectAvatarPreviewImage">`;
        preview.dataset.hasImage = 'true';
        preview.dataset.previewUrl = previewUrl;
        hiddenInput.value = String(mediaId);
        if (removeBtn) {
          removeBtn.classList.remove('d-none');
        }
        return;
      }

      preview.innerHTML = `<span class="project-avatar-field__initials" id="projectAvatarPreviewInitials">${escapeHtml(initials)}</span>`;
      preview.dataset.hasImage = 'false';
      preview.dataset.previewUrl = '';
      hiddenInput.value = '';
      if (removeBtn) {
        removeBtn.classList.add('d-none');
      }
    }

    function getCurrentName() {
      return nameInput ? nameInput.value.trim() : (preview.dataset.initials ? '' : 'Project');
    }

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        if (hiddenInput.value) {
          return;
        }
        renderPreview({ mediaId: null, previewUrl: null, name: getCurrentName() });
      });
    }

    if (chooseBtn) {
      chooseBtn.addEventListener('click', () => {
        if (!window.MediaPicker) {
          window.alert('Media Library is not available on this page.');
          return;
        }

        const configEl = document.getElementById('projectFormConfig');
        let canUploadMedia = false;
        if (configEl) {
          try {
            const config = JSON.parse(configEl.textContent || '{}');
            canUploadMedia = Boolean(config.canUploadMedia);
          } catch {
            canUploadMedia = false;
          }
        }

        window.MediaPicker.open({
          title: 'Choose project image',
          imageOnly: true,
          canEdit: canUploadMedia,
          onSelect: (files) => {
            const file = files[0];
            if (!file) {
              return;
            }
            const previewUrl = file.previewUrl || file.url;
            renderPreview({
              mediaId: file.id,
              previewUrl,
              name: getCurrentName(),
            });
          },
        });
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        renderPreview({ mediaId: null, previewUrl: null, name: getCurrentName() });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', initProjectAvatarField);
})();
