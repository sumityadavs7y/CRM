function stripHtmlTags(html) {
  if (!html) {
    return '';
  }

  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatLeadListNotesPreview(html, maxLength = 80) {
  const plainText = stripHtmlTags(html);
  if (!plainText) {
    return '—';
  }

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength)}…`;
}

function formatLeadListDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString();
}

function formatLeadListCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLeadListSources(sources) {
  if (!sources || sources.length === 0) {
    return '—';
  }

  return sources.map((source) => source.name).join(', ');
}

module.exports = {
  formatLeadListNotesPreview,
  formatLeadListDate,
  formatLeadListCount,
  formatLeadListSources,
};
