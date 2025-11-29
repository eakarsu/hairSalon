'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Logout,
  Settings,
  Person,
} from '@mui/icons-material';
import { drawerWidth } from './Sidebar';

interface HeaderProps {
  sidebarOpen: boolean;
  onMenuClick: () => void;
}

export default function Header({ sidebarOpen, onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    router.push('/profile');
  };

  const handleSettings = () => {
    handleClose();
    router.push('/settings');
  };

  const handleSignOut = () => {
    handleClose();
    signOut({ callbackUrl: '/login' });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      OWNER: 'Owner',
      MANAGER: 'Manager',
      TECHNICIAN: 'Technician',
      FRONTDESK: 'Front Desk',
      CLIENT_USER: 'Client',
    };
    return labels[role] || role;
  };

  return (
    <AppBar
      position="fixed"
      color="default"
      sx={{
        width: { md: `calc(100% - ${sidebarOpen ? drawerWidth : 72}px)` },
        ml: { md: `${sidebarOpen ? drawerWidth : 72}px` },
        backgroundColor: 'background.paper',
        transition: (theme) =>
          theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Notifications">
            <IconButton color="inherit">
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Box
            onClick={handleMenu}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              p: 1,
              borderRadius: 2,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontSize: '0.9rem',
              }}
            >
              {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={500}>
                {session?.user?.name || 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {session?.user?.role ? getRoleLabel(session.user.role) : ''}
              </Typography>
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            onClick={handleClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: { width: 220, mt: 1 },
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2">{session?.user?.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {session?.user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleProfile}>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleSettings}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleSignOut}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
