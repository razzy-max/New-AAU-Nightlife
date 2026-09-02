// Helpers for converting between an HTML <input type="datetime-local"> value
// (a timezone-less "wall clock" string) and a real UTC ISO string. Without this,
// a naive datetime-local string sent straight to the server gets parsed using the
// *server's* timezone (usually UTC), silently shifting the intended time by
// whatever the browser's real UTC offset is.

// Convert a datetime-local input value (interpreted in the browser's local
// timezone) into a proper UTC ISO string safe to send to the server.
export const localInputToISOString = (value) => {
  if (!value) return '';
  return new Date(value).toISOString();
};

// Convert a stored UTC date/ISO string back into a datetime-local input value
// that displays the correct local wall-clock time for the browser's timezone.
export const isoToLocalInputValue = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};
