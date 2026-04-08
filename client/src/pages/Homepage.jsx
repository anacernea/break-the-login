import { Link } from "react-router-dom";
import "../style.css";

export default function HomePage({ email }) {
    if (!email) {
        return (
            <div className="home-page">
                <div className="home-hero">
                    <h1 className="home-title">Welcome to AuthX!</h1>
                    <div className="home-buttons">
                        <Link to="/login" className="home-primary-btn">Login</Link>
                        <Link to="/register" className="home-secondary-btn">Sign Up</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="home-page">
            <div className="home-dashboard">
                <h1 className="home-title">Welcome back, {email}!</h1>
                <p className="home-subtitle">You are logged in. This is your protected dashboard.</p>
            </div>
        </div>
    );
}
