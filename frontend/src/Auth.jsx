
import { useState } from "react";
import "./Auth.css";

const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export default function Auth({ onLogin, onBack }) {
    const [mode, setMode] = useState("login");
    const [role, setRole] = useState("STUDENT");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (mode === "signup" && password.length < 8) {
            setError("Your password must contain at least 8 characters.");
            return;
        }

        if (mode === "signup" && password !== confirmPassword) {
            setError("Your passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const endpoint =
                mode === "signup" ? "/api/auth/register" : "/api/auth/login";

            const payload =
                mode === "signup"
                    ? { name: name.trim(), email: email.trim(), password, role }
                    : { email: email.trim(), password };

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Authentication failed.");
            }

            if (mode === "signup") {
                setSuccess("Account created! You can now log in.");
                setMode("login");
                setPassword("");
                setConfirmPassword("");
                return;
            }

            if (!data.token || !data.user) {
                throw new Error("The server returned an incomplete login response.");
            }

            // The parent component manages the signed-in user.
            onLogin(data);
        } catch (err) {
            setError(
                err.message || "Unable to connect to the server. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="auth-page">
            <section className="auth-visual">
                <button className="auth-brand" onClick={onBack} type="button">
                    <span className="auth-brand-icon">C</span>
                    Campus<span>Connect</span>
                </button>

                <div className="auth-visual-content">
                    <p className="auth-eyebrow">YOUR CAMPUS. YOUR COMMUNITY.</p>
                    <h1>
                        Your next
                        <br />
                        chapter starts
                        <br />
                        <span>here.</span>
                    </h1>
                    <p>
                        Find your people, discover new experiences, and make every
                        campus moment count.
                    </p>
                    <div className="auth-decoration">
                        <span>✳</span>
                        <span>✦</span>
                        <span>◌</span>
                    </div>
                </div>

                <p className="auth-visual-footer">
                    CAMPUSCONNECT · MADE FOR CAMPUS LIFE
                </p>
            </section>

            <section className="auth-form-side">
                <button className="auth-back" onClick={onBack} type="button">
                    ← Back to events
                </button>

                <div className="auth-form-wrap">
                    <p className="auth-eyebrow">
                        {mode === "login" ? "WELCOME BACK" : "JOIN THE COMMUNITY"}
                    </p>

                    <h2>{mode === "login" ? "Good to see you." : "Create your account."}</h2>

                    <p className="auth-subtitle">
                        {mode === "login"
                            ? "Sign in to continue your campus journey."
                            : "Get started with your CampusConnect experience."}
                    </p>

                    <div className="auth-mode-switch">
                        <button
                            type="button"
                            className={mode === "login" ? "selected" : ""}
                            onClick={() => {
                                setMode("login");
                                setError("");
                                setSuccess("");
                            }}
                        >
                            Log in
                        </button>
                        <button
                            type="button"
                            className={mode === "signup" ? "selected" : ""}
                            onClick={() => {
                                setMode("signup");
                                setError("");
                                setSuccess("");
                            }}
                        >
                            Sign up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {mode === "signup" && (
                            <>
                                <label htmlFor="auth-name">Full name</label>
                                <input
                                    id="auth-name"
                                    type="text"
                                    placeholder="Enter your full name"
                                    autoComplete="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    maxLength={100}
                                />

                                <label htmlFor="auth-role">Account type</label>
                                <select
                                    id="auth-role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="STUDENT">Student</option>
                                    <option value="ORGANIZER">Event organizer</option>
                                </select>
                                <p className="auth-field-note">
                                    Organizer registration is open for this project demo.
                                    In a production deployment, organizer accounts should
                                    require approval.
                                </p>
                            </>
                        )}

                        <label htmlFor="auth-email">Email address</label>
                        <input
                            id="auth-email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <label htmlFor="auth-password">Password</label>
                        <input
                            id="auth-password"
                            type="password"
                            placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                            autoComplete={mode === "signup" ? "new-password" : "current-password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={mode === "signup" ? 8 : undefined}
                            required
                        />

                        {mode === "signup" && (
                            <>
                                <label htmlFor="auth-confirm">Confirm password</label>
                                <input
                                    id="auth-confirm"
                                    type="password"
                                    placeholder="Enter your password again"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    minLength={8}
                                    required
                                />
                            </>
                        )}

                        {error && (
                            <div className="auth-alert auth-error" role="alert">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="auth-alert auth-success" role="status">
                                {success}
                            </div>
                        )}

                        <button
                            className="auth-submit"
                            type="submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Please wait..."
                                : mode === "login"
                                    ? "Log in to CampusConnect →"
                                    : "Create account →"}
                        </button>
                    </form>

                    <p className="auth-switch-text">
                        {mode === "login" ? "New to CampusConnect?" : "Already have an account?"}{" "}
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === "login" ? "signup" : "login");
                                setError("");
                                setSuccess("");
                            }}
                        >
                            {mode === "login" ? "Create an account" : "Log in"}
                        </button>
                    </p>
                </div>

                <p className="auth-legal">
                    CampusConnect · Discover. Participate. Belong.
                </p>
            </section>
        </main>
    );
}
