'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Today,
  Schedule,
  Person,
  CheckCircle,
  Cancel,
  AccessTime,
  NavigateBefore,
  NavigateNext,
  Phone,
  Refresh,
} from '@mui/icons-material';
import { format, addDays, subDays, startOfDay, endOfDay, isToday } from 'date-fns';

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  client: {
    id: string;
    name: string;
    phone: string;
    preferredLanguage: string;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    basePrice: number;
  };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
}

export default function StaffPortalPage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();

      const [appointmentsRes, tasksRes] = await Promise.all([
        fetch(`/api/appointments?start=${start}&end=${end}&technicianId=${session?.user?.id}`),
        fetch('/api/tasks?assignedToMe=true&status=OPEN,IN_PROGRESS'),
      ]);

      if (appointmentsRes.ok) {
        const data = await appointmentsRes.json();
        setAppointments(data.appointments || []);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleTaskStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'primary';
      case 'CONFIRMED':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'NO_SHOW':
        return 'error';
      case 'CANCELLED':
        return 'default';
      default:
        return 'default';
    }
  };

  const upcomingAppointments = appointments.filter(apt =>
    new Date(apt.startTime) >= new Date() &&
    ['BOOKED', 'CONFIRMED'].includes(apt.status)
  );

  const completedToday = appointments.filter(apt =>
    apt.status === 'COMPLETED'
  ).length;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #f8bbd9 0%, #f48fb1 100%)' }}>
        <Typography variant="h5" fontWeight="bold" color="white">
          Staff Portal
        </Typography>
        <Typography variant="body2" color="white" sx={{ opacity: 0.9 }}>
          {session?.user?.name} • {session?.user?.role}
        </Typography>
      </Paper>

      {/* Date Navigation */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton onClick={() => setSelectedDate(d => subDays(d, 1))}>
            <NavigateBefore />
          </IconButton>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {format(selectedDate, 'MMMM d, yyyy')}
            </Typography>
          </Box>
          <IconButton onClick={() => setSelectedDate(d => addDays(d, 1))}>
            <NavigateNext />
          </IconButton>
        </Box>
      </Paper>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h4" color="primary">
                {appointments.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h4" color="info.main">
                {upcomingAppointments.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Upcoming
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1 }}>
              <Typography variant="h4" color="success.main">
                {completedToday}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
        >
          <Tab icon={<Schedule />} label="Schedule" />
          <Tab icon={<CheckCircle />} label="Tasks" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Schedule Tab */}
          {activeTab === 0 && (
            <Box>
              {appointments.length === 0 ? (
                <Alert severity="info">
                  No appointments scheduled for this day.
                </Alert>
              ) : (
                <List sx={{ p: 0 }}>
                  {appointments.map((apt, index) => (
                    <Paper key={apt.id} sx={{ mb: 1, overflow: 'hidden' }}>
                      <ListItem
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          p: 2,
                        }}
                      >
                        {/* Time and Status */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccessTime fontSize="small" color="action" />
                            <Typography variant="body1" fontWeight="bold">
                              {format(new Date(apt.startTime), 'h:mm a')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ({apt.service.durationMinutes} min)
                            </Typography>
                          </Box>
                          <Chip
                            label={apt.status}
                            size="small"
                            color={getStatusColor(apt.status)}
                          />
                        </Box>

                        {/* Client Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {apt.client.name.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {apt.client.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {apt.service.name} • ${apt.service.basePrice}
                            </Typography>
                          </Box>
                          <IconButton
                            href={`tel:${apt.client.phone}`}
                            size="small"
                            color="primary"
                          >
                            <Phone />
                          </IconButton>
                        </Box>

                        {/* Action Buttons */}
                        {['BOOKED', 'CONFIRMED'].includes(apt.status) && (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              startIcon={<CheckCircle />}
                              onClick={() => handleStatusUpdate(apt.id, 'COMPLETED')}
                              fullWidth
                            >
                              Complete
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              startIcon={<Cancel />}
                              onClick={() => handleStatusUpdate(apt.id, 'NO_SHOW')}
                            >
                              No-Show
                            </Button>
                          </Box>
                        )}
                      </ListItem>
                    </Paper>
                  ))}
                </List>
              )}

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  startIcon={<Refresh />}
                  onClick={fetchData}
                  variant="outlined"
                >
                  Refresh
                </Button>
              </Box>
            </Box>
          )}

          {/* Tasks Tab */}
          {activeTab === 1 && (
            <Box>
              {tasks.length === 0 ? (
                <Alert severity="info">
                  No pending tasks assigned to you.
                </Alert>
              ) : (
                <List sx={{ p: 0 }}>
                  {tasks.map((task) => (
                    <Paper key={task.id} sx={{ mb: 1 }}>
                      <ListItem
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          p: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {task.title}
                          </Typography>
                          <Chip
                            label={task.status}
                            size="small"
                            color={task.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                          />
                        </Box>
                        {task.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {task.description}
                          </Typography>
                        )}
                        {task.dueDate && (
                          <Typography variant="caption" color="text.secondary">
                            Due: {format(new Date(task.dueDate), 'MMM d, h:mm a')}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          {task.status === 'OPEN' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleTaskStatusUpdate(task.id, 'IN_PROGRESS')}
                            >
                              Start
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleTaskStatusUpdate(task.id, 'DONE')}
                          >
                            Complete
                          </Button>
                        </Box>
                      </ListItem>
                    </Paper>
                  ))}
                </List>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
