'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Add,
  Today,
  ViewWeek,
  ViewDay,
  Send,
  AutoAwesome,
} from '@mui/icons-material';
import { format, addDays, startOfWeek, isSameDay, setHours, setMinutes } from 'date-fns';

interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientLanguage: string;
  technicianId: string;
  technicianName: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  notes: string | null;
}

interface Technician {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
}

const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  BOOKED: 'primary',
  CONFIRMED: 'success',
  COMPLETED: 'default',
  NO_SHOW: 'error',
  CANCELLED: 'warning',
};

const timeSlots = Array.from({ length: 20 }, (_, i) => {
  const hour = 9 + Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [reminderText, setReminderText] = useState('');
  const [generatingReminder, setGeneratingReminder] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    technicianId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apptRes, techRes, clientsRes, servicesRes] = await Promise.all([
        fetch(`/api/appointments?date=${selectedDate.toISOString()}`),
        fetch('/api/staff/technicians'),
        fetch('/api/clients'),
        fetch('/api/services'),
      ]);

      if (apptRes.ok) {
        const data = await apptRes.json();
        setAppointments(data.appointments || []);
      }

      if (techRes.ok) {
        const data = await techRes.json();
        setTechnicians(data.technicians || []);
      }

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.clients || []);
      }

      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((appt) =>
      isSameDay(new Date(appt.startTime), date)
    );
  };

  const handleGenerateReminder = async () => {
    if (!selectedAppointment) return;

    setGeneratingReminder(true);
    setReminderSuccess('');
    try {
      const response = await fetch('/api/ai/multilang-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: selectedAppointment.clientName,
          serviceName: selectedAppointment.serviceName,
          dateTime: format(new Date(selectedAppointment.startTime), 'MMMM d, yyyy at h:mm a'),
          language: selectedAppointment.clientLanguage || 'en',
          clientId: selectedAppointment.clientId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReminderText(data.reminder);
      } else {
        // If AI fails, use a default reminder
        setReminderText(`Hi ${selectedAppointment.clientName}, this is a reminder for your ${selectedAppointment.serviceName} appointment on ${format(new Date(selectedAppointment.startTime), 'MMMM d at h:mm a')}. See you soon!`);
      }
    } catch (error) {
      console.error('Failed to generate reminder:', error);
      // Use default reminder on error
      setReminderText(`Hi ${selectedAppointment.clientName}, this is a reminder for your ${selectedAppointment.serviceName} appointment on ${format(new Date(selectedAppointment.startTime), 'MMMM d at h:mm a')}. See you soon!`);
    } finally {
      setGeneratingReminder(false);
    }
  };

  const handleSendSMS = async () => {
    if (!selectedAppointment || !reminderText) return;

    setSendingReminder(true);
    setReminderSuccess('');
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedAppointment.clientPhone,
          message: reminderText,
          type: 'REMINDER',
        }),
      });

      if (response.ok) {
        setReminderSuccess('Reminder sent successfully!');
        setTimeout(() => {
          setReminderDialogOpen(false);
          setReminderText('');
          setReminderSuccess('');
        }, 2000);
      } else {
        const data = await response.json();
        setReminderSuccess(`Failed: ${data.error || 'Could not send SMS'}`);
      }
    } catch (error) {
      console.error('Failed to send reminder:', error);
      setReminderSuccess('Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!formData.clientId || !formData.serviceId || !formData.technicianId) return;

    setSaving(true);
    try {
      const startTime = new Date(`${formData.date}T${formData.time}`);
      const service = services.find(s => s.id === formData.serviceId);
      const duration = service?.durationMinutes || 60;

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formData.clientId,
          serviceId: formData.serviceId,
          technicianId: formData.technicianId,
          startTime: startTime.toISOString(),
          duration,
          notes: formData.notes || null,
          source: 'WALKIN',
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setFormData({
          clientId: '',
          serviceId: '',
          technicianId: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          time: '10:00',
          notes: '',
        });
        fetchData();
      } else {
        const data = await response.json();
        console.error('Failed to create appointment:', data.error);
      }
    } catch (error) {
      console.error('Failed to create appointment:', error);
    } finally {
      setSaving(false);
    }
  };

  const navigateDate = (direction: number) => {
    setSelectedDate((prev) =>
      addDays(prev, viewMode === 'week' ? direction * 7 : direction)
    );
  };

  // Use real data from database
  const displayAppointments = appointments;
  const displayTechnicians = technicians;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Calendar
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
          >
            <ToggleButton value="day">
              <ViewDay sx={{ mr: 1 }} /> Day
            </ToggleButton>
            <ToggleButton value="week">
              <ViewWeek sx={{ mr: 1 }} /> Week
            </ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            New Appointment
          </Button>
        </Box>
      </Box>

      {/* Date Navigation */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton onClick={() => navigateDate(-1)}>
            <ChevronLeft />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              {viewMode === 'week'
                ? `${format(getWeekDays()[0], 'MMM d')} - ${format(getWeekDays()[6], 'MMM d, yyyy')}`
                : format(selectedDate, 'MMMM d, yyyy')}
            </Typography>
            <Button
              size="small"
              startIcon={<Today />}
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
          </Box>
          <IconButton onClick={() => navigateDate(1)}>
            <ChevronRight />
          </IconButton>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'week' ? (
        /* Week View */
        <Grid container spacing={1}>
          {getWeekDays().map((day) => {
            const dayAppointments = displayAppointments.filter((a) =>
              isSameDay(new Date(a.startTime), day)
            );
            const isToday = isSameDay(day, new Date());

            return (
              <Grid size={{ xs: 12, md: 12 / 7 }} key={day.toISOString()}>
                <Paper
                  sx={{
                    p: 1,
                    minHeight: 400,
                    bgcolor: isToday ? 'primary.light' : 'background.paper',
                    borderTop: isToday ? 3 : 0,
                    borderColor: 'primary.main',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    align="center"
                    color={isToday ? 'primary.contrastText' : 'text.primary'}
                    fontWeight={isToday ? 700 : 500}
                  >
                    {format(day, 'EEE')}
                  </Typography>
                  <Typography
                    variant="h6"
                    align="center"
                    color={isToday ? 'primary.contrastText' : 'text.primary'}
                    sx={{ mb: 1 }}
                  >
                    {format(day, 'd')}
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {dayAppointments.map((appt) => (
                      <Card
                        key={appt.id}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { boxShadow: 3 },
                        }}
                        onClick={() => {
                          setSelectedAppointment(appt);
                          setReminderDialogOpen(true);
                        }}
                      >
                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                          <Typography variant="caption" fontWeight={600}>
                            {format(new Date(appt.startTime), 'h:mm a')}
                          </Typography>
                          <Typography variant="body2" noWrap>
                            {appt.clientName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {appt.serviceName}
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={appt.status}
                              size="small"
                              color={statusColors[appt.status]}
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        /* Day View */
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Time
              </Typography>
            </Grid>
            {displayTechnicians.map((tech) => (
              <Grid size={{ xs: 12, md: 10 / displayTechnicians.length }} key={tech.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                    {tech.name.charAt(0)}
                  </Avatar>
                  <Typography variant="subtitle2">{tech.name}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {timeSlots.map((time) => {
            const hour = parseInt(time.split(':')[0]);
            const minutes = parseInt(time.split(':')[1]);
            const slotTime = setMinutes(setHours(selectedDate, hour), minutes);

            return (
              <Grid container spacing={2} key={time} sx={{ borderTop: 1, borderColor: 'divider', py: 1 }}>
                <Grid size={{ xs: 12, md: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {format(slotTime, 'h:mm a')}
                  </Typography>
                </Grid>
                {displayTechnicians.map((tech) => {
                  const appt = displayAppointments.find(
                    (a) =>
                      a.technicianId === tech.id &&
                      isSameDay(new Date(a.startTime), selectedDate) &&
                      new Date(a.startTime) <= slotTime &&
                      new Date(a.endTime) > slotTime
                  );

                  return (
                    <Grid size={{ xs: 12, md: 10 / displayTechnicians.length }} key={tech.id}>
                      {appt ? (
                        <Card
                          sx={{
                            bgcolor: 'primary.light',
                            cursor: 'pointer',
                            '&:hover': { boxShadow: 2 },
                          }}
                          onClick={() => {
                            setSelectedAppointment(appt);
                            setReminderDialogOpen(true);
                          }}
                        >
                          <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                            <Typography variant="body2" fontWeight={500}>
                              {appt.clientName}
                            </Typography>
                            <Typography variant="caption">{appt.serviceName}</Typography>
                          </CardContent>
                        </Card>
                      ) : (
                        <Box sx={{ height: 40 }} />
                      )}
                    </Grid>
                  );
                })}
              </Grid>
            );
          })}
        </Paper>
      )}

      {/* Appointment Details & Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onClose={() => setReminderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Appointment Details
          {selectedAppointment && (
            <Chip
              label={selectedAppointment.status}
              size="small"
              color={statusColors[selectedAppointment.status]}
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <Box sx={{ py: 2 }}>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Client</Typography>
                  <Typography variant="body1">{selectedAppointment.clientName}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{selectedAppointment.clientPhone}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Service</Typography>
                  <Typography variant="body1">{selectedAppointment.serviceName}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Technician</Typography>
                  <Typography variant="body1">{selectedAppointment.technicianName}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Time</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedAppointment.startTime), 'h:mm a')} -{' '}
                    {format(new Date(selectedAppointment.endTime), 'h:mm a')}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary">Language</Typography>
                  <Typography variant="body1">
                    {selectedAppointment.clientLanguage.toUpperCase()}
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  AI-Generated Reminder
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={generatingReminder ? <CircularProgress size={16} /> : <AutoAwesome />}
                  onClick={handleGenerateReminder}
                  disabled={generatingReminder}
                  sx={{ mb: 2 }}
                >
                  Generate Reminder in {selectedAppointment.clientLanguage.toUpperCase()}
                </Button>
                {reminderText && (
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">{reminderText}</Typography>
                  </Paper>
                )}
                {reminderSuccess && (
                  <Typography
                    variant="body2"
                    color={reminderSuccess.includes('Failed') ? 'error' : 'success.main'}
                    sx={{ mt: 2 }}
                  >
                    {reminderSuccess}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setReminderDialogOpen(false);
            setReminderText('');
            setReminderSuccess('');
          }}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={sendingReminder ? <CircularProgress size={16} color="inherit" /> : <Send />}
            disabled={!reminderText || sendingReminder}
            onClick={handleSendSMS}
          >
            {sendingReminder ? 'Sending...' : 'Send Reminder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Appointment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Appointment</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Client</InputLabel>
              <Select
                label="Client"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              >
                <MenuItem value="">Select a client</MenuItem>
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name} ({client.phone})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Service</InputLabel>
              <Select
                label="Service"
                value={formData.serviceId}
                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
              >
                <MenuItem value="">Select a service</MenuItem>
                {services.map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name} ({service.durationMinutes} min - ${service.basePrice})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Technician</InputLabel>
              <Select
                label="Technician"
                value={formData.technicianId}
                onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
              >
                <MenuItem value="">Select a technician</MenuItem>
                {technicians.map((tech) => (
                  <MenuItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Notes"
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateAppointment}
            disabled={saving || !formData.clientId || !formData.serviceId || !formData.technicianId}
          >
            {saving ? <CircularProgress size={20} /> : 'Create Appointment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
