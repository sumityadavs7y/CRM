(function () {
  let pickerModal = null;
  let pickerInstance = null;

  function getPickerModal() {
    return document.getElementById('mediaPickerModal');
  }

  function getSelectButton() {
    return document.getElementById('mediaPickerSelectBtn');
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

      if (!pickerInstance && root) {
        pickerInstance = new window.MediaLibrary(root, {
          pickerMode: true,
          canEdit: false,
          onSelectionChange: (files) => {
            if (selectBtn) {
              selectBtn.disabled = files.length === 0;
            }
          },
        });
      }

      if (pickerInstance) {
        pickerInstance.state.selectedIds.clear();
        pickerInstance.state.folderId = 'all';
        pickerInstance.state.search = '';
        if (pickerInstance.els.searchInput) {
          pickerInstance.els.searchInput.value = '';
        }
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
          if (!pickerInstance || !onSelect) return;
          const selected = pickerInstance.getSelectedFiles();
          if (!selected.length) return;
          onSelect(selected);
          pickerModal.hide();
        };
      }

      pickerModal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
      pickerModal.show();
    },
  };
})();
