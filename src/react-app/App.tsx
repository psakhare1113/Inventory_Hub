import { BrowserRouter as Router, Routes, Route } from "react-router";
import AdminUsersPage from "@/react-app/pages/AdminUsers";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminUsersPage />} />
      </Routes>
    </Router>
  );
}
