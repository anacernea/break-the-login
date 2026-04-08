import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/Homepage.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import { useState, useEffect } from "react";


function App() {

  const [email, setEmail] = useState(null);

  useEffect(() => {
    fetch("/api/user", { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setEmail(data.email || null))
      .catch(() => setEmail(null));
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    fetch("/api/logout", { method: "POST", credentials: 'include' })
      .then((res) => {
        if (res.ok) window.location.href = "/";
      })
      .catch((err) => console.error("Logout failed:", err));
  };

  return (
    <>
      <nav className="w-full h-[10vh] bg-white flex items-center justify-between px-8 border-b border-gray-200">
        <Link to="/" className="text-2xl font-bold text-gray-800">
          AuthX
        </Link>

        <div className="flex items-center gap-6">
          {email && <span className="font-medium">{email}</span>}
          {!email && (
            <Link to="/login" className="font-medium">Login</Link>
          )}
          {email && (
            <form onSubmit={handleLogout}>
              <button type="submit" className="font-medium">Logout</button>
            </form>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage email={email} />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="*" element={<h1 className="text-center mt-20 text-3xl">404 - Page Not Found</h1>} />
      </Routes>
    </>
  );
}

export default App;
