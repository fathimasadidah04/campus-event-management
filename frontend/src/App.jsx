import { useEffect, useMemo, useState } from "react";
import Auth from "./Auth";
import OrganizerDashboard from "./OrganizerDashboard";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const EVENT_IMAGES = {
  technology:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=85",
  cultural:
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85",
  kalaravam:
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1000&q=85",
  workshop:
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=85",
  sports:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=85",
  seminar:
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=85",
  club:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85",
  default:
    "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1000&q=85",
};

function getEventImage(category = "", title = "") {
  const normalized = category.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("kalaravam")) {
    return EVENT_IMAGES.kalaravam;
  }
  if (normalized.includes("tech")) return EVENT_IMAGES.technology;
  if (normalized.includes("cultur") || normalized.includes("music")) {
    return EVENT_IMAGES.cultural;
  }
  if (normalized.includes("workshop")) return EVENT_IMAGES.workshop;
  if (normalized.includes("sport")) return EVENT_IMAGES.sports;
  if (normalized.includes("seminar") || normalized.includes("career")) {
    return EVENT_IMAGES.seminar;
  }
  if (normalized.includes("club") || normalized.includes("social")) {
    return EVENT_IMAGES.club;
  }
  return EVENT_IMAGES.default;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function App() {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [view, setView] = useState("events");
  const [registrations, setRegistrations] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [notice, setNotice] = useState(null);

  async function loadEvents(signal) {
    try {
      setError("");
      const response = await fetch(`${API_URL}/api/events`, { signal });
      if (!response.ok) throw new Error("Unable to load events.");
      const data = await response.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError("We couldn't load campus events. Check that your backend is running.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadEvents(controller.signal);
    return () => controller.abort();
  }, []);

  async function loadRegistrations(activeToken = token) {
    if (!activeToken) return;
    setRegistrationsLoading(true);
    setNotice(null);

    try {
      const response = await fetch(`${API_URL}/api/registrations/me`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        setToken(null);
        setUser(null);
        setRegistrations([]);
        setNotice({ type: "error", text: "Your session has expired. Please log in again." });
        setShowAuth(true);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load your registrations.");
      }
      setRegistrations(Array.isArray(data.registrations) ? data.registrations : []);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Unable to load your registrations." });
    } finally {
      setRegistrationsLoading(false);
    }
  }

  function handleLogin(data) {
    setToken(data.token);
    setUser(data.user);
    setShowAuth(false);
    setView("events");
    setNotice({
      type: "success",
      text: `Welcome to CampusConnect, ${data.user.name || "you're signed in"}!`,
    });
  }

  function handleLogout() {
    setUser(null);
    setToken(null);
    setRegistrations([]);
    setView("events");
    setNotice({ type: "success", text: "You have been logged out." });
  }

  async function registerForEvent(event) {
    if (!user || !token) {
      setShowAuth(true);
      return;
    }
    if (user.role !== "STUDENT") {
      setNotice({ type: "error", text: "Only student accounts can register for events." });
      return;
    }

    setActionId(event.id);
    setNotice(null);

    try {
      const response = await fetch(`${API_URL}/api/events/${event.id}/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      if (response.status === 401 || response.status === 403) {
        setNotice({ type: "error", text: data.message || "Please log in with a student account." });
        return;
      }
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to register for this event.");
      }

      setNotice({ type: "success", text: data.message || `You're registered for ${event.title}!` });
      await loadRegistrations(token);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Registration failed. Please try again." });
    } finally {
      setActionId("");
    }
  }

  async function cancelRegistration(registration) {
    if (!token) {
      setShowAuth(true);
      return;
    }
    if (!window.confirm(`Cancel your registration for "${registration.event.title}"?`)) return;

    setActionId(registration.id);
    setNotice(null);

    try {
      const response = await fetch(`${API_URL}/api/registrations/${registration.id}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to cancel registration.");
      }
      setNotice({ type: "success", text: data.message || "Registration cancelled successfully." });
      await loadRegistrations(token);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Cancellation failed. Please try again." });
    } finally {
      setActionId("");
    }
  }

  const categories = useMemo(
    () => ["All", ...new Set(events.map((event) => event.category).filter(Boolean))],
    [events]
  );

  const filteredEvents = useMemo(() => {
    const query = search.toLowerCase().trim();
    return events.filter((event) => {
      const matchesSearch = [
        event.title,
        event.description,
        event.category,
        event.venue,
      ].some((value) => value?.toLowerCase().includes(query));

      return matchesSearch && (category === "All" || event.category === category);
    });
  }, [events, search, category]);

  const registeredEventIds = useMemo(
    () => new Set(
      registrations
        .filter((registration) => registration.status === "CONFIRMED")
        .map((registration) => registration.eventId)
    ),
    [registrations]
  );

  if (showAuth) {
    return <Auth onLogin={handleLogin} onBack={() => setShowAuth(false)} />;
  }

  return (
    <div className="app" id="home">
      <header className="navbar">
        <a className="brand" href="#home" aria-label="CampusConnect home" onClick={() => setView("events")}>
          <span className="brand-icon">C</span>
          <span>Campus<span className="brand-accent">Connect</span></span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <button className={`nav-link ${view === "events" ? "nav-link-active" : ""}`} onClick={() => setView("events")} type="button">Home</button>
          <button className={`nav-link ${view === "events" ? "nav-link-active" : ""}`} onClick={() => setView("events")} type="button">Events</button>

          {user?.role === "STUDENT" && (
            <button
              className={`nav-link ${view === "registrations" ? "nav-link-active" : ""}`}
              onClick={() => {
                setView("registrations");
                loadRegistrations();
              }}
              type="button"
            >
              My Registrations
            </button>
          )}

          {(user?.role === "ORGANIZER" || user?.role === "ADMIN") && (
            <button className={`nav-link ${view === "organizer" ? "nav-link-active" : ""}`} onClick={() => setView("organizer")} type="button">
              Organizer Dashboard
            </button>
          )}

          <button className={`nav-link ${view === "about" ? "nav-link-active" : ""}`} onClick={() => setView("about")} type="button">About</button>
        </nav>

        <div className="navbar-actions">
          {user ? (
            <>
              <span className="welcome-user">
                <span className="user-avatar">{(user.name || user.email || "U").charAt(0).toUpperCase()}</span>
                <span className="user-greeting">Hi, {user.name || user.email}</span>
              </span>
              <button className="button button-outline nav-button" onClick={handleLogout} type="button">Log out</button>
            </>
          ) : (
            <>
              <button className="signin-button" onClick={() => setShowAuth(true)} type="button">Sign in</button>
              <button className="button button-primary nav-button" onClick={() => setShowAuth(true)} type="button">
                Get Started <span aria-hidden="true">↗</span>
              </button>
            </>
          )}
        </div>
      </header>

      {notice && (
        <div className={`app-notice ${notice.type === "error" ? "app-notice-error" : ""}`} role={notice.type === "error" ? "alert" : "status"}>
          <span>{notice.type === "error" ? "!" : "✓"}</span>
          <p>{notice.text}</p>
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      <main>
        {view === "organizer" && (
          <OrganizerDashboard token={token} onBack={() => setView("events")} />
        )}

        {view === "events" && (
          <>
            <section className="hero">
              <div className="hero-image" aria-hidden="true" />
              <div className="hero-content">
                <p className="eyebrow">EVENTS · PEOPLE · OPPORTUNITIES</p>
                <h1>Discover events<br />that make your<br /><span>college life better.</span></h1>
                <p className="hero-description">
                  Join, create and discover campus experiences — from technical workshops to cultural festivals, all in one place.
                </p>
                <div className="hero-actions">
                  <a className="button button-primary" href="#events">Explore events <span aria-hidden="true">→</span></a>
                  <button className="button button-outline" onClick={() => setShowAuth(true)} type="button">Join the community</button>
                </div>
                <div className="hero-note"><span className="status-dot" />Find your people. Make your moment.</div>
              </div>

              <div className="hero-bottom">
                <div className="hero-feature"><span className="feature-icon">✳</span><span><strong>Workshops</strong><small>Learn new skills</small></span></div>
                <div className="hero-feature"><span className="feature-icon">✧</span><span><strong>Cultural events</strong><small>Showcase your talent</small></span></div>
                <div className="hero-feature"><span className="feature-icon">⌘</span><span><strong>Tech &amp; innovation</strong><small>Build something new</small></span></div>
                <div className="hero-feature"><span className="feature-icon">♧</span><span><strong>Clubs &amp; communities</strong><small>Find your people</small></span></div>
              </div>
            </section>

            <section className="events-section" id="events">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">YOUR NEXT EXPERIENCE STARTS HERE</p>
                  <h2>Explore <span>campus events.</span></h2>
                  <p className="section-description">Find workshops, festivals and experiences worth showing up for.</p>
                </div>
                <div className="event-count">
                  <strong>{loading ? "—" : String(events.length).padStart(2, "0")}</strong>
                  <span>Published<br />events</span>
                </div>
              </div>

              <div className="event-controls">
                <label className="search-box">
                  <span className="search-icon" aria-hidden="true">⌕</span>
                  <input type="search" placeholder="Search events, categories or venues..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search events" />
                  <span className="search-hint" aria-hidden="true">↵</span>
                </label>
                <div className="filters" aria-label="Filter events by category">
                  {categories.map((item) => (
                    <button key={item} className={category === item ? "filter active" : "filter"} onClick={() => setCategory(item)} type="button" aria-pressed={category === item}>
                      {item === "All" ? "All events" : item}
                    </button>
                  ))}
                </div>
              </div>

              {loading && <div className="notice"><span className="loading-spinner" /><p>Finding your next campus experience...</p></div>}

              {!loading && error && (
                <div className="notice error">
                  <span className="notice-icon">!</span>
                  <h3>Events aren't available right now</h3>
                  <p>{error}</p>
                  <button className="button button-primary" onClick={() => window.location.reload()} type="button">Try again</button>
                </div>
              )}

              {!loading && !error && filteredEvents.length === 0 && (
                <div className="notice">
                  <span className="notice-icon">⌕</span>
                  <h3>No matching events</h3>
                  <p>Try another search or choose a different category.</p>
                  <button className="button button-outline" onClick={() => { setSearch(""); setCategory("All"); }} type="button">Clear filters</button>
                </div>
              )}

              {!loading && !error && filteredEvents.length > 0 && (
                <div className="events-grid">
                  {filteredEvents.map((event, index) => {
                    const alreadyRegistered = registeredEventIds.has(event.id);
                    return (
                      <article className="event-card" key={event.id}>
                        <div className="event-image-wrap">
                          <img className="event-image" src={getEventImage(event.category, event.title)} alt="" loading={index < 3 ? "eager" : "lazy"} />
                          <div className="event-image-overlay" />
                          <span className="art-category">{event.category || "Campus"}</span>
                          <span className="image-index">{String(index + 1).padStart(2, "0")}</span>
                        </div>

                        <div className="event-body">
                          <p className="event-date"><span aria-hidden="true">▦</span>{" "}{formatDate(event.startAt)}</p>
                          <h3>{event.title}</h3>
                          <p className="event-description">{event.description}</p>
                          <div className="event-details">
                            <span><span aria-hidden="true">⌖</span>{" "}{event.venue}</span>
                            <span><span aria-hidden="true">◷</span>{" "}{formatTime(event.startAt)}</span>
                          </div>

                          <div className="event-footer">
                            <span className="published"><span className="status-dot" />Published</span>
                            {user?.role === "STUDENT" ? (
                              <button className="event-action" type="button" disabled={actionId === event.id || alreadyRegistered} onClick={() => registerForEvent(event)}>
                                {actionId === event.id ? "Registering..." : alreadyRegistered ? "✓ Registered" : "Register now"}
                                {!alreadyRegistered && <span aria-hidden="true">↗</span>}
                              </button>
                            ) : (
                              <button className="event-action" type="button" onClick={() => {
                                if (!user) setShowAuth(true);
                                else setNotice({ type: "error", text: "Only student accounts can register for events." });
                              }}>
                                {user ? "Student access only" : "Sign in to register"}
                                {!user && <span aria-hidden="true">↗</span>}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {!loading && !error && events.length > 0 && (
                <p className="events-footnote">Showing {filteredEvents.length} of {events.length} published events</p>
              )}
            </section>
          </>
        )}

        {view === "registrations" && (
          <section className="events-section dashboard-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR CAMPUS JOURNEY</p>
                <h2>My <span>registrations.</span></h2>
                <p className="section-description">Keep track of the events you plan to attend.</p>
              </div>
              <button className="button button-outline" onClick={() => setView("events")} type="button">← Explore events</button>
            </div>

            {registrationsLoading && <div className="notice"><span className="loading-spinner" /><p>Loading your registrations...</p></div>}

            {!registrationsLoading && registrations.length === 0 && (
              <div className="notice">
                <span className="notice-icon">✳</span>
                <h3>No registrations yet</h3>
                <p>Find an event that interests you and register to see it here.</p>
                <button className="button button-primary" onClick={() => setView("events")} type="button">Explore events →</button>
              </div>
            )}

            {!registrationsLoading && registrations.length > 0 && (
              <div className="registrations-list">
                {registrations.map((registration) => (
                  <article className="registration-card" key={registration.id}>
                    <div className="registration-image">
                      <img src={getEventImage(registration.event.category, registration.event.title)} alt="" />
                    </div>
                    <div className="registration-content">
                      <p className="event-date">{formatDate(registration.event.startAt)}</p>
                      <h3>{registration.event.title}</h3>
                      <p className="event-description">{registration.event.description}</p>
                      <div className="event-details">
                        <span>⌖ {registration.event.venue}</span>
                        <span>◷ {formatTime(registration.event.startAt)}</span>
                      </div>
                    </div>
                    <div className="registration-actions">
                      <span className={`registration-status ${registration.status === "CONFIRMED" ? "status-confirmed" : "status-cancelled"}`}>
                        {registration.status === "CONFIRMED" ? "✓ Confirmed" : "Cancelled"}
                      </span>
                      {registration.status === "CONFIRMED" && new Date(registration.event.startAt) > new Date() && (
                        <button className="button button-outline" type="button" disabled={actionId === registration.id} onClick={() => cancelRegistration(registration)}>
                          {actionId === registration.id ? "Cancelling..." : "Cancel registration"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {view === "about" && (
          <section className="about-section about-page">
            <div className="about-decoration" aria-hidden="true">✳</div>
            <p className="eyebrow">MORE THAN A CALENDAR</p>
            <h2>Your campus. Your people. <span>Your moments.</span></h2>
            <p>
              CampusConnect brings campus events into one place, helping students discover opportunities, take part in activities and connect with their college community.
            </p>
            <button className="button button-primary" onClick={() => setView("events")} type="button">Explore events <span aria-hidden="true">→</span></button>
          </section>
        )}
      </main>

      <footer className="footer">
        <a className="brand" href="#home" onClick={() => setView("events")}>
          <span className="brand-icon">C</span>
          <span>Campus<span className="brand-accent">Connect</span></span>
        </a>
        <p>Discover. Participate. Belong.</p>
        <small>© {new Date().getFullYear()} CampusConnect</small>
      </footer>
    </div>
  );
}

export default App;