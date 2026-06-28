const LEAD_LIST_FILTER_KEYS = [
  'q',
  'assigneeId',
  'pipelineId',
  'stageId',
  'quality',
  'scoreMin',
  'scoreMax',
  'followUpFrom',
  'followUpTo',
  'createdFrom',
  'createdTo',
  'sourceId',
];

const EMPTY_LEAD_LIST_FILTERS = {
  q: '',
  assigneeId: null,
  pipelineId: null,
  stageId: null,
  quality: null,
  scoreMin: null,
  scoreMax: null,
  followUpFrom: null,
  followUpTo: null,
  createdFrom: null,
  createdTo: null,
  sourceId: null,
};

const LEAD_LIST_SCORE_MIN = 1;
const LEAD_LIST_SCORE_MAX = 10;

module.exports = {
  LEAD_LIST_FILTER_KEYS,
  EMPTY_LEAD_LIST_FILTERS,
  LEAD_LIST_SCORE_MIN,
  LEAD_LIST_SCORE_MAX,
};
