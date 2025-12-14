import { Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import CreatePost from "./pages/CreatePost";
import PostDetail from "./pages/PostDetail";
import BottomNav from "./components/BottomNav";
import Area from "./pages/Area";
import Profile from "./pages/Profile";
import "./App.css";

function App() {
  const location = useLocation();

  // Hide bottom nav on auth screens
  const hideNav =
    location.pathname === "/" || location.pathname === "/register";

  return (
    <div className="min-h-screen bg-gray-100">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/feed" element={<Feed />} />
        <Route path="/create" element={<CreatePost />} />
        <Route path="/posts/:id" element={<PostDetail />} />
        <Route path="/area" element={<Area />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>

      {!hideNav && <BottomNav />}
    </div>
  );
}

export default App;
