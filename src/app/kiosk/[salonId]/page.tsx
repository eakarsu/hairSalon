'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Spa as SpaIcon,
  CheckCircle as CheckCircleIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface Service {
  id: string;
  name: string;
}

interface Technician {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  serviceName: string;
  technicianName: string;
  startTime: string;
  status: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

type Mode = 'home' | 'checkin' | 'walkin' | 'success';

export default function KioskPage() {
  const params = useParams();
  const salonId = params.salonId as string;

  const [mode, setMode] = useState<Mode>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check-in state
  const [phone, setPhone] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Walk-in state
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinService, setWalkinService] = useState('');
  const [walkinTech, setWalkinTech] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Success state
  const [successMessage, setSuccessMessage] = useState('');
  const [successDetails, setSuccessDetails] = useState<string[]>([]);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Fetch services and technicians for walk-ins
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, techRes] = await Promise.all([
          fetch(`/api/public/booking/services?salonId=${salonId}`),
          fetch(`/api/public/booking/technicians?salonId=${salonId}`),
        ]);
        const servicesData = await servicesRes.json();
        const techData = await techRes.json();
        setServices(servicesData.services || []);
        setTechnicians(techData.technicians || []);
      } catch {
        console.error('Failed to fetch data');
      }
    };
    fetchData();
  }, [salonId]);

  // Reset after timeout
  useEffect(() => {
    if (mode === 'success') {
      const timer = setTimeout(() => {
        resetState();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  const resetState = () => {
    setMode('home');
    setPhone('');
    setClient(null);
    setAppointments([]);
    setWalkinName('');
    setWalkinPhone('');
    setWalkinService('');
    setWalkinTech('');
    setError('');
    setSuccessMessage('');
    setSuccessDetails([]);
  };

  const handlePhoneSearch = async () => {
    if (phone.length < 4) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/kiosk/check-in?salonId=${salonId}&phone=${encodeURIComponent(phone)}`);
      const data = await res.json();

      if (data.client) {
        setClient(data.client);
        setAppointments(data.appointments);
        if (data.appointments.length === 0) {
          setError('No appointments found for today. Would you like to join the walk-in list?');
        }
      } else {
        setError('Phone number not found. Would you like to register as a walk-in?');
      }
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedAppointment) return;

    setLoading(true);
    try {
      const res = await fetch('/api/kiosk/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: selectedAppointment.id }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage('Check-in Successful!');
        setSuccessDetails([
          `Welcome, ${data.appointment.clientName}!`,
          `Service: ${data.appointment.serviceName}`,
          `Technician: ${data.appointment.technicianName}`,
          `Time: ${format(new Date(data.appointment.startTime), 'h:mm a')}`,
        ]);
        setMode('success');
      }
    } catch {
      setError('Check-in failed. Please ask for assistance.');
    } finally {
      setLoading(false);
      setConfirmDialog(false);
    }
  };

  const handleWalkIn = async () => {
    if (!walkinName || !walkinPhone) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/kiosk/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          clientName: walkinName,
          clientPhone: walkinPhone,
          serviceId: walkinService || null,
          preferredTech: walkinTech || null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage('You\'re on the List!');
        setSuccessDetails([
          `Thank you, ${walkinName}!`,
          `Position: #${data.waitlist.position}`,
          `Estimated wait: ~${data.waitlist.estimatedWait} minutes`,
          'We\'ll call your name when ready.',
        ]);
        setMode('success');
      }
    } catch {
      setError('Registration failed. Please ask for assistance.');
    } finally {
      setLoading(false);
    }
  };

  const numpadClick = (value: string) => {
    if (value === 'clear') {
      setPhone('');
    } else if (value === 'back') {
      setPhone((prev) => prev.slice(0, -1));
    } else if (phone.length < 10) {
      setPhone((prev) => prev + value);
    }
  };

  // Home Screen
  if (mode === 'home') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <SpaIcon sx={{ fontSize: 100, color: 'white', mb: 2 }} />
        <Typography variant="h2" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
          Welcome!
        </Typography>
        <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.9)', mb: 6 }}>
          How can we help you today?
        </Typography>

        <Grid container spacing={4} sx={{ maxWidth: 800 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { transform: 'scale(1.02)', boxShadow: 8 },
                transition: 'all 0.2s',
              }}
              onClick={() => setMode('checkin')}
            >
              <CheckCircleIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                I Have an Appointment
              </Typography>
              <Typography color="text.secondary">
                Check in for your scheduled service
              </Typography>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { transform: 'scale(1.02)', boxShadow: 8 },
                transition: 'all 0.2s',
              }}
              onClick={() => setMode('walkin')}
            >
              <PersonAddIcon sx={{ fontSize: 80, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                Walk-In
              </Typography>
              <Typography color="text.secondary">
                Join the waitlist for available service
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Check-in Screen
  if (mode === 'checkin') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%)',
          p: 4,
        }}
      >
        <Button onClick={resetState} sx={{ mb: 2 }}>
          ← Back
        </Button>

        <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
          <Typography variant="h3" sx={{ mb: 4, color: 'primary.main' }}>
            Enter Your Phone Number
          </Typography>

          {error && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {error}
              <Button size="small" onClick={() => setMode('walkin')} sx={{ ml: 2 }}>
                Register as Walk-in
              </Button>
            </Alert>
          )}

          <TextField
            fullWidth
            value={phone}
            placeholder="Phone Number"
            InputProps={{
              readOnly: true,
              sx: { fontSize: 32, textAlign: 'center' },
            }}
            sx={{ mb: 3 }}
          />

          {/* Numpad */}
          <Grid container spacing={1} sx={{ maxWidth: 300, mx: 'auto', mb: 3 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((key) => (
              <Grid size={{ xs: 4 }} key={key}>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ py: 2, fontSize: 24 }}
                  color={key === 'clear' || key === 'back' ? 'secondary' : 'primary'}
                  onClick={() => numpadClick(key)}
                >
                  {key === 'back' ? '⌫' : key === 'clear' ? 'C' : key}
                </Button>
              </Grid>
            ))}
          </Grid>

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
            onClick={handlePhoneSearch}
            disabled={phone.length < 4 || loading}
            sx={{ py: 2, fontSize: 20 }}
          >
            Search
          </Button>

          {/* Appointments List */}
          {appointments.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" gutterBottom>
                Your Appointments Today
              </Typography>
              {appointments.map((apt) => (
                <Card
                  key={apt.id}
                  sx={{ mb: 2, cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
                  onClick={() => {
                    setSelectedAppointment(apt);
                    setConfirmDialog(true);
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6">{apt.serviceName}</Typography>
                        <Typography color="text.secondary">
                          with {apt.technicianName} at {format(new Date(apt.startTime), 'h:mm a')}
                        </Typography>
                      </Box>
                      <Chip
                        label={apt.status === 'CONFIRMED' ? 'Checked In' : 'Tap to Check In'}
                        color={apt.status === 'CONFIRMED' ? 'success' : 'primary'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
          <DialogTitle>Confirm Check-In</DialogTitle>
          <DialogContent>
            {selectedAppointment && (
              <Typography>
                Check in for {selectedAppointment.serviceName} with {selectedAppointment.technicianName}?
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCheckIn} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Confirm'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Walk-in Screen
  if (mode === 'walkin') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%)',
          p: 4,
        }}
      >
        <Button onClick={resetState} sx={{ mb: 2 }}>
          ← Back
        </Button>

        <Box sx={{ maxWidth: 500, mx: 'auto' }}>
          <Typography variant="h3" sx={{ mb: 4, textAlign: 'center', color: 'primary.main' }}>
            Walk-In Registration
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Card sx={{ p: 3 }}>
            <TextField
              fullWidth
              label="Your Name"
              value={walkinName}
              onChange={(e) => setWalkinName(e.target.value)}
              sx={{ mb: 3 }}
              required
            />

            <TextField
              fullWidth
              label="Phone Number"
              value={walkinPhone}
              onChange={(e) => setWalkinPhone(e.target.value)}
              sx={{ mb: 3 }}
              required
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Service (Optional)</InputLabel>
              <Select
                value={walkinService}
                label="Service (Optional)"
                onChange={(e) => setWalkinService(e.target.value)}
              >
                <MenuItem value="">Not sure yet</MenuItem>
                {services.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Preferred Technician (Optional)</InputLabel>
              <Select
                value={walkinTech}
                label="Preferred Technician (Optional)"
                onChange={(e) => setWalkinTech(e.target.value)}
              >
                <MenuItem value="">No preference</MenuItem>
                {technicians.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleWalkIn}
              disabled={!walkinName || !walkinPhone || loading}
              sx={{ py: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Join Waitlist'}
            </Button>
          </Card>
        </Box>
      </Box>
    );
  }

  // Success Screen
  if (mode === 'success') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 150, color: 'white', mb: 3 }} />
        <Typography variant="h2" sx={{ color: 'white', fontWeight: 700, mb: 3 }}>
          {successMessage}
        </Typography>
        {successDetails.map((detail, index) => (
          <Typography key={index} variant="h5" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1 }}>
            {detail}
          </Typography>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 4 }}>
          <TimeIcon sx={{ color: 'white', mr: 1 }} />
          <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Returning to home screen...
          </Typography>
        </Box>
      </Box>
    );
  }

  return null;
}
