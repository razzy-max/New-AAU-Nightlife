import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../config';
import { localInputToISOString, isoToLocalInputValue } from '../../utils/datetimeLocal';
import './awards-admin.css';

function EventSettingsForm({ event, eventId, authHeaders, isSuperadmin, onUpdated }) {
  const [form, setForm] = useState({
    title: event.title || '',
    description: event.description || '',
    organizerName: event.organizerName || '',
    organizerEmail: event.organizerEmail || '',
    organizerPhone: event.organizerPhone || '',
    votingStartsAt: isoToLocalInputValue(event.votingStartsAt),
    votingEndsAt: isoToLocalInputValue(event.votingEndsAt),
  });
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [published, setPublished] = useState(event.published);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    if (!saveMessage) return undefined;
    const timer = setTimeout(() => setSaveMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  useEffect(() => {
    if (!coverImageFile) {
      setCoverImagePreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(coverImageFile);
    setCoverImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverImageFile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'votingStartsAt' || key === 'votingEndsAt') {
          body.append(key, localInputToISOString(value));
        } else {
          body.append(key, value);
        }
      });
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
        setCoverImageFile(null);
        setSaveMessage({ type: 'success', text: 'Settings saved.' });
        onUpdated?.(data.data);
      } else {
        setSaveMessage({ type: 'error', text: data.message || 'Failed to save settings.' });
      }
    } catch (err) {
      console.error('Error saving event settings:', err);
      setSaveMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-tab-content" style={{ gridTemplateColumns: '1fr' }}>
      <form onSubmit={handleSubmit} className="settings-form">
        {saveMessage && (
          <div className={`settings-save-banner ${saveMessage.type}`}>{saveMessage.text}</div>
        )}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3>Status</h3>
          </div>
          {isSuperadmin ? (
            <label className="radio-option">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span className="radio-label">{published ? 'Live on site' : 'Draft (hidden from public)'}</span>
            </label>
          ) : (
            <span className={`status-badge ${published ? 'active' : 'upcoming'}`}>
              {published ? 'Live on site' : 'Awaiting superadmin approval'}
            </span>
          )}
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <h3>Basic Info</h3>
          </div>
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
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <h3>Cover Image</h3>
          </div>
          <div className="settings-cover-row">
            <div className="settings-cover-preview">
              {coverImagePreview || event.coverImage ? (
                <img src={coverImagePreview || event.coverImage} alt="" />
              ) : (
                <span className="settings-cover-placeholder">🏆</span>
              )}
            </div>
            <div>
              <input type="file" accept="image/*" onChange={(e) => setCoverImageFile(e.target.files[0] || null)} />
              <p className="settings-hint">Shown as the banner on your event's public page.</p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <h3>Organizer Contact</h3>
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
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <h3>Voting Window</h3>
          </div>
          <p className="settings-hint">
            This is the only schedule for the whole event — every category opens and closes with it.
            Individual categories can only be manually paused, not separately timed.
          </p>
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
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EventSettingsForm;
