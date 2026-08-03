import { AdminGate } from "../../components/AdminGate";
import AdminAdminsPage from "../../pages/AdminAdminsPage";
import type { Admin, PageResult } from "../../api/types";
import { serverQuery, serverRequest } from "../../request/server";

export const dynamic = "force-dynamic";

// Route wrapper keeps App Router files small and puts page logic in app/pages.
export default async function AdminAdminsRoute() {
  const page = await serverRequest<PageResult<Admin>>(
    `/api/admin/admins?${serverQuery({ page: 1, page_size: 20 })}`,
  );
  return (
    <AdminGate>
      <AdminAdminsPage initialAdmins={page?.items} />
    </AdminGate>
  );
}
