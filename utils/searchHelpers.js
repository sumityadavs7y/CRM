function escapeIlikePattern(value) {
  return value.replace(/[%_\\]/g, '\\$&');
}

module.exports = {
  escapeIlikePattern,
};
