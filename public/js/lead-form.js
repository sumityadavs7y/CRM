(function () {
  const pipelineSelect = document.getElementById('pipelineId');
  const stageSelect = document.getElementById('stageId');
  const stagesDataEl = document.getElementById('lead-pipeline-stages-data');
  const selectedStageEl = document.getElementById('lead-selected-stage');

  if (!pipelineSelect || !stageSelect || !stagesDataEl) {
    return;
  }

  let pipelineStageMap = [];
  let selectedStageId = '';

  try {
    pipelineStageMap = JSON.parse(stagesDataEl.textContent || '[]');
  } catch {
    pipelineStageMap = [];
  }

  try {
    selectedStageId = JSON.parse(selectedStageEl?.textContent || '""');
  } catch {
    selectedStageId = '';
  }

  function populateStages(pipelineId, preserveStageId) {
    while (stageSelect.options.length > 1) {
      stageSelect.remove(1);
    }

    const pipeline = pipelineStageMap.find((entry) => String(entry.id) === String(pipelineId));
    const stages = pipeline ? pipeline.stages : [];

    stages.forEach((stage) => {
      const option = document.createElement('option');
      option.value = String(stage.id);
      option.textContent = stage.name;
      if (preserveStageId && String(preserveStageId) === String(stage.id)) {
        option.selected = true;
      }
      stageSelect.appendChild(option);
    });
  }

  pipelineSelect.addEventListener('change', function () {
    populateStages(pipelineSelect.value, '');
  });

  populateStages(pipelineSelect.value, selectedStageId);
})();
