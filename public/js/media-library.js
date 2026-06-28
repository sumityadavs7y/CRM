(function () {
  function readConfig(root) {
    const configEl = document.getElementById('mediaLibraryConfig');
    const baseConfig = configEl ? JSON.parse(configEl.textContent || '{}') : {};
    const isPicker = root.dataset.pickerMode === 'true';
    const defaultSortOptions = [
      { value: 'date_desc', label: 'Date ↓' },
      { value: 'date_asc', label: 'Date ↑' },
      { value: 'name_asc', label: 'Name A–Z' },
      { value: 'name_desc', label: 'Name Z–A' },
    ];
    return {
      sortOptions: baseConfig.sortOptions?.length ? baseConfig.sortOptions : defaultSortOptions,
      defaultSort: baseConfig.defaultSort || 'date_desc',
      defaultView: baseConfig.defaultView || 'grid',
      canEdit: baseConfig.canEdit || false,
      pickerMode: isPicker,
    };
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getFileIcon(mimeType) {
    if (mimeType && mimeType.startsWith('image/')) return 'ri-image-line';
    if (mimeType && mimeType.includes('pdf')) return 'ri-file-pdf-line';
    if (mimeType && (mimeType.includes('word') || mimeType.includes('document'))) return 'ri-file-word-line';
    if (mimeType && (mimeType.includes('sheet') || mimeType.includes('excel'))) return 'ri-file-excel-line';
    if (mimeType && mimeType.includes('zip')) return 'ri-file-zip-line';
    return 'ri-file-line';
  }

  function getPreviewKind(file) {
    const mime = String(file.mimeType || '').toLowerCase();
    if (file.isImage) return 'image';
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml') return 'text';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'none';
  }

  const TEXT_PREVIEW_MAX_BYTES = 100 * 1024;

  function renderPreviewUnavailable(file, message) {
    return `
      <div class="media-library-preview__unavailable">
        <i class="${getFileIcon(file.mimeType)}"></i>
        <p class="mb-1 fw-semibold">${escapeHtml(message || 'Preview is not available.')}</p>
        <p class="text-muted small mb-0">Use Open / Download to view this file in your browser.</p>
      </div>
    `;
  }

  class MediaLibrary {
    constructor(root, options = {}) {
      this.root = root;
      this.config = { ...readConfig(root), ...options };
      this.state = {
        folderId: 'all',
        search: '',
        sort: this.config.defaultSort,
        view: this.config.defaultView,
        selectedIds: new Set(),
        folders: [],
        files: [],
      };
      this.deleteTarget = null;
      this.folderEditId = null;
      this.searchTimer = null;
      this.onSelectionChange = options.onSelectionChange || null;

      this.cacheElements();
      this.bindEvents();
      this.buildSortMenu();
      this.refresh();
    }

    cacheElements() {
      const scope = this.root;
      this.els = {
        folderList: scope.querySelector('#mediaFolderList'),
        allFilesCount: scope.querySelector('#mediaAllFilesCount'),
        usedSpace: scope.querySelector('#mediaUsedSpace'),
        availableSpace: scope.querySelector('#mediaAvailableSpace'),
        storageProgress: scope.querySelector('#mediaStorageProgress'),
        searchInput: scope.querySelector('#mediaSearchInput'),
        sortDropdown: scope.querySelector('#mediaSortDropdown'),
        sortMenu: scope.querySelector('#mediaSortMenu'),
        viewFileCount: scope.querySelector('#mediaViewFileCount'),
        viewTotalSize: scope.querySelector('#mediaViewTotalSize'),
        viewImageCount: scope.querySelector('#mediaViewImageCount'),
        uploadBtn: scope.querySelector('#mediaUploadBtn'),
        uploadInput: scope.querySelector('#mediaUploadInput'),
        createFolderBtn: scope.querySelector('#mediaCreateFolderBtn'),
        loadingState: scope.querySelector('#mediaLoadingState'),
        gridView: scope.querySelector('#mediaGridView'),
        listView: scope.querySelector('#mediaListView'),
        listBody: scope.querySelector('#mediaListBody'),
        emptyState: scope.querySelector('#mediaEmptyState'),
        navItems: scope.querySelectorAll('[data-folder-id]'),
        viewToggleButtons: scope.querySelectorAll('[data-view]'),
      };
    }

    bindEvents() {
      const { els } = this;

      if (els.searchInput) {
        els.searchInput.addEventListener('input', () => {
          clearTimeout(this.searchTimer);
          this.searchTimer = setTimeout(() => {
            this.state.search = els.searchInput.value.trim();
            this.refresh();
          }, 300);
        });
      }

      this.root.querySelectorAll('[data-folder-id]').forEach((button) => {
        button.addEventListener('click', () => {
          this.setActiveFolder(button.dataset.folderId);
        });
      });

      els.viewToggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
          this.setView(button.dataset.view);
        });
      });

      if (els.uploadBtn && els.uploadInput) {
        els.uploadBtn.addEventListener('click', () => els.uploadInput.click());
        els.uploadInput.addEventListener('change', () => this.handleUpload(els.uploadInput.files));
      }

      if (els.createFolderBtn) {
        els.createFolderBtn.addEventListener('click', () => this.openFolderModal());
      }

      const folderForm = document.getElementById('mediaFolderForm');
      if (folderForm && !folderForm.dataset.mediaBound) {
        folderForm.dataset.mediaBound = 'true';
        folderForm.addEventListener('submit', (event) => {
          event.preventDefault();
          this.submitFolderForm();
        });
      }

      const deleteBtn = document.getElementById('mediaDeleteConfirmBtn');
      if (deleteBtn && !deleteBtn.dataset.mediaBound) {
        deleteBtn.dataset.mediaBound = 'true';
        deleteBtn.addEventListener('click', () => this.confirmDelete());
      }
    }

    buildSortMenu() {
      if (!this.els.sortMenu) return;

      this.els.sortMenu.innerHTML = this.config.sortOptions.map((option) => `
        <li>
          <button type="button" class="dropdown-item${option.value === this.state.sort ? ' active' : ''}" data-sort="${option.value}">
            ${escapeHtml(option.label)}
          </button>
        </li>
      `).join('');

      this.els.sortMenu.querySelectorAll('[data-sort]').forEach((button) => {
        button.addEventListener('click', () => {
          this.state.sort = button.dataset.sort;
          this.updateSortLabel();
          this.refresh();
        });
      });

      this.updateSortLabel();
    }

    updateSortLabel() {
      if (!this.els.sortDropdown) return;
      const current = this.config.sortOptions.find((option) => option.value === this.state.sort);
      this.els.sortDropdown.textContent = current ? current.label : 'Date ↓';
    }

    setActiveFolder(folderId) {
      this.state.folderId = folderId;
      this.state.selectedIds.clear();
      this.notifySelectionChange();

      this.root.querySelectorAll('[data-folder-id]').forEach((button) => {
        button.classList.toggle('media-library__nav-item--active', button.dataset.folderId === folderId);
      });

      this.root.querySelectorAll('[data-folder-nav]').forEach((button) => {
        button.classList.toggle('media-library__nav-item--active', button.dataset.folderNav === folderId);
      });

      this.refresh();
    }

    setView(view) {
      this.state.view = view;
      this.els.viewToggleButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.view === view);
      });
      this.renderFiles(this.state.files);
    }

    getBrowseParams() {
      const params = new URLSearchParams();
      if (this.state.folderId !== 'all') {
        params.set('folderId', this.state.folderId);
      }
      if (this.state.search) {
        params.set('search', this.state.search);
      }
      params.set('sort', this.state.sort);
      params.set('view', this.state.view);
      return params.toString();
    }

    async refresh() {
      this.showLoading(true);
      try {
        const response = await fetch(`/company/media/api/browse?${this.getBrowseParams()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load media.');
        }

        this.state.folders = data.folders || [];
        this.state.files = data.files || [];
        this.renderFolders(data);
        this.renderFiles(data.files || []);
        this.renderStorage(data.storage || {});
        this.renderViewStats(data.viewStats || {});
        if (this.els.allFilesCount) {
          this.els.allFilesCount.textContent = String(data.storage?.fileCount || 0);
        }
      } catch (error) {
        console.error(error);
        this.showToast(error.message || 'Failed to load media library.');
      } finally {
        this.showLoading(false);
      }
    }

    showLoading(isLoading) {
      if (this.els.loadingState) {
        this.els.loadingState.classList.toggle('d-none', !isLoading);
      }
    }

    renderStorage(storage) {
      if (this.els.usedSpace) {
        this.els.usedSpace.textContent = storage.usedFormatted || '0 B';
      }
      if (this.els.availableSpace) {
        this.els.availableSpace.textContent = storage.remainingFormatted || '0 B';
      }
      if (this.els.storageProgress) {
        const percent = storage.limitBytes
          ? Math.min(100, Math.round((storage.usedBytes / storage.limitBytes) * 100))
          : 0;
        this.els.storageProgress.style.width = `${percent}%`;
      }
    }

    renderViewStats(stats) {
      if (this.els.viewFileCount) {
        this.els.viewFileCount.textContent = `${stats.fileCount || 0} Files`;
      }
      if (this.els.viewTotalSize) {
        this.els.viewTotalSize.textContent = stats.totalSizeFormatted || '0 B';
      }
      if (this.els.viewImageCount) {
        this.els.viewImageCount.textContent = `${stats.imageCount || 0} Images`;
      }
    }

    renderFolders(data) {
      if (!this.els.folderList) return;

      const folders = data.folders || [];
      if (!folders.length) {
        this.els.folderList.innerHTML = '<div class="media-library__folder-empty text-muted small px-2">No folders yet</div>';
        return;
      }

      this.els.folderList.innerHTML = folders.map((folder) => `
        <div class="media-library__folder-row">
          <button type="button" class="media-library__nav-item${String(this.state.folderId) === String(folder.id) ? ' media-library__nav-item--active' : ''}" data-folder-nav="${folder.id}">
            <span class="media-library__nav-icon"><i class="ri-folder-line"></i></span>
            <span class="media-library__nav-label">${escapeHtml(folder.name)}</span>
            <span class="badge bg-light text-body">${folder.fileCount}</span>
          </button>
          ${this.config.canEdit && !this.config.pickerMode ? `
            <div class="dropdown">
              <button type="button" class="btn btn-sm btn-ghost-secondary media-library__folder-menu" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="ri-more-2-fill"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><button type="button" class="dropdown-item" data-folder-action="rename" data-folder-id="${folder.id}" data-folder-name="${escapeHtml(folder.name)}">Rename</button></li>
                <li><button type="button" class="dropdown-item text-danger" data-folder-action="delete" data-folder-id="${folder.id}" data-folder-name="${escapeHtml(folder.name)}">Delete</button></li>
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('');

      this.els.folderList.querySelectorAll('[data-folder-nav]').forEach((button) => {
        button.addEventListener('click', () => this.setActiveFolder(button.dataset.folderNav));
      });

      this.els.folderList.querySelectorAll('[data-folder-action]').forEach((button) => {
        button.addEventListener('click', () => {
          const folderId = parseInt(button.dataset.folderId, 10);
          const folderName = button.dataset.folderName;
          if (button.dataset.folderAction === 'rename') {
            this.openFolderModal(folderId, folderName);
          } else {
            this.openDeleteModal('folder', folderId, folderName);
          }
        });
      });
    }

    renderFiles(files) {
      const hasFiles = files.length > 0;
      if (this.els.emptyState) {
        this.els.emptyState.classList.toggle('d-none', hasFiles);
      }
      if (this.els.gridView) {
        this.els.gridView.classList.toggle('d-none', this.state.view !== 'grid' || !hasFiles);
      }
      if (this.els.listView) {
        this.els.listView.classList.toggle('d-none', this.state.view !== 'list' || !hasFiles);
      }

      if (!hasFiles) {
        if (this.els.gridView) this.els.gridView.innerHTML = '';
        if (this.els.listBody) this.els.listBody.innerHTML = '';
        return;
      }

      if (this.state.view === 'grid') {
        this.els.gridView.innerHTML = files.map((file) => this.renderGridCard(file)).join('');
        this.bindFileInteractions(this.els.gridView);
      } else {
        this.els.listBody.innerHTML = files.map((file) => this.renderListRow(file)).join('');
        this.bindFileInteractions(this.els.listBody);
      }
    }

    renderGridCard(file) {
      const selected = this.state.selectedIds.has(file.id);
      const preview = file.isImage && file.previewUrl
        ? `<img src="${escapeHtml(file.previewUrl)}" alt="${escapeHtml(file.originalName)}" loading="lazy" decoding="async">`
        : `<i class="${getFileIcon(file.mimeType)}"></i>`;

      return `
        <div class="media-library__card${selected ? ' media-library__card--selected' : ''}${this.config.pickerMode ? '' : ' media-library__card--previewable'}" data-file-id="${file.id}"${this.config.pickerMode ? ' role="button" tabindex="0"' : ''}>
          <div class="media-library__card-preview">
            <span class="media-library__card-badge">${escapeHtml((file.extension || 'FILE').toUpperCase())}</span>
            ${preview}
          </div>
          <div class="media-library__card-body">
            <div class="media-library__card-name" title="${escapeHtml(file.originalName)}">${escapeHtml(file.originalName)}</div>
            <div class="media-library__card-meta">
              <span>${escapeHtml(file.sizeFormatted)}</span>
              <span>${formatDate(file.createdAt)}</span>
            </div>
          </div>
          ${this.config.canEdit && !this.config.pickerMode ? `
            <button type="button" class="btn btn-sm btn-light media-library__card-delete" data-delete-file="${file.id}" title="Delete">
              <i class="ri-delete-bin-line"></i>
            </button>
          ` : ''}
        </div>
      `;
    }

    renderListRow(file) {
      const selected = this.state.selectedIds.has(file.id);
      const preview = file.isImage && file.previewUrl
        ? `<img src="${escapeHtml(file.previewUrl)}" alt="" class="media-library__list-thumb" loading="lazy" decoding="async">`
        : `<span class="media-library__list-icon"><i class="${getFileIcon(file.mimeType)}"></i></span>`;

      return `
        <tr class="${selected ? 'table-active' : ''}${this.config.pickerMode ? '' : ' media-library__row--previewable'}" data-file-id="${file.id}">
          <td>
            <div class="d-flex align-items-center gap-2">
              ${preview}
              <span>${escapeHtml(file.originalName)}</span>
            </div>
          </td>
          <td>${escapeHtml((file.extension || 'file').toUpperCase())}</td>
          <td>${escapeHtml(file.sizeFormatted)}</td>
          <td>${formatDate(file.createdAt)}</td>
          ${this.config.canEdit && !this.config.pickerMode ? `
            <td class="text-end">
              <button type="button" class="btn btn-sm btn-light" data-delete-file="${file.id}" title="Delete">
                <i class="ri-delete-bin-line"></i>
              </button>
            </td>
          ` : ''}
        </tr>
      `;
    }

    bindFileInteractions(container) {
      container.querySelectorAll('[data-file-id]').forEach((element) => {
        element.addEventListener('click', (event) => {
          if (event.target.closest('[data-delete-file]')) return;
          const fileId = parseInt(element.dataset.fileId, 10);
          if (this.config.pickerMode) {
            this.toggleSelection(fileId);
          } else {
            this.openFilePreview(fileId);
          }
        });

        if (!this.config.pickerMode) {
          element.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            if (event.target.closest('[data-delete-file]')) return;
            event.preventDefault();
            const fileId = parseInt(element.dataset.fileId, 10);
            this.openFilePreview(fileId);
          });
          if (!element.hasAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
            element.setAttribute('role', 'button');
          }
        }
      });

      container.querySelectorAll('[data-delete-file]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          const fileId = parseInt(button.dataset.deleteFile, 10);
          const file = this.state.files.find((item) => item.id === fileId);
          this.openDeleteModal('file', fileId, file ? file.originalName : 'this file');
        });
      });
    }

    toggleSelection(fileId) {
      if (!this.config.pickerMode) return;

      if (this.state.selectedIds.has(fileId)) {
        this.state.selectedIds.delete(fileId);
      } else {
        this.state.selectedIds.clear();
        this.state.selectedIds.add(fileId);
      }

      this.renderFiles(this.state.files);
      this.notifySelectionChange();
    }

    getSelectedFiles() {
      return this.state.files.filter((file) => this.state.selectedIds.has(file.id));
    }

    notifySelectionChange() {
      if (typeof this.onSelectionChange === 'function') {
        this.onSelectionChange(this.getSelectedFiles());
      }
    }

    openFilePreview(fileId) {
      const file = this.state.files.find((item) => item.id === fileId);
      if (!file) return;

      const modalEl = document.getElementById('mediaFilePreviewModal');
      const titleEl = document.getElementById('mediaFilePreviewModalLabel');
      const bodyEl = document.getElementById('mediaFilePreviewBody');
      const metaEl = document.getElementById('mediaFilePreviewMeta');
      const downloadEl = document.getElementById('mediaFilePreviewDownload');

      if (!modalEl || !bodyEl) return;

      if (titleEl) titleEl.textContent = file.originalName;
      if (metaEl) {
        metaEl.textContent = `${file.sizeFormatted} · ${(file.extension || 'file').toUpperCase()} · ${formatDate(file.createdAt)}`;
      }
      if (downloadEl) {
        downloadEl.href = file.url;
        downloadEl.download = file.originalName;
      }

      bodyEl.innerHTML = `
        <div class="media-library-preview__loading text-center py-5">
          <div class="spinner-border text-success" role="status"><span class="visually-hidden">Loading...</span></div>
        </div>
      `;

      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();

      if (!modalEl.dataset.previewBound) {
        modalEl.dataset.previewBound = 'true';
        modalEl.addEventListener('hidden.bs.modal', () => {
          const activeBody = document.getElementById('mediaFilePreviewBody');
          if (!activeBody) return;
          activeBody.querySelectorAll('video, audio').forEach((element) => {
            element.pause();
            element.removeAttribute('src');
            element.load();
          });
        });
      }

      this.renderFilePreviewContent(file, bodyEl);
    }

    async renderFilePreviewContent(file, bodyEl) {
      const kind = getPreviewKind(file);

      if (kind === 'image') {
        bodyEl.innerHTML = `
          <div class="media-library-preview__image-wrap">
            <img
              src="${escapeHtml(file.url)}"
              alt="${escapeHtml(file.originalName)}"
              class="media-library-preview__image"
              id="mediaFilePreviewImage"
            >
          </div>
        `;
        const img = bodyEl.querySelector('#mediaFilePreviewImage');
        if (img) {
          img.addEventListener('error', () => {
            bodyEl.innerHTML = renderPreviewUnavailable(file, 'Preview is not available.');
          });
        }
        return;
      }

      if (kind === 'pdf') {
        bodyEl.innerHTML = `
          <iframe
            src="${escapeHtml(file.url)}"
            class="media-library-preview__iframe"
            title="${escapeHtml(file.originalName)}"
            id="mediaFilePreviewFrame"
          ></iframe>
        `;
        const frame = bodyEl.querySelector('#mediaFilePreviewFrame');
        if (frame) {
          frame.addEventListener('error', () => {
            bodyEl.innerHTML = renderPreviewUnavailable(file, 'Preview is not available.');
          });
        }
        return;
      }

      if (kind === 'video') {
        bodyEl.innerHTML = `
          <video class="media-library-preview__video" controls preload="metadata">
            <source src="${escapeHtml(file.url)}" type="${escapeHtml(file.mimeType)}">
          </video>
        `;
        const video = bodyEl.querySelector('video');
        if (video) {
          video.addEventListener('error', () => {
            bodyEl.innerHTML = renderPreviewUnavailable(file, 'Preview is not available.');
          });
        }
        return;
      }

      if (kind === 'audio') {
        bodyEl.innerHTML = `
          <div class="media-library-preview__audio-wrap">
            <i class="ri-music-2-line media-library-preview__audio-icon"></i>
            <audio class="media-library-preview__audio" controls preload="metadata">
              <source src="${escapeHtml(file.url)}" type="${escapeHtml(file.mimeType)}">
            </audio>
          </div>
        `;
        const audio = bodyEl.querySelector('audio');
        if (audio) {
          audio.addEventListener('error', () => {
            bodyEl.innerHTML = renderPreviewUnavailable(file, 'Preview is not available.');
          });
        }
        return;
      }

      if (kind === 'text') {
        if (file.sizeBytes > TEXT_PREVIEW_MAX_BYTES) {
          bodyEl.innerHTML = renderPreviewUnavailable(
            file,
            'Preview is not available for large text files.'
          );
          return;
        }

        try {
          const response = await fetch(file.url);
          if (!response.ok) {
            throw new Error('Failed to load file.');
          }
          const text = await response.text();
          bodyEl.innerHTML = `<pre class="media-library-preview__text">${escapeHtml(text)}</pre>`;
        } catch {
          bodyEl.innerHTML = renderPreviewUnavailable(file, 'Preview is not available.');
        }
        return;
      }

      bodyEl.innerHTML = renderPreviewUnavailable(file, 'Preview is not available.');
    }

    async handleUpload(fileList) {
      if (!fileList || !fileList.length) return;

      const formData = new FormData();
      Array.from(fileList).forEach((file) => formData.append('files', file));
      if (this.state.folderId !== 'all') {
        formData.append('folderId', this.state.folderId);
      }

      if (this.els.uploadBtn) {
        this.els.uploadBtn.disabled = true;
        this.els.uploadBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Uploading...';
      }

      try {
        const response = await fetch('/company/media/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Upload failed.');
        }
        this.els.uploadInput.value = '';
        await this.refresh();
      } catch (error) {
        this.showToast(error.message || 'Upload failed.');
      } finally {
        if (this.els.uploadBtn) {
          this.els.uploadBtn.disabled = false;
          this.els.uploadBtn.innerHTML = '<i class="ri-upload-2-line me-1"></i> Upload Files';
        }
      }
    }

    openFolderModal(folderId = null, folderName = '') {
      this.folderEditId = folderId;
      const modalEl = document.getElementById('mediaFolderModal');
      const label = document.getElementById('mediaFolderModalLabel');
      const nameInput = document.getElementById('mediaFolderName');
      const errorEl = document.getElementById('mediaFolderFormError');

      if (!modalEl || !nameInput) return;

      if (label) {
        label.textContent = folderId ? 'Rename Folder' : 'Create Folder';
      }
      nameInput.value = folderName || '';
      if (errorEl) errorEl.classList.add('d-none');

      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
      nameInput.focus();
    }

    async submitFolderForm() {
      const nameInput = document.getElementById('mediaFolderName');
      const errorEl = document.getElementById('mediaFolderFormError');
      const submitBtn = document.getElementById('mediaFolderSubmitBtn');
      const name = nameInput ? nameInput.value.trim() : '';

      if (!name) {
        if (errorEl) {
          errorEl.textContent = 'Folder name is required.';
          errorEl.classList.remove('d-none');
        }
        return;
      }

      const isEdit = Boolean(this.folderEditId);
      const url = isEdit ? `/company/media/folders/${this.folderEditId}` : '/company/media/folders';
      const method = isEdit ? 'PATCH' : 'POST';

      if (submitBtn) submitBtn.disabled = true;

      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to save folder.');
        }

        const modalEl = document.getElementById('mediaFolderModal');
        if (modalEl) {
          window.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        }

        this.folderEditId = null;
        await this.refresh();
      } catch (error) {
        if (errorEl) {
          errorEl.textContent = error.message;
          errorEl.classList.remove('d-none');
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    }

    openDeleteModal(type, id, name) {
      this.deleteTarget = { type, id, name };
      const modalEl = document.getElementById('mediaDeleteModal');
      const messageEl = document.getElementById('mediaDeleteMessage');
      if (messageEl) {
        messageEl.textContent = type === 'folder'
          ? `Delete folder "${name}"? It must be empty.`
          : `Delete file "${name}"?`;
      }
      if (modalEl) {
        window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
      }
    }

    async confirmDelete() {
      if (!this.deleteTarget) return;

      const { type, id } = this.deleteTarget;
      const url = type === 'folder' ? `/company/media/folders/${id}` : `/company/media/files/${id}`;

      try {
        const response = await fetch(url, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Delete failed.');
        }

        const modalEl = document.getElementById('mediaDeleteModal');
        if (modalEl) {
          window.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        }

        this.deleteTarget = null;
        await this.refresh();
      } catch (error) {
        this.showToast(error.message || 'Delete failed.');
      }
    }

    showToast(message) {
      window.alert(message);
    }
  }

  window.MediaLibrary = MediaLibrary;

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('mediaLibraryRoot');
    if (root && root.dataset.pickerMode === 'false') {
      window.mediaLibraryPage = new MediaLibrary(root);
    }
  });
})();
