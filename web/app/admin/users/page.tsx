import { AdminGate } from "../../components/AdminGate";
import AdminUsersPage from "../../pages/AdminUsersPage";
import type { PageResult, User } from "../../api/types";
import { serverQuery, serverRequest } from "../../request/server";

export const dynamic = "force-dynamic";

// C-end user management route.
export default async function AdminUsersRoute() {
  const page = await serverRequest<PageResult<User>>(
    `/api/admin/users?${serverQuery({ page: 1, page_size: 20 })}`,
  );
  return (
    <AdminGate>
      <AdminUsersPage initialUsers={page?.items} />
    </AdminGate>
  );
}
