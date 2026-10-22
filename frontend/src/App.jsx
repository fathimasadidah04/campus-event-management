
import { useEffect, useMemo, useState } from "react";
import Auth from "./Auth";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      try {
        const response = await fetch(`${API_URL}/api/events`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Unable to load events");

        const data = await response.json();
        setEvents(data.events || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            "Unable to connect to CampusConnect. Check that your backend is running."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadEvents();
    return () => controller.abort();
  }, []);

  const categories = [
    "All",
    ...new Set(events.map((event) => event.category).filter(Boolean)),
  ];

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const query = search.toLowerCase().trim();

      const matchesSearch = [
        event.title,
        event.description,
        event.category,
        event.venue,
      ].some((value) => value?.toLowerCase().includes(query));

      return (
        matchesSearch &&
        (category === "All" || event.category === category)
      );
    });
  }, [events, search, category]);

  function handleLogin(data) {
    setUser(data.user);
    setShowAuth(false);
  }

  if (showAuth) {
    return (
      <Auth
        onLogin={handleLogin}
        onBack={() => setShowAuth(false)}
      />
    );
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#home">
          <span className="brand-icon">C</span>
          Campus<span className="brand-accent">Connect</span>
        </a>

        <nav>
          <a href="#home">Home</a>
          <a href="#events">Explore Events</a>
          <a href="#about">About</a>
        </nav>

        {user ? (
          <div className="account-actions">
            <span className="welcome-user">
              Hi, {user.name || user.email}
            </span>
            <button
              className="nav-button"
              onClick={() => setUser(null)}
              type="button"
            >
              Log out
            </button>
          </div>
        ) : (
          <button
            className="nav-button"
            onClick={() => setShowAuth(true)}
            type="button"
          >
            Log in / Sign up ↗
          </button>
        )}
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <p className="eyebrow">YOUR CAMPUS. YOUR COMMUNITY.</p>

            <h1>
              Make campus life
              <br />
              <span>unforgettable.</span>
            </h1>

            <p className="hero-description">
              Discover events, meet your people, and create memories
              that last beyond the classroom.
            </p>

            <a className="primary-button" href="#events">
              Explore Events <span>→</span>
            </a>

            <p className="hero-note">
              ✳ Find your next campus experience.
            </p>
          </div>

          <div className="hero-art">
            <div className="art-circle">
              <span className="art-star">✳</span>
              <p>CAMPUS LIFE</p>
              <h2>Meet.<br />Create.<br />Celebrate.</h2>
              <span className="art-bottom">YOUR CAMPUS AWAITS ↗</span>
            </div>
            <div className="floating-chip">
              <span>✦</span>
              <div>
                <strong>Discover</strong>
                <small>Something new</small>
              </div>
            </div>
          </div>
        </section>

        <section className="events-section" id="events">
          <div className="section-heading">
            <div>
              <p className="eyebrow">WHAT'S HAPPENING</p>
              <h2>Find your <span>next thing.</span></h2>
              <p className="muted">
                Discover experiences and opportunities happening on campus.
              </p>
            </div>

            <div className="event-count">
              <strong>{events.length.toString().padStart(2, "0")}</strong>
              <small>PUBLISHED EVENTS</small>
            </div>
          </div>

          <label className="search-box">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search events, categories or venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="filters">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? "filter active" : "filter"}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item === "All" ? "All Events" : item}
              </button>
            ))}
          </div>

          {loading && <div className="notice">Loading campus events...</div>}

          {!loading && error && (
            <div className="notice error">
              {error}
              <button onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filteredEvents.length === 0 && (
            <div className="notice">
              No events found. Try a different search or category.
            </div>
          )}

          {!loading && !error && (
            <div className="events-grid">
              {filteredEvents.map((event, index) => (
                <article className="event-card" key={event.id}>
                  <div className={`event-art art-${index % 3}`}>
                    <span className="art-label">
                      EVENT / {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="art-symbol">
                      {event.category?.toLowerCase() === "technology"
                        ? "⌘"
                        : event.category?.toLowerCase() === "cultural"
                          ? "✳"
                          : "✦"}
                    </span>
                    <span className="art-category">{event.category}</span>
                  </div>

                  <div className="event-body">
                    <p className="event-date">▦ {formatDate(event.startAt)}</p>
                    <h3>{event.title}</h3>
                    <p className="event-description">{event.description}</p>

                    <div className="event-details">
                      <span>⌖ {event.venue}</span>
                      <span>♙ Capacity: {event.capacity}</span>
                    </div>

                    <div className="event-footer">
                      <span className="published"><span /> Published</span>
                      <span className="event-time">
                        {new Date(event.startAt).toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="about-section" id="about">
          <p className="eyebrow">MORE THAN A CALENDAR</p>
          <h2>Campus life happens when we <span>show up.</span></h2>
          <p>
            CampusConnect brings campus events into one place, helping
            students discover opportunities and connect with their college
            community.
          </p>
          <a className="primary-button" href="#events">
            Find your next event →
          </a>
        </section>
      </main>

      <footer className="footer">
        <a className="brand" href="#home">
          <span className="brand-icon">C</span>
          Campus<span className="brand-accent">Connect</span>
        </a>
        <p>Built for campus life. Made for everyone.</p>
        <small>© {new Date().getFullYear()} CampusConnect</small>
      </footer>
    </div>
  );
}

export default App;
