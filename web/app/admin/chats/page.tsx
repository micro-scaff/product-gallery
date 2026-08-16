import { AdminGate } from "../../components/AdminGate";
import { AdminWorkspaceShell } from "../../components/AdminWorkspaceShell";
import AdminChatsPage from "../../pages/AdminChatsPage";

// Management chat route protected by the shared client-side role gate.
export default function AdminChatsRoute() {
  return (
    <AdminGate>
      <AdminWorkspaceShell>
        <AdminChatsPage />
      </AdminWorkspaceShell>
    </AdminGate>
  );
}
