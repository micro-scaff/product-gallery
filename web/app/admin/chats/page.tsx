import { AdminGate } from "../../components/AdminGate";
import AdminChatsPage from "../../pages/AdminChatsPage";

// Management chat route protected by the shared client-side role gate.
export default function AdminChatsRoute() {
  return (
    <AdminGate>
      <AdminChatsPage />
    </AdminGate>
  );
}
