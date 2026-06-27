(function () {
  let popup = null;
  let mount = null;
  let doneButton = null;
  let picker = null;
  let activeTrigger = null;
  let activeColorInput = null;

  function parseColorToHex(color) {
    if (!color) {
      return '#6366f1';
    }

    const trimmed = color.trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
      return trimmed;
    }

    const match = trimmed.match(/#[0-9a-fA-F]{3,8}/);
    return match ? match[0] : '#6366f1';
  }

  function ensurePopup() {
    if (popup) {
      return;
    }

    popup = document.createElement('div');
    popup.id = 'label-color-popup';
    popup.className = 'label-color-popup';
    popup.hidden = true;
    popup.innerHTML = `
      <div class="label-color-popup__panel shadow">
        <div class="iro-mount"></div>
        <div class="text-end mt-2">
          <button type="button" class="btn btn-sm btn-primary label-color-popup__done">Done</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);

    mount = popup.querySelector('.iro-mount');
    doneButton = popup.querySelector('.label-color-popup__done');

    doneButton.addEventListener('click', closePopup);

    document.addEventListener('click', (event) => {
      if (!popup || popup.hidden) {
        return;
      }

      if (popup.contains(event.target) || event.target.closest('.color-picker-trigger')) {
        return;
      }

      closePopup();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closePopup();
      }
    });
  }

  function ensurePicker() {
    if (picker || typeof iro === 'undefined') {
      return picker;
    }

    picker = new iro.ColorPicker(mount, {
      width: 200,
      color: '#6366f1',
      borderWidth: 1,
      borderColor: '#e9ebec',
      layout: [
        { component: iro.ui.Box },
        { component: iro.ui.Slider, options: { sliderType: 'hue' } },
      ],
    });

    picker.on('color:change', (color) => {
      applyColor(color.hexString);
    });

    return picker;
  }

  function applyColor(hex) {
    if (activeColorInput) {
      activeColorInput.value = hex;
    }

    if (activeTrigger) {
      activeTrigger.style.background = hex;
    }
  }

  function positionPopup(trigger) {
    const rect = trigger.getBoundingClientRect();
    const panel = popup.querySelector('.label-color-popup__panel');
    const panelWidth = panel.offsetWidth || 220;
    const panelHeight = panel.offsetHeight || 280;
    const margin = 8;

    let left = rect.left;
    let top = rect.bottom + margin;

    if (left + panelWidth > window.innerWidth - margin) {
      left = window.innerWidth - panelWidth - margin;
    }

    if (top + panelHeight > window.innerHeight - margin) {
      top = rect.top - panelHeight - margin;
    }

    if (left < margin) {
      left = margin;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  function openPopup(trigger) {
    ensurePopup();
    const instance = ensurePicker();
    if (!instance) {
      return;
    }

    const row = trigger.closest('tr[data-row]');
    activeColorInput = row?.querySelector('input[name$="[color]"]');
    activeTrigger = trigger;

    const currentColor = parseColorToHex(activeColorInput?.value || trigger.style.backgroundColor);
    instance.color.hexString = currentColor;
    applyColor(currentColor);

    popup.hidden = false;
    positionPopup(trigger);
  }

  function closePopup() {
    if (!popup) {
      return;
    }

    popup.hidden = true;
    activeTrigger = null;
    activeColorInput = null;
  }

  function initTrigger(trigger) {
    if (trigger.dataset.pickerBound === 'true') {
      return;
    }

    trigger.dataset.pickerBound = 'true';
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!popup?.hidden && activeTrigger === trigger) {
        closePopup();
        return;
      }

      openPopup(trigger);
    });
  }

  function initPipelineColorPickers(root) {
    (root || document).querySelectorAll('.color-picker-trigger').forEach(initTrigger);
  }

  window.initPipelineColorPickers = initPipelineColorPickers;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initPipelineColorPickers());
  } else {
    initPipelineColorPickers();
  }
})();
