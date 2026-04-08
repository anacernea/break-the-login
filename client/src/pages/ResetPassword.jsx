import { useState } from "react";
import { Link } from "react-router-dom";
import "../style.css";

export default function ResetPassword() {
    const [email, setEmail] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        // de adaugat functionalitate resetare parola
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Reset Password</h1>
                <form onSubmit={handleSubmit} className="auth-form">
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
                    <button type="submit" className="auth-button">Send Reset Link</button>
                </form>
                <div className="auth-links">
                    <Link to="/login" className="auth-link">Back to login</Link>
                </div>
            </div>
        </div>
    );
}
