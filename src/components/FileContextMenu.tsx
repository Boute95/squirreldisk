import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

interface FileContextMenuProps {
  path: string;
  children: React.ReactNode;
  onTrash?: () => void;
}

const FileContextMenu = ({ path, children, onTrash }: FileContextMenuProps) => {
  const items: MenuProps["items"] = [
    {
      key: "open",
      label: "Open",
      onClick: () => invoke("open_in_os", { path }),
    },
    {
      key: "show",
      label: "Show in folder",
      onClick: () => invoke("show_in_folder", { path }),
    },
    {
      key: "copy",
      label: "Copy path",
      onClick: () => writeText(path),
    },
    { type: "divider" },
    {
      key: "trash",
      label: "Move to trash",
      danger: true,
      onClick: () => {
        invoke("move_to_trash", { path }).then(() => {
          onTrash?.();
        });
      },
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["contextMenu"]}>
      {children}
    </Dropdown>
  );
};

export default FileContextMenu;
