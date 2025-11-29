'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
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
  AutoAwesome,
  Refresh,
  Schedule,
  PersonOff,
} from '@mui/icons-material';
import { format } from 'date-fns';

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
}

function StatCard({ title, value, subtitle, icon, trend, color }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
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
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

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

  const fetchAIInsights = async () => {
    if (!stats) return;
    setLoadingInsights(true);
    try {
      const response = await fetch('/api/ai/kpi-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noShowRate: stats.noShowRate / 100,
          repeatVisitRate: stats.repeatVisitRate / 100,
          loyaltyUsageRate: stats.loyaltyUsage / 100,
          campaignOpenRate: 0.45,
          averageTicket: stats.weeklyRevenue / Math.max(stats.todayAppointments * 7, 1),
          totalAppointments: stats.todayAppointments * 7,
        }),
      });
      const data = await response.json();
      setAiInsights(data.insights);
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const mockStats: DashboardStats = stats || {
    todayAppointments: 12,
    weeklyRevenue: 4850,
    activeClients: 156,
    noShowRate: 8.5,
    repeatVisitRate: 72,
    loyaltyUsage: 45,
    avgRating: 4.8,
    upcomingAppointments: [
      { id: '1', clientName: 'Jessica Martinez', serviceName: 'Gel Manicure', technicianName: 'Kim Tran', startTime: new Date().toISOString(), status: 'CONFIRMED' },
      { id: '2', clientName: 'Amy Wong', serviceName: 'Spa Pedicure', technicianName: 'Jenny Le', startTime: new Date().toISOString(), status: 'BOOKED' },
      { id: '3', clientName: 'Thu Pham', serviceName: 'Full Set Acrylic', technicianName: 'David Chen', startTime: new Date().toISOString(), status: 'CONFIRMED' },
    ],
    recentNoShows: [
      { id: '1', clientName: 'Sandra Reyes', date: new Date().toISOString() },
      { id: '2', clientName: 'Tina Chen', date: new Date().toISOString() },
    ],
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
        {/* Stat Cards */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Today's Appointments"
            value={mockStats.todayAppointments}
            subtitle="scheduled for today"
            icon={<CalendarMonth />}
            trend={{ value: 12, isPositive: true }}
            color="#E91E63"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Weekly Revenue"
            value={`$${mockStats.weeklyRevenue.toLocaleString()}`}
            subtitle="this week"
            icon={<AttachMoney />}
            trend={{ value: 8, isPositive: true }}
            color="#4CAF50"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Active Clients"
            value={mockStats.activeClients}
            subtitle="visited in 30 days"
            icon={<People />}
            trend={{ value: 5, isPositive: true }}
            color="#2196F3"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Average Rating"
            value={mockStats.avgRating.toFixed(1)}
            subtitle="from client reviews"
            icon={<Star />}
            color="#FF9800"
          />
        </Grid>

        {/* Secondary Stats */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EventBusy color="error" />
                <Typography variant="h6">No-Show Rate</Typography>
              </Box>
              <Typography variant="h3" color="error.main">
                {mockStats.noShowRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Target: under 5%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp color="success" />
                <Typography variant="h6">Repeat Visit Rate</Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                {mockStats.repeatVisitRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Clients returning within 60 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Loyalty color="primary" />
                <Typography variant="h6">Loyalty Engagement</Typography>
              </Box>
              <Typography variant="h3" color="primary.main">
                {mockStats.loyaltyUsage}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Active loyalty members
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* AI Insights */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome sx={{ color: 'secondary.main' }} />
                <Typography variant="h6">AI Business Insights</Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={loadingInsights ? <CircularProgress size={16} color="inherit" /> : <AutoAwesome />}
                onClick={fetchAIInsights}
                disabled={loadingInsights}
                sx={{
                  background: 'linear-gradient(45deg, #E91E63 30%, #9C27B0 90%)',
                }}
              >
                {loadingInsights ? 'Analyzing...' : 'Get Insights'}
              </Button>
            </Box>
            {aiInsights ? (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {aiInsights}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Click &quot;Get Insights&quot; to receive AI-powered recommendations for improving your salon&apos;s
                performance based on current KPIs.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Recent No-Shows */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonOff color="error" />
              <Typography variant="h6">Recent No-Shows</Typography>
            </Box>
            <List dense>
              {mockStats.recentNoShows.map((noShow) => (
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
                  <Tooltip title="Send recovery message">
                    <IconButton size="small" color="primary">
                      <AutoAwesome fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              ))}
            </List>
            <Button fullWidth variant="text" size="small">
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
              <Button variant="outlined" size="small" href="/calendar">
                View Calendar
              </Button>
            </Box>
            <List>
              {mockStats.upcomingAppointments.map((appt) => (
                <ListItem
                  key={appt.id}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    bgcolor: 'grey.50',
                  }}
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
      </Grid>
    </Box>
  );
}
