'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  Spa as SpaIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { format, addDays, parseISO } from 'date-fns';

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  basePrice: number;
}

interface Technician {
  id: string;
  name: string;
}

interface TimeSlot {
  time: string;
  technicianId: string;
  technicianName: string;
}

const steps = ['Select Service', 'Choose Date & Time', 'Your Information', 'Confirmation'];

export default function PublicBookingPage() {
  const params = useParams();
  const salonId = params.salonId as string;

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Service selection
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Step 2: Date & Time selection
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Step 3: Client information
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Step 4: Confirmation
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    serviceName: string;
    technicianName: string;
    startTime: string;
  } | null>(null);

  // Fetch services on mount
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`/api/public/booking/services?salonId=${salonId}`);
        const data = await res.json();
        setServices(data.services || []);
      } catch {
        setError('Failed to load services');
      }
    };
    fetchServices();
  }, [salonId]);

  // Fetch technicians when service is selected
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const res = await fetch(`/api/public/booking/technicians?salonId=${salonId}`);
        const data = await res.json();
        setTechnicians(data.technicians || []);
      } catch {
        setError('Failed to load technicians');
      }
    };
    if (selectedService) {
      fetchTechnicians();
    }
  }, [salonId, selectedService]);

  // Fetch availability when date/technician changes
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedService || !selectedDate) return;

      setLoading(true);
      try {
        let url = `/api/public/booking/availability?salonId=${salonId}&serviceId=${selectedService.id}&date=${selectedDate}`;
        if (selectedTechnician) {
          url += `&technicianId=${selectedTechnician}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        setAvailableSlots(data.slots || []);
        setSelectedSlot(null);
      } catch {
        setError('Failed to load availability');
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [salonId, selectedService, selectedDate, selectedTechnician]);

  // Generate date options (next 14 days)
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE, MMM d'),
    };
  });

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setActiveStep(1);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setActiveStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedSlot) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/public/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          serviceId: selectedService.id,
          technicianId: selectedSlot.technicianId,
          date: selectedDate,
          time: selectedSlot.time,
          clientName,
          clientPhone,
          clientEmail,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Booking failed');
      }

      setBookingResult(data.appointment);
      setActiveStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select a Service
            </Typography>
            <Grid container spacing={2}>
              {services.map((service) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: selectedService?.id === service.id ? 2 : 0,
                      borderColor: 'primary.main',
                      '&:hover': { boxShadow: 4 },
                    }}
                    onClick={() => handleServiceSelect(service)}
                  >
                    <CardContent>
                      <Typography variant="h6">{service.name}</Typography>
                      {service.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {service.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Chip
                          icon={<TimeIcon />}
                          label={`${service.durationMinutes} min`}
                          size="small"
                        />
                        <Typography variant="h6" color="primary">
                          ${service.basePrice}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Date & Time
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
                <Typography variant="subtitle1">
                  <SpaIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {selectedService?.name} - ${selectedService?.basePrice}
                </Typography>
              </Paper>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Preferred Technician (Optional)</InputLabel>
                  <Select
                    value={selectedTechnician}
                    label="Preferred Technician (Optional)"
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                  >
                    <MenuItem value="">Any Available</MenuItem>
                    {technicians.map((tech) => (
                      <MenuItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Select Date</InputLabel>
                  <Select
                    value={selectedDate}
                    label="Select Date"
                    onChange={(e) => setSelectedDate(e.target.value)}
                  >
                    {dateOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : selectedDate ? (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Available Times
                    </Typography>
                    {availableSlots.length === 0 ? (
                      <Alert severity="info">No available times for this date</Alert>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {availableSlots.map((slot, index) => (
                          <Chip
                            key={index}
                            label={`${slot.time} - ${slot.technicianName}`}
                            onClick={() => handleSlotSelect(slot)}
                            color={selectedSlot?.time === slot.time && selectedSlot?.technicianId === slot.technicianId ? 'primary' : 'default'}
                            variant={selectedSlot?.time === slot.time && selectedSlot?.technicianId === slot.technicianId ? 'filled' : 'outlined'}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Alert severity="info">Please select a date</Alert>
                )}
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Your Information
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
                <Typography variant="body2">
                  <SpaIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {selectedService?.name} - ${selectedService?.basePrice}
                </Typography>
                <Typography variant="body2">
                  <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {selectedDate && format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')} at {selectedSlot?.time}
                </Typography>
                <Typography variant="body2">
                  <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {selectedSlot?.technicianName}
                </Typography>
              </Paper>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Your Name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Phone Number"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Email (Optional)"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or notes..."
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleSubmit}
                disabled={loading || !clientName || !clientPhone}
              >
                {loading ? <CircularProgress size={24} /> : 'Confirm Booking'}
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Booking Confirmed!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Your appointment has been successfully booked.
            </Typography>

            {bookingResult && (
              <Paper sx={{ p: 3, maxWidth: 400, mx: 'auto', bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  Appointment Details
                </Typography>
                <Typography>
                  <strong>Service:</strong> {bookingResult.serviceName}
                </Typography>
                <Typography>
                  <strong>Technician:</strong> {bookingResult.technicianName}
                </Typography>
                <Typography>
                  <strong>Date & Time:</strong>{' '}
                  {format(new Date(bookingResult.startTime), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                </Typography>
              </Paper>
            )}

            <Button
              variant="contained"
              sx={{ mt: 4 }}
              onClick={() => {
                setActiveStep(0);
                setSelectedService(null);
                setSelectedSlot(null);
                setClientName('');
                setClientPhone('');
                setClientEmail('');
                setNotes('');
                setBookingResult(null);
              }}
            >
              Book Another Appointment
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fce4ec 0%, #f3e5f5 50%, #e8eaf6 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <SpaIcon sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
            Book Your Appointment
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Schedule your next nail service online
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper sx={{ p: 4 }}>{renderStepContent()}</Paper>
      </Container>
    </Box>
  );
}
