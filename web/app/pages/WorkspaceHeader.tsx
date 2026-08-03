import { Typography } from "antd";
import type { ReactNode } from "react";

// WorkspaceHeader gives every admin workspace the same title/description/action
// structure without repeating layout markup in each page.
export function WorkspaceHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <section className="workspace-header">
      <div>
        <Typography.Text className="eyebrow">Workspace</Typography.Text>
        <Typography.Title level={2}>{title}</Typography.Title>
        <Typography.Paragraph>{description}</Typography.Paragraph>
      </div>
      {action}
    </section>
  );
}
