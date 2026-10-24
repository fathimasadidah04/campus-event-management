
import { useEffect, useState } from "react";
import "./OrganizerDashboard.css";

const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const EMPTY_EVENT = {
    title: "",
    description: "",
    category: "Technology",
    venue: "",
    startAt: "",
    endAt: "",
    capacity: "100",
};

const CATEGORIES = [
    "Technology",
    "Cultural",
    "Sports",
    "Workshop",
    "Seminar",
    "Other",
];

function toLocalInputValue(date) {
    const local = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    );
    return local.toISOString().slice(0, 16);
}

function formatDate(value) {
    if (!value) return "Date not set";

    return new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export default function OrganizerDashboard({ token, onBack }) {
    const [events, setEvents] = useState([]);
    const [form, setForm] = useState(EMPTY_EVENT);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    async function request(path, options = {}) {
        const response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message || "The request could not be completed."
            );
        }

        return data;
    }

    // Load the organizer's events, including drafts.
    async function loadEvents() {
        if (!token) {
            setEvents([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await request("/api/events/my-events");
            setEvents(Array.isArray(data.events) ? data.events : []);
        } catch (err) {
            setError(err.message || "Unable to load your events.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadEvents();
        // Reload when the signed-in user's token changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    function updateField(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function resetForm() {
        setForm(EMPTY_EVENT);
        setEditingId(null);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setNotice("");

        if (new Date(form.endAt) <= new Date(form.startAt)) {
            setError(
                "The end date and time must be after the start date and time."
            );
            return;
        }

        if (!Number.isInteger(Number(form.capacity)) ||
            Number(form.capacity) < 1) {
            setError("Capacity must be a positive whole number.");
            return;
        }

        if (editingId) {
            setError(
                "Editing is not available yet. You can create and publish events for now."
            );
            return;
        }

        setSaving(true);

        try {
            const payload = {
                title: form.title.trim(),
                description: form.description.trim(),
                category: form.category,
                venue: form.venue.trim(),
                startAt: new Date(form.startAt).toISOString(),
                endAt: new Date(form.endAt).toISOString(),
                capacity: Number(form.capacity),
            };

            const data = await request("/api/events", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            setNotice(
                data.message || "Event created successfully as a draft."
            );

            resetForm();
            await loadEvents();
        } catch (err) {
            setError(err.message || "Unable to create the event.");
        } finally {
            setSaving(false);
        }
    }

    async function publishEvent(eventId) {
        setError("");
        setNotice("");
        setActionId(eventId);

        try {
            const data = await request(
                `/api/events/${eventId}/publish`,
                { method: "PATCH" }
            );

            setNotice(data.message || "Event published successfully.");
            await loadEvents();
        } catch (err) {
            setError(err.message || "Unable to publish the event.");
        } finally {
            setActionId(null);
        }
    }

    function startEditing(event) {
        setEditingId(event.id);

        setForm({
            title: event.title || "",
            description: event.description || "",
            category: event.category || "Technology",
            venue: event.venue || "",
            startAt: event.startAt
                ? toLocalInputValue(new Date(event.startAt))
                : "",
            endAt: event.endAt
                ? toLocalInputValue(new Date(event.endAt))
                : "",
            capacity: String(event.capacity || 100),
        });

        setError(
            "Editing is not connected yet. You can review the event details here, but saving changes is not available."
        );
        setNotice("");
    }

    const draftCount = events.filter(
        (event) => event.status === "DRAFT"
    ).length;

    const publishedCount = events.filter(
        (event) => event.status === "PUBLISHED"
    ).length;

    return (
        <main className="organizer-page">
            <header className="organizer-header">
                <button
                    className="organizer-brand"
                    type="button"
                    onClick={onBack}
                >
                    <span className="organizer-brand-icon">C</span>
                    Campus<span>Connect</span>
                </button>

                <button
                    className="organizer-back"
                    type="button"
                    onClick={onBack}
                >
                    ← Back to events
                </button>
            </header>

            <section className="organizer-intro">
                <p className="organizer-eyebrow">EVENT MANAGEMENT</p>

                <h1>
                    Organizer <span>Dashboard.</span>
                </h1>

                <p>
                    Create campus experiences, manage your drafts, and
                    publish events for students to discover.
                </p>
            </section>

            <div className="organizer-layout">
                <section className="organizer-panel">
                    <div className="organizer-panel-heading">
                        <p className="organizer-eyebrow">
                            {editingId ? "VIEW EVENT DETAILS" : "NEW EVENT"}
                        </p>

                        <h2>
                            {editingId
                                ? "Event details"
                                : "Create an event"}
                        </h2>

                        <p>
                            New events are saved as drafts until you publish
                            them.
                        </p>
                    </div>

                    {error && (
                        <div
                            className="organizer-alert organizer-alert-error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {notice && (
                        <div
                            className="organizer-alert organizer-alert-notice"
                            role="status"
                        >
                            {notice}
                        </div>
                    )}

                    <form
                        className="organizer-form"
                        onSubmit={handleSubmit}
                    >
                        <label htmlFor="event-title">Event title</label>
                        <input
                            id="event-title"
                            name="title"
                            value={form.title}
                            onChange={updateField}
                            placeholder="e.g. Annual Tech Fest"
                            maxLength={150}
                            required
                        />

                        <label htmlFor="event-description">
                            Description
                        </label>
                        <textarea
                            id="event-description"
                            name="description"
                            value={form.description}
                            onChange={updateField}
                            placeholder="What can students expect?"
                            rows={4}
                            required
                        />

                        <div className="organizer-form-row">
                            <div>
                                <label htmlFor="event-category">
                                    Category
                                </label>
                                <select
                                    id="event-category"
                                    name="category"
                                    value={form.category}
                                    onChange={updateField}
                                    required
                                >
                                    {CATEGORIES.map((category) => (
                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="event-capacity">
                                    Capacity
                                </label>
                                <input
                                    id="event-capacity"
                                    name="capacity"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={form.capacity}
                                    onChange={updateField}
                                    required
                                />
                            </div>
                        </div>

                        <label htmlFor="event-venue">Venue</label>
                        <input
                            id="event-venue"
                            name="venue"
                            value={form.venue}
                            onChange={updateField}
                            placeholder="e.g. Main Auditorium"
                            maxLength={200}
                            required
                        />

                        <div className="organizer-form-row">
                            <div>
                                <label htmlFor="event-start">
                                    Start date and time
                                </label>
                                <input
                                    id="event-start"
                                    name="startAt"
                                    type="datetime-local"
                                    value={form.startAt}
                                    onChange={updateField}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="event-end">
                                    End date and time
                                </label>
                                <input
                                    id="event-end"
                                    name="endAt"
                                    type="datetime-local"
                                    value={form.endAt}
                                    onChange={updateField}
                                    required
                                />
                            </div>
                        </div>

                        <div className="organizer-form-actions">
                            {!editingId && (
                                <button
                                    className="organizer-primary-button"
                                    type="submit"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Create draft event →"}
                                </button>
                            )}

                            {editingId && (
                                <button
                                    className="organizer-secondary-button"
                                    type="button"
                                    onClick={() => {
                                        resetForm();
                                        setError("");
                                        setNotice("");
                                    }}
                                >
                                    Close details
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                <section className="organizer-panel organizer-events-panel">
                    <div className="organizer-panel-heading">
                        <p className="organizer-eyebrow">YOUR EVENTS</p>
                        <h2>Manage your events</h2>
                        <p>
                            Drafts are private until published. Published
                            events are visible to students.
                        </p>

                        <div className="organizer-event-details">
                            <p>Total events: {events.length}</p>
                            <p>Drafts: {draftCount}</p>
                            <p>Published: {publishedCount}</p>
                        </div>

                        <button
                            className="organizer-secondary-button"
                            type="button"
                            onClick={loadEvents}
                            disabled={loading}
                        >
                            {loading ? "Refreshing..." : "↻ Refresh events"}
                        </button>
                    </div>

                    {loading ? (
                        <p className="organizer-empty">
                            Loading your events...
                        </p>
                    ) : error && events.length === 0 ? (
                        <div className="organizer-empty">
                            <p>Unable to load your events.</p>
                            <p>{error}</p>
                            <button
                                className="organizer-secondary-button"
                                type="button"
                                onClick={loadEvents}
                            >
                                Try again
                            </button>
                        </div>
                    ) : events.length === 0 ? (
                        <p className="organizer-empty">
                            You haven't created any events yet. Create your
                            first event using the form.
                        </p>
                    ) : (
                        <div className="organizer-event-list">
                            {events.map((event) => (
                                <article
                                    className="organizer-event-card"
                                    key={event.id}
                                >
                                    <div className="organizer-event-top">
                                        <span className="organizer-event-category">
                                            {event.category || "Campus event"}
                                        </span>

                                        <span className="organizer-event-status">
                                            {event.status || "UNKNOWN"}
                                        </span>
                                    </div>

                                    <h3>{event.title}</h3>

                                    <p className="organizer-event-description">
                                        {event.description ||
                                            "No description provided."}
                                    </p>

                                    <div className="organizer-event-details">
                                        <p>⌖ {event.venue}</p>
                                        <p>◷ {formatDate(event.startAt)}</p>
                                        <p>♙ Capacity: {event.capacity}</p>
                                    </div>

                                    <div className="organizer-form-actions">
                                        <button
                                            className="organizer-secondary-button"
                                            type="button"
                                            onClick={() => startEditing(event)}
                                        >
                                            View details
                                        </button>

                                        {event.status === "DRAFT" && (
                                            <button
                                                className="organizer-primary-button"
                                                type="button"
                                                disabled={actionId === event.id}
                                                onClick={() =>
                                                    publishEvent(event.id)
                                                }
                                            >
                                                {actionId === event.id
                                                    ? "Publishing..."
                                                    : "Publish event"}
                                            </button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
