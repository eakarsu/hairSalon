'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CalendarMonth,
  People,
  AttachMoney,
  Star,
  EventBusy,
  Loyalty,
  Refresh,
  Schedule,
  PersonOff,
  Spa,
  Inventory,
  CardGiftcard,
  Campaign,
  TaskAlt,
  Assessment,
  Groups,
  Payment,
  ShoppingCart,
  LocalOffer,
  CardMembership,
  Share,
  QueuePlayNext,
  MonetizationOn,
  EventAvailable,
  PhotoLibrary,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { CardsSkeleton } from '@/components/LoadingSkeleton';

interface DashboardStats {
  todayAppointments: number;
  weeklyRevenue: number;
  activeClients: number;
  noShowRate: number;
  repeatVisitRate: number;
  loyaltyUsage: number;
  avgRating: number;
  upcomingAppointments: Array<{
    id: string;
    clientName: string;
    serviceName: string;
    technicianName: string;
    startTime: string;
    status: string;
  }>;
  recentNoShows: Array<{
    id: string;
    clientName: string;
    date: string;
  }>;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: string;
  href?: string;
}

function StatCard({ title, value, subtitle, icon, trend, color, href }: StatCardProps) {
  const router = useRouter();

  const content = (
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={600}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
              {trend.isPositive ? (
                <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
              ) : (
                <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
              )}
              <Typography
                variant="caption"
                color={trend.isPositive ? 'success.main' : 'error.main'}
              >
                {trend.value}% vs last week
              </Typography>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: `${color}15`,
            color: color,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  );

  if (href) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardActionArea onClick={() => router.push(href)} sx={{ height: '100%' }}>
          {content}
        </CardActionArea>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      {content}
    </Card>
  );
}

