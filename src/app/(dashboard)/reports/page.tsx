'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Event as EventIcon,
  StarRate as StarIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface ReportData {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalAppointments: number;
    completedAppointments: number;
    noShows: number;
    cancelled: number;
    totalRevenue: number;
    previousRevenue: number;
    revenueChange: number;
    totalTips: number;
    newClients: number;
    previousNewClients: number;
    averageTicket: number;
  };
  revenueByService: Array<{ name: string; revenue: number; count: number }>;
  revenueByTechnician: Array<{ name: string; revenue: number; count: number; tips: number }>;
  bookingsBySource: {
    ONLINE: number;
    PHONE: number;
    WALKIN: number;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  subtitle?: string;
}

function StatCard({ title, value, change, icon, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ my: 1 }}>
              {value}
            </Typography>
            {change !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {change >= 0 ? (
                  <TrendingUpIcon color="success" fontSize="small" />
                ) : (
                  <TrendingDownIcon color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={change >= 0 ? 'success.main' : 'error.main'}
                >
                  {change >= 0 ? '+' : ''}{change.toFixed(1)}% vs previous
                </Typography>
              </Box>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'primary.50',
              color: 'primary.main',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('daily');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReport();
  }, [period]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${period}`);
      const reportData = await res.json();
      setData(reportData);
    } catch {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Alert severity="error">{error || 'Failed to load report'}</Alert>
    );
  }

  const totalBookings = data.bookingsBySource.ONLINE + data.bookingsBySource.PHONE + data.bookingsBySource.WALKIN;
  const maxServiceRevenue = Math.max(...data.revenueByService.map((s) => s.revenue), 1);
  const maxTechRevenue = Math.max(...data.revenueByTechnician.map((t) => t.revenue), 1);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Reports & Analytics</Typography>
          <Typography variant="body2" color="text.secondary">
            {format(new Date(data.startDate), 'MMM d, yyyy')} - {format(new Date(data.endDate), 'MMM d, yyyy')}
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, v) => v && setPeriod(v)}
          size="small"
        >
          <ToggleButton value="daily">Today</ToggleButton>
          <ToggleButton value="weekly">Week</ToggleButton>
          <ToggleButton value="monthly">Month</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Revenue"
            value={`$${data.summary.totalRevenue.toFixed(2)}`}
            change={data.summary.revenueChange}
            icon={<MoneyIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Appointments"
            value={data.summary.completedAppointments}
            icon={<EventIcon />}
            subtitle={`${data.summary.noShows} no-shows, ${data.summary.cancelled} cancelled`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="New Clients"
            value={data.summary.newClients}
            change={
              data.summary.previousNewClients > 0
                ? ((data.summary.newClients - data.summary.previousNewClients) /
                    data.summary.previousNewClients) *
                  100
                : 0
            }
            icon={<PeopleIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Tips"
            value={`$${data.summary.totalTips.toFixed(2)}`}
            icon={<StarIcon />}
            subtitle={`Avg ticket: $${data.summary.averageTicket.toFixed(2)}`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Revenue by Service */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue by Service
              </Typography>
              {data.revenueByService.length === 0 ? (
                <Typography color="text.secondary">No data for this period</Typography>
              ) : (
                <Box>
                  {data.revenueByService.slice(0, 8).map((service) => (
                    <Box key={service.name} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{service.name}</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          ${service.revenue.toFixed(2)} ({service.count})
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(service.revenue / maxServiceRevenue) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Booking Sources */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Booking Sources
              </Typography>
              {totalBookings === 0 ? (
                <Typography color="text.secondary">No bookings for this period</Typography>
              ) : (
                <Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Box sx={{ flex: 1, textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                      <Typography variant="h4" color="primary">
                        {data.bookingsBySource.ONLINE}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Online
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center', p: 2, bgcolor: 'secondary.50', borderRadius: 2 }}>
                      <Typography variant="h4" color="secondary">
                        {data.bookingsBySource.PHONE}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Phone
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
                      <Typography variant="h4" color="success.main">
                        {data.bookingsBySource.WALKIN}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Walk-in
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box
                      sx={{
                        flex: data.bookingsBySource.ONLINE,
                        height: 20,
                        bgcolor: 'primary.main',
                        borderRadius: 1,
                      }}
                    />
                    <Box
                      sx={{
                        flex: data.bookingsBySource.PHONE,
                        height: 20,
                        bgcolor: 'secondary.main',
                        borderRadius: 1,
                      }}
                    />
                    <Box
                      sx={{
                        flex: data.bookingsBySource.WALKIN,
                        height: 20,
                        bgcolor: 'success.main',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue by Technician */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Technician Performance
              </Typography>
              {data.revenueByTechnician.length === 0 ? (
                <Typography color="text.secondary">No data for this period</Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Technician</TableCell>
                        <TableCell align="right">Appointments</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Tips</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell sx={{ width: 200 }}>Performance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.revenueByTechnician.map((tech, index) => (
                        <TableRow key={tech.name}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {tech.name}
                              {index === 0 && <Chip size="small" color="primary" label="Top" />}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{tech.count}</TableCell>
                          <TableCell align="right">${tech.revenue.toFixed(2)}</TableCell>
                          <TableCell align="right">${tech.tips.toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            ${(tech.revenue + tech.tips).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <LinearProgress
                              variant="determinate"
                              value={(tech.revenue / maxTechRevenue) * 100}
                              sx={{ height: 10, borderRadius: 5 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
