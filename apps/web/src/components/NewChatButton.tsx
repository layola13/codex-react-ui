import { useState, type MouseEvent, type ReactNode } from "react";
import { Button, ButtonGroup, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import ShieldIcon from "@mui/icons-material/Shield";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { PermissionPresetId } from "@codex-ui/shared";

type NewChatMode = {
  id: PermissionPresetId;
  label: string;
  description: string;
  icon: ReactNode;
  danger?: boolean;
};

type Props = {
  currentPermission: PermissionPresetId;
  label?: string;
  size?: "small" | "medium";
  onNew: (permission: PermissionPresetId) => void;
};

const newChatModes: NewChatMode[] = [
  {
    id: "workspaceAsk",
    label: "Workspace Chat",
    description: "workspace-write + approval prompts",
    icon: <ShieldIcon fontSize="small" color="primary" />
  },
  {
    id: "fullAsk",
    label: "Full Access",
    description: "danger-full-access + approval prompts",
    icon: <LockOpenIcon fontSize="small" color="warning" />
  },
  {
    id: "dangerBypass",
    label: "Full Access / Danger Bypass",
    description: "danger-full-access + approvalPolicy never",
    icon: <WarningAmberIcon fontSize="small" color="error" />,
    danger: true
  }
];

export function NewChatButton({ currentPermission, label = "New Chat", size = "small", onNew }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  function openMenu(event: MouseEvent<HTMLButtonElement>) {
    setAnchorEl(event.currentTarget);
  }

  function closeMenu() {
    setAnchorEl(null);
  }

  function choose(permission: PermissionPresetId) {
    closeMenu();
    onNew(permission);
  }

  return (
    <>
      <ButtonGroup size={size} variant="outlined" aria-label="New Chat">
        <Button startIcon={<AddIcon />} onClick={() => onNew(currentPermission)}>
          {label}
        </Button>
        <Button aria-label="Choose New Chat mode" aria-haspopup="menu" aria-expanded={open ? "true" : undefined} onClick={openMenu} sx={{ px: 0.75 }}>
          <ArrowDropDownIcon fontSize="small" />
        </Button>
      </ButtonGroup>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        MenuListProps={{ "aria-label": "New Chat modes", dense: true }}
        PaperProps={{ sx: { minWidth: 300 } }}
      >
        {newChatModes.map((mode) => (
          <MenuItem key={mode.id} selected={currentPermission === mode.id} onClick={() => choose(mode.id)}>
            <ListItemIcon>{mode.icon}</ListItemIcon>
            <ListItemText
              primary={mode.label}
              secondary={
                <Typography variant="caption" color={mode.danger ? "error.main" : "text.secondary"}>
                  {mode.description}
                </Typography>
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
