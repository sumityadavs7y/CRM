const sanitizeHtml = require('sanitize-html');

const NOTES_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote',
];

function sanitizeNotesHtml(html) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  const trimmed = html.trim();
  if (!trimmed || trimmed === '<p><br></p>') {
    return null;
  }

  const cleaned = sanitizeHtml(trimmed, {
    allowedTags: NOTES_ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });

  return cleaned || null;
}

module.exports = {
  sanitizeNotesHtml,
};
