import { AdminGate } from "../../components/AdminGate";
import AdminSettingsPage from "../../pages/AdminSettingsPage";
import type { ChatSetting } from "../../api/types";
import { serverRequest } from "../../request/server";

export const dynamic = "force-dynamic";

// System settings route; AdminGate limits it to super_admin.
export default async function AdminSettingsRoute() {
  const setting = await serverRequest<ChatSetting>("/api/admin/settings/chat");
  return (
    <AdminGate>
      <AdminSettingsPage initialValue={setting?.value} />
    </AdminGate>
  );
}