// Quick navigation cards for all features
const featureCards = [
  { title: 'Calendar', icon: <CalendarMonth />, path: '/calendar', color: '#E91E63', description: 'View & manage appointments' },
  { title: 'Clients', icon: <People />, path: '/clients', color: '#2196F3', description: 'Manage client database' },
  { title: 'Services', icon: <Spa />, path: '/services', color: '#9C27B0', description: 'Service menu & pricing' },
  { title: 'Staff', icon: <Groups />, path: '/staff', color: '#FF5722', description: 'Team management' },
  { title: 'Payments', icon: <Payment />, path: '/payments', color: '#4CAF50', description: 'Payment tracking' },
  { title: 'Inventory', icon: <Inventory />, path: '/inventory', color: '#795548', description: 'Stock management' },
  { title: 'Gift Cards', icon: <CardGiftcard />, path: '/gift-cards', color: '#FF9800', description: 'Gift card management' },
  { title: 'Loyalty', icon: <Loyalty />, path: '/loyalty', color: '#E91E63', description: 'Loyalty program' },
  { title: 'Packages', icon: <LocalOffer />, path: '/packages', color: '#3F51B5', description: 'Service packages' },
  { title: 'Memberships', icon: <CardMembership />, path: '/memberships', color: '#009688', description: 'Membership plans' },
  { title: 'Campaigns', icon: <Campaign />, path: '/campaigns', color: '#F44336', description: 'Marketing campaigns' },
  { title: 'Tasks', icon: <TaskAlt />, path: '/tasks', color: '#607D8B', description: 'Task management' },
  { title: 'Reports', icon: <Assessment />, path: '/reports', color: '#673AB7', description: 'Analytics & reports' },
  { title: 'Retail', icon: <ShoppingCart />, path: '/retail', color: '#8BC34A', description: 'Retail products' },
  { title: 'Referrals', icon: <Share />, path: '/referrals', color: '#00BCD4', description: 'Referral tracking' },
  { title: 'Waitlist', icon: <QueuePlayNext />, path: '/waitlist', color: '#FFC107', description: 'Waitlist management' },
  { title: 'Tips', icon: <MonetizationOn />, path: '/tips', color: '#4CAF50', description: 'Tip tracking' },
  { title: 'Commissions', icon: <AttachMoney />, path: '/commissions', color: '#FF5722', description: 'Commission tracking' },
  { title: 'Time Off', icon: <EventAvailable />, path: '/time-off', color: '#9E9E9E', description: 'Time-off requests' },
  { title: 'Gallery', icon: <PhotoLibrary />, path: '/gallery', color: '#E91E63', description: 'Photo gallery' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={600} sx={{ mb: 3 }}>
          Dashboard
        </Typography>
        <CardsSkeleton count={4} />
        <Box sx={{ mt: 3 }}>
          <CardsSkeleton count={3} />
        </Box>
      </Box>
    );
  }

  const dashboardStats: DashboardStats = stats || {
    todayAppointments: 0,
    weeklyRevenue: 0,
    activeClients: 0,
    noShowRate: 0,
    repeatVisitRate: 0,
    loyaltyUsage: 0,
    avgRating: 0,
    upcomingAppointments: [],
    recentNoShows: [],
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back! Here&apos;s your salon overview for today.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchDashboardStats}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Stat Cards - All clickable */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Today's Appointments"
            value={dashboardStats.todayAppointments}
            subtitle="scheduled for today"
            icon={<CalendarMonth />}
            trend={{ value: 12, isPositive: true }}
            color="#E91E63"
            href="/calendar"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Weekly Revenue"
            value={`$${dashboardStats.weeklyRevenue.toLocaleString()}`}
            subtitle="this week"
            icon={<AttachMoney />}
            trend={{ value: 8, isPositive: true }}
            color="#4CAF50"
            href="/payments"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active Clients"
            value={dashboardStats.activeClients}
            subtitle="visited in 30 days"
            icon={<People />}
            trend={{ value: 5, isPositive: true }}
            color="#2196F3"
            href="/clients"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Average Rating"
            value={dashboardStats.avgRating.toFixed(1)}
            subtitle="from client reviews"
            icon={<Star />}
            color="#FF9800"
            href="/reviews"
          />
        </Grid>

        {/* Secondary Stats - Clickable */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardActionArea onClick={() => router.push('/calendar')} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EventBusy color="error" />
                  <Typography variant="h6">No-Show Rate</Typography>
                </Box>
                <Typography variant="h3" color="error.main">
                  {dashboardStats.noShowRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Target: under 5%
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardActionArea onClick={() => router.push('/clients')} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUp color="success" />
                  <Typography variant="h6">Repeat Visit Rate</Typography>
                </Box>
                <Typography variant="h3" color="success.main">
                  {dashboardStats.repeatVisitRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Clients returning within 60 days
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardActionArea onClick={() => router.push('/loyalty')} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Loyalty color="primary" />
                  <Typography variant="h6">Loyalty Engagement</Typography>
                </Box>
                <Typography variant="h3" color="primary.main">
                  {dashboardStats.loyaltyUsage}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Active loyalty members
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        {/* Recent No-Shows */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonOff color="error" />
              <Typography variant="h6">Recent No-Shows</Typography>
            </Box>
            <List dense>
              {dashboardStats.recentNoShows.map((noShow) => (
                <ListItem key={noShow.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'error.light' }}>
                      {noShow.clientName.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={noShow.clientName}
                    secondary={format(new Date(noShow.date), 'MMM d, h:mm a')}
                  />
                </ListItem>
              ))}
            </List>
            <Button fullWidth variant="text" size="small" onClick={() => router.push('/calendar')}>
              View All No-Shows
            </Button>
          </Paper>
        </Grid>

        {/* Upcoming Appointments */}
        <Grid size={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule color="primary" />
                <Typography variant="h6">Upcoming Appointments</Typography>
              </Box>
              <Button variant="outlined" size="small" onClick={() => router.push('/calendar')}>
                View Calendar
              </Button>
            </Box>
            <List>
              {dashboardStats.upcomingAppointments.map((appt) => (
                <ListItem
                  key={appt.id}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    bgcolor: 'grey.50',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'grey.100' },
                  }}
                  onClick={() => router.push('/calendar')}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {appt.clientName.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={appt.clientName}
                    secondary={`${appt.serviceName} with ${appt.technicianName}`}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(appt.startTime), 'h:mm a')}
                    </Typography>
                    <Chip
                      label={appt.status}
                      size="small"
                      color={appt.status === 'CONFIRMED' ? 'success' : 'default'}
                    />
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Quick Navigation - Feature Cards */}
        <Grid size={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Quick Navigation
          </Typography>
          <Grid container spacing={2}>
            {featureCards.map((feature) => (
              <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={feature.title}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                  }}
                >
                  <CardActionArea
                    onClick={() => router.push(feature.path)}
                    sx={{ height: '100%', p: 2, textAlign: 'center' }}
                  >
                    <Box sx={{ color: feature.color, mb: 1 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {feature.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
