import React, { useState } from 'react';
import API_BASE_URL from '../../config';

function toLocalInputValue(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 16);
}

function EventSettingsForm({ event, eventId, authHeaders, isSuperadmin, onUpdated }) {
  const [form, setForm] = useState({
    title: event.title || '',
    description: event.description || '',
    organizerName: event.organizerName || '',
    organizerEmail: event.organizerEmail || '',
    organizerPhone: event.organizerPhone || '',
    votingStartsAt: toLocalInputValue(event.votingStartsAt),
    votingEndsAt: toLocalInputValue(event.votingEndsAt),
  });
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [published, setPublished] = useState(event.published);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      if (isSuperadmin) {
        body.append('published', published);
      }
      if (coverImageFile) {
        body.append('coverImage', coverImageFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/awards-events/${eventId}`, {
        method: 'PUT',
        headers: { ...authHeaders },
        body,
      });

      const data = await response.json();
      if (data.success) {
        alert('Event settings saved');
        onUpdated?.(data.data);
      } else {
        alert(data.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving event settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-tab-content" style={{ gridTemplateColumns: '1fr' }}>
      <div className="admin-form-section">
        <h2>Event Settings</h2>

        <div className="form-group">
          <label>Status</label>
          {isSuperadmin ? (
            <label className="radio-option" style={{ marginTop: '0.25rem' }}>
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span className="radio-label">{published ? 'Live on site' : 'Draft (hidden from public)'}</span>
            </label>
          ) : (
            <span className={`status-badge ${published ? 'active' : 'upcoming'}`}>
              {published ? 'Live on site' : 'Awaiting superadmin approval'}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Event Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              required
              rows="4"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Cover Image</label>
            {event.coverImage && !coverImageFile && (
              <img src={event.coverImage} alt="" style={{ maxWidth: '200px', borderRadius: '8px', marginBottom: '0.5rem' }} />
            )}
            <input type="file" accept="image/*" onChange={(e) => setCoverImageFile(e.target.files[0] || null)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Organizer / Department Name *</label>
              <input
                type="text"
                required
                value={form.organizerName}
                onChange={(e) => setForm({ ...form, organizerName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Organizer Email *</label>
              <input
                type="email"
                required
                value={form.organizerEmail}
                onChange={(e) => setForm({ ...form, organizerEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Organizer Phone</label>
            <input
              type="text"
              value={form.organizerPhone}
              onChange={(e) => setForm({ ...form, organizerPhone: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Voting Starts *</label>
              <input
                type="datetime-local"
                required
                value={form.votingStartsAt}
                onChange={(e) => setForm({ ...form, votingStartsAt: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Voting Ends *</label>
              <input
                type="datetime-local"
                required
                value={form.votingEndsAt}
                onChange={(e) => setForm({ ...form, votingEndsAt: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventSettingsForm;
