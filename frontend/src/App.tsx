import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Crew from "./pages/Crew";
import Equipment from "./pages/Equipment";
import Reports from "./pages/Reports";
import { useAuth } from "./lib/auth";

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthed } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="crew" element={<Crew />} />
        <Route path="equipment" element={<Equipment />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
