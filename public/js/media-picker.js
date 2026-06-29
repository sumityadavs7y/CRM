(function () {
  let pickerModal = null;
  let pickerInstance = null;

  function getPickerModal() {
    return document.getElementById('mediaPickerModal');
  }

  function getSelectButton() {
    return document.getElementById('mediaPickerSelectBtn');
  }

  function getModalTitleEl() {
    return document.getElementById('mediaPickerModalLabel');
  }

  window.MediaPicker = {
    open(options = {}) {
      const modalEl = getPickerModal();
      if (!modalEl || !window.MediaLibrary) {
        console.error('Media picker is not available on this page.');
        return;
      }

      const onSelect = typeof options.onSelect === 'function' ? options.onSelect : null;
      const root = modalEl.querySelector('#mediaPickerRoot');
      const selectBtn = getSelectButton();
      const titleEl = getModalTitleEl();
      const canEdit = Boolean(options.canEdit);
      const imageOnly = Boolean(options.imageOnly);

      if (titleEl) {
        titleEl.textContent = options.title || 'Choose from Media Library';
      }

      if (!pickerInstance && root) {
        pickerInstance = new window.MediaLibrary(root, {
          pickerMode: true,
          canEdit,
          imageOnly,
          onSelectionChange: (files) => {
            if (selectBtn) {
              selectBtn.disabled = files.length === 0;
            }
          },
        });
      }

      if (pickerInstance) {
        pickerInstance.config.canEdit = canEdit;
        pickerInstance.config.imageOnly = imageOnly;
        pickerInstance.state.selectedIds.clear();
        pickerInstance.state.folderId = 'all';
        pickerInstance.state.search = '';
        if (pickerInstance.els.searchInput) {
          pickerInstance.els.searchInput.value = '';
        }
        if (pickerInstance.els.uploadInput) {
          pickerInstance.els.uploadInput.accept = imageOnly ? 'image/*' : '';
        }
        if (pickerInstance.els.uploadBtn) {
          pickerInstance.els.uploadBtn.classList.toggle('d-none', !canEdit);
        }
        pickerInstance.syncUploadVisibility();
        pickerInstance.onSelectionChange = (files) => {
          if (selectBtn) {
            selectBtn.disabled = files.length === 0;
          }
        };
        pickerInstance.setActiveFolder('all');
      }

      if (selectBtn) {
        selectBtn.disabled = true;
        selectBtn.onclick = () => {
          if (!pickerInstance || !onSelect) {
            return;
          }
          const selected = pickerInstance.getSelectedFiles();
          if (!selected.length) {
            return;
          }
          onSelect(selected);
          pickerModal.hide();
        };
      }

      pickerModal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
      pickerModal.show();
    },
  };
})();
