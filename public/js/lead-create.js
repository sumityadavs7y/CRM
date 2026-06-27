(function () {
  const form = document.getElementById('leadCreateForm');
  const notesEl = document.getElementById('leadCreateNotesEditor');
  const notesInput = document.getElementById('notesInput');
  const sourcesEl = document.getElementById('sourceIds');

  if (sourcesEl && window.TomSelect) {
    new TomSelect(sourcesEl, {
      plugins: ['remove_button'],
      maxItems: null,
      placeholder: 'Search sources...',
      dropdownParent: 'body',
    });
  }

  let notesQuill = null;
  if (notesEl && window.Quill) {
    notesQuill = new Quill(notesEl, {
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
  }

  if (form) {
    form.addEventListener('submit', () => {
      if (notesQuill && notesInput) {
        notesInput.value = notesQuill.root.innerHTML;
      }
    });
  }
})();
