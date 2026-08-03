import AdminLoginPage from "../../pages/AdminLoginPage";

// Login is intentionally unguarded so expired sessions can recover.
export default function AdminLoginRoute() {
  return <AdminLoginPage />;
}
