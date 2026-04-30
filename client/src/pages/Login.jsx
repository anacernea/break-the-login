import { useState } from "react";
import { Link } from "react-router-dom";
import "../style.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [blockError, setBlockError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        setEmailError("");
        setPasswordError("");
        setBlockError("");
        fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        })
            .then(async (response) => {
                if (response.ok) {
                    window.location.href = "/";
                } else {
                    const data = await response.json();
                    if (data.error === "Too many login attempts. Please try again later." ||
                        data.error === "Account temporarily locked. Please try again later.") {
                        setBlockError(data.error);
                    } else if (data.error === "Invalid email") {
                        setEmailError("Invalid email address.");
                    } else if (data.error === "Invalid password") {
                        setPasswordError("Invalid password.");
                    } else {
                        setEmailError("Invalid credentials.");
                    }
                }
            })
            .catch((error) => {
                console.error("Error during login:", error);
                setEmailError("Something went wrong. Please try again.");
            });
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Login</h1>
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
                        {emailError && <p className="auth-error">{emailError}</p>}
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
                        {passwordError && <p className="auth-error">{passwordError}</p>}
                    </div>
                    {blockError && <p className="auth-error">{blockError}</p>}
                    <button type="submit" className="auth-button">Login</button>
                </form>
                <div className="auth-links">
                    <Link to="/reset-password" className="auth-link">Forgot password?</Link>
                    <p className="auth-switch-text">
                        Don't have an account? <Link to="/register" className="auth-link">Sign up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
