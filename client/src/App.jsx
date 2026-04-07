import { Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/Homepage.jsx";

function App() {

  return (
    <>
      <nav className="w-full h-[10vh] bg-white flex items-center justify-between px-8 border-b border-gray-200">
        <Link to="/" className="text-2xl font-bold text-gray-800">
          AuthX
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<h1 className="text-center mt-20 text-3xl">404 - Page Not Found</h1>} />
      </Routes>
    </>
  );
}

export default App;
