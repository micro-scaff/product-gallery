import { redirect } from "next/navigation";

// /admin redirects to login; AdminGate will route authenticated users onward.
export default function AdminHomePage() {
  redirect("/admin/login");
}
