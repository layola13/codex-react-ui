import { useState, useMemo, type MouseEvent } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import type { ProviderConfig } from "@codex-ui/shared";

export interface TopBarRelayTreeSelectorProps {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  onActivateProvider: (providerId: string) => Promise<void>;
  onOpenOfficialLogin: () => void;
}

export function TopBarRelayTreeSelector({
  providers,
  activeProviderId,
  onActivateProvider,
  onOpenOfficialLogin
}: TopBarRelayTreeSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const officialProvider = providers.find((p) => p.stationType === "official" || p.id === "official-openai");

  const open = Boolean(anchorEl);

  const handleOpen = (e: MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearch("");
  };

  const toggleExpand = (providerId: string, e: MouseEvent) => {
    e.stopPropagation();
    setExpandedProviders((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  // Filter providers and groups by search query
  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providers;

    return providers.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchKind = p.kind.toLowerCase().includes(q);
      const matchGroup = p.groups?.some((g) => g.name.toLowerCase().includes(q));
      return matchName || matchKind || matchGroup;
    });
  }, [providers, search]);

  const activeLabel = activeProvider ? activeProvider.name : "默认中转站";

  return (
    <>
      <Chip
        size="small"
        clickable
        icon={<CloudQueueIcon fontSize="small" />}
        label={
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" sx={{ fontWeight: 800 }}>
              {activeLabel}
            </Typography>
            <KeyboardArrowDownIcon fontSize="small" />
          </Stack>
        }
        onClick={handleOpen}
        data-testid="topbar-provider-tree-chip"
        sx={{
          maxWidth: { xs: 140, sm: 240, lg: 320 },
          display: { xs: "none", sm: "inline-flex" },
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          px: 0.5,
          "& .MuiChip-label": {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        }}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            width: { xs: 300, sm: 360 },
            maxHeight: 480,
            p: 1.5,
            borderRadius: 2.5,
            boxShadow: (theme) => theme.customShadows?.z16 ?? 8
          }
        }}
      >
        <Stack spacing={1.5}>
          {/* Top Search Input */}
          <TextField
            autoFocus
            size="small"
            fullWidth
            placeholder="搜索中转站或分组..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              )
            }}
          />

          <Box sx={{ overflowY: "auto", maxHeight: 380 }}>
            {/* Section 1: Official OpenAI */}
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, px: 1 }}>
              🔷 官方直连 (Official OpenAI)
            </Typography>

            {officialProvider ? (
              <ListItemButton
                selected={activeProviderId === officialProvider.id}
                onClick={async () => {
                  await onActivateProvider(officialProvider.id);
                  handleClose();
                }}
                sx={{ borderRadius: 1.5, mb: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Chip size="small" label="🔷" sx={{ bgcolor: "transparent", fontSize: 14 }} />
                </ListItemIcon>
                <ListItemText
                  primary={officialProvider.name}
                  secondary={officialProvider.baseUrl ?? "https://api.openai.com/v1"}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 800 }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
                {activeProviderId === officialProvider.id && <CheckIcon fontSize="small" color="primary" />}
              </ListItemButton>
            ) : (
              <Box sx={{ px: 1, pb: 1 }}>
                <Button
                  size="small"
                  fullWidth
                  variant="outlined"
                  startIcon={<VpnKeyIcon fontSize="small" />}
                  onClick={() => {
                    handleClose();
                    onOpenOfficialLogin();
                  }}
                  sx={{ borderRadius: 1.5, textTransform: "none", py: 0.75 }}
                >
                  未登录官方，点击登录官方 OpenAI
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Section 2: Relay Stations & Groups */}
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, px: 1 }}>
              ⚡ 中转站与分组 (Relay Stations & Groups)
            </Typography>

            {filteredProviders.filter((p) => p.stationType !== "official" && p.id !== "official-openai").length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1, py: 1 }}>
                未找到匹配的中转站。
              </Typography>
            ) : (
              <List dense disablePadding sx={{ width: "100%" }}>
                {filteredProviders
                  .filter((p) => p.stationType !== "official" && p.id !== "official-openai")
                  .map((provider) => {
                    const isSelected = activeProviderId === provider.id;
                    const hasGroups = provider.channelMode === "advanced" && provider.groups && provider.groups.length > 0;
                    const isExpanded = expandedProviders[provider.id] ?? true;

                    return (
                      <Box key={provider.id} sx={{ mb: 0.5 }}>
                        <ListItemButton
                          selected={isSelected}
                          onClick={async () => {
                            await onActivateProvider(provider.id);
                            handleClose();
                          }}
                          sx={{ borderRadius: 1.5, py: 0.75 }}
                        >
                          {hasGroups && (
                            <Box
                              onClick={(e) => toggleExpand(provider.id, e)}
                              sx={{ display: "flex", alignItems: "center", mr: 0.5, cursor: "pointer" }}
                            >
                              {isExpanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                            </Box>
                          )}
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                  {provider.name}
                                </Typography>
                                {provider.stationType === "rich" && <Chip size="small" label="🪙" sx={{ height: 18, fontSize: 11 }} />}
                                {provider.stationType === "charity" && <Chip size="small" label="💚" sx={{ height: 18, fontSize: 11 }} />}
                              </Stack>
                            }
                            secondary={`${provider.kind} • ${provider.quotaUsd != null ? `$${provider.quotaUsd}` : "无限额度"}`}
                            primaryTypographyProps={{ component: "div" }}
                            secondaryTypographyProps={{ variant: "caption" }}
                          />
                          {isSelected && <CheckIcon fontSize="small" color="primary" />}
                        </ListItemButton>

                        {/* Expandable Group Sub-Nodes */}
                        {hasGroups && (
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <List disablePadding sx={{ pl: 3.5 }}>
                              {provider.groups!.map((group) => (
                                <ListItemButton
                                  key={group.id}
                                  onClick={async () => {
                                    await onActivateProvider(provider.id);
                                    handleClose();
                                  }}
                                  sx={{ py: 0.4, borderRadius: 1, my: 0.25 }}
                                >
                                  <ListItemText
                                    primary={`👉 分组: ${group.name}`}
                                    secondary={`倍率: ${group.groupRatio ?? 1.0}x | Key池: ${group.keys?.length ?? 0}个`}
                                    primaryTypographyProps={{ variant: "caption", fontWeight: 700 }}
                                    secondaryTypographyProps={{ variant: "caption", fontSize: 10 }}
                                  />
                                </ListItemButton>
                              ))}
                            </List>
                          </Collapse>
                        )}
                      </Box>
                    );
                  })}
              </List>
            )}
          </Box>
        </Stack>
      </Popover>
    </>
  );
}
