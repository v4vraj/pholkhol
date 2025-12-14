import { NavLink } from "react-router-dom";

const navItem =
  "flex flex-col items-center gap-1 text-xs font-medium transition";

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-md flex justify-around py-2">
        {/* Feed */}
        <NavLink
          to="/feed"
          className={({ isActive }) =>
            `${navItem} ${isActive ? "text-orange-600" : "text-slate-500"}`
          }
        >
          <span className="text-xl">🏠</span>
          Feed
        </NavLink>

        {/* Area */}
        <NavLink
          to="/area"
          className={({ isActive }) =>
            `${navItem} ${isActive ? "text-orange-600" : "text-slate-500"}`
          }
        >
          <span className="text-xl">📍</span>
          Area
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${navItem} ${isActive ? "text-orange-600" : "text-slate-500"}`
          }
        >
          <span className="text-xl">👤</span>
          Profile
        </NavLink>
      </div>
    </nav>
  );
}
