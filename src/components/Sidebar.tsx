'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Spa as SpaIcon,
  CardGiftcard as LoyaltyIcon,
  Groups as StaffIcon,
  Campaign as CampaignIcon,
  TaskAlt as TaskIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  Menu as MenuIcon,
  PhotoLibrary as GalleryIcon,
  Inventory as InventoryIcon,
  Assessment as ReportsIcon,
  CardGiftcard as GiftCardIcon,
  QueuePlayNext as WaitlistIcon,
  MonetizationOn as TipsIcon,
  Payment as PaymentIcon,
  AttachMoney as CommissionIcon,
  ShoppingCart as RetailIcon,
  LocalOffer as PackagesIcon,
  CardMembership as MembershipIcon,
  EventBusy as TimeOffIcon,
  Share as ReferralIcon,
} from '@mui/icons-material';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
  { text: 'Clients', icon: <PeopleIcon />, path: '/clients' },
  { text: 'Services', icon: <SpaIcon />, path: '/services' },
  { text: 'Packages', icon: <PackagesIcon />, path: '/packages' },
  { text: 'Memberships', icon: <MembershipIcon />, path: '/memberships' },
  { text: 'Waitlist', icon: <WaitlistIcon />, path: '/waitlist' },
  { text: 'Payments', icon: <PaymentIcon />, path: '/payments' },
  { text: 'Commissions', icon: <CommissionIcon />, path: '/commissions' },
  { text: 'Tips', icon: <TipsIcon />, path: '/tips' },
  { text: 'Retail', icon: <RetailIcon />, path: '/retail' },
  { text: 'Gift Cards', icon: <GiftCardIcon />, path: '/gift-cards' },
  { text: 'Loyalty', icon: <LoyaltyIcon />, path: '/loyalty' },
  { text: 'Referrals', icon: <ReferralIcon />, path: '/referrals' },
  { text: 'Gallery', icon: <GalleryIcon />, path: '/gallery' },
  { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
  { text: 'Reports', icon: <ReportsIcon />, path: '/reports' },
  { text: 'Staff', icon: <StaffIcon />, path: '/staff' },
  { text: 'Time Off', icon: <TimeOffIcon />, path: '/time-off' },
  { text: 'Campaigns', icon: <CampaignIcon />, path: '/campaigns' },
  { text: 'Tasks', icon: <TaskIcon />, path: '/tasks' },
];

const bottomMenuItems = [
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SpaIcon sx={{ color: 'primary.main', fontSize: 32 }} />
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #E91E63 30%, #9C27B0 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            NailFlow AI
          </Typography>
        </Box>
        {!isMobile && (
          <IconButton onClick={onToggle} size="small">
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, py: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ px: 1 }}>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={pathname === item.path || pathname.startsWith(item.path + '/')}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List sx={{ py: 1 }}>
        {bottomMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ px: 1 }}>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={pathname === item.path}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={isMobile && open}
        onClose={onToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          display: { xs: 'none', md: 'block' },
          width: open ? drawerWidth : 72,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 72,
            boxSizing: 'border-box',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
          },
        }}
      >
        {open ? (
          drawerContent
        ) : (
          <Box sx={{ pt: 2 }}>
            <IconButton onClick={onToggle} sx={{ mx: 'auto', display: 'block', mb: 2 }}>
              <MenuIcon />
            </IconButton>
            <List>
              {menuItems.map((item) => (
                <ListItem key={item.text} disablePadding sx={{ px: 1 }}>
                  <ListItemButton
                    component={Link}
                    href={item.path}
                    selected={pathname === item.path || pathname.startsWith(item.path + '/')}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      justifyContent: 'center',
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '& .MuiListItemIcon-root': {
                          color: 'white',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 'auto' }}>{item.icon}</ListItemIcon>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Drawer>
    </>
  );
}

export { drawerWidth };
