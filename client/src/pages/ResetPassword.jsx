import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import "../style.css";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        const res = await fetch("/api/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) return setError(data.error);
        setMessage("Reset link sent.");
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        const res = await fetch("/api/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password }),
        });
        const data = await res.json();
        if (!res.ok) return setError(data.error);
        navigate("/login");
    };

    if (token) {
        return (
            <div className="auth-page">
                <div className="auth-card auth-card--sm">
                    <h1 className="auth-title">New Password</h1>
                    <form onSubmit={handleResetPassword} className="auth-form">
                        <div className="auth-field">
                            <label className="auth-label">New password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="auth-input"
                            />
                        </div>
                        {error && <p className="auth-error">{error}</p>}
                        <button type="submit" className="auth-button">Reset Password</button>
                    </form>
                    <div className="auth-links">
                        <Link to="/login" className="auth-link">Back to login</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card auth-card--sm">
                <h1 className="auth-title">Reset Password</h1>
                <form onSubmit={handleRequestReset} className="auth-form">
                    <div className="auth-field">
                        <label className="auth-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="auth-input"
                        />
                    </div>
                    {error && <p className="auth-error">{error}</p>}
                    {message && <p className="auth-error" style={{ color: "#388e3c" }}>{message}</p>}
                    <button type="submit" className="auth-button">Send Reset Link</button>
                </form>
                <div className="auth-links">
                    <Link to="/login" className="auth-link">Back to login</Link>
                </div>
            </div>
        </div>
    );
}
