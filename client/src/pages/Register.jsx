import { useState } from "react";
import { Link } from "react-router-dom";
import "../style.css";

export default function Register() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordCheck, setPasswordCheck] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");
        if (password !== passwordCheck) {
            setError("Passwords do not match.");
            return;
        }
        fetch("/api/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        })
            .then(async (response) => {
                if (response.ok) {
                    alert("Registration successful! Please log in.");
                    window.location.href = "/login";
                } else {
                    const data = await response.json();
                    setError(data.error || "Registration failed.");
                }
            })
            .catch((error) => {
                console.error("Error during Registration:", error);
                setError("Something went wrong. Please try again.");
            });
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Sign Up</h1>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label className="auth-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="auth-input"
                        />
                    </div>
                    <div className="auth-field">
                        <label className="auth-label">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder=""
                            required
                            className="auth-input"
                        />
                    </div>
                    <div className="auth-field">
                        <label className="auth-label">Confirm Password</label>
                        <input
                            type="password"
                            value={passwordCheck}
                            onChange={(e) => setPasswordCheck(e.target.value)}
                            placeholder=""
                            required
                            className="auth-input"
                        />
                    </div>
                    {error && <p className="auth-error">{error}</p>}
                    <button type="submit" className="auth-button">Sign Up</button>
                </form>
                <div className="auth-links">
                    <p className="auth-switch-text">
                        Already have an account? <Link to="/login" className="auth-link">Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
