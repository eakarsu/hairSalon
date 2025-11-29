'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
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
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Notifications as NotifyIcon,
  Chair as SeatIcon,
  Close as CancelIcon,
  AccessTime as TimeIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';

type WaitlistStatus = 'WAITING' | 'NOTIFIED' | 'SEATED' | 'LEFT' | 'CANCELLED';

interface WaitlistEntry {
  id: string;
  clientName: string;
  clientPhone: string;
  partySize: number;
  serviceId: string | null;
  preferredTech: string | null;
  notes: string | null;
  status: WaitlistStatus;
  estimatedWait: number | null;
  notifiedAt: string | null;
  seatedAt: string | null;
  createdAt: string;
  client: { id: string; name: string; phone: string } | null;
}

interface Service {
  id: string;
  name: string;
}

interface Technician {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<WaitlistStatus, { color: 'warning' | 'info' | 'success' | 'default' | 'error'; label: string }> = {
  WAITING: { color: 'warning', label: 'Waiting' },
  NOTIFIED: { color: 'info', label: 'Notified' },
  SEATED: { color: 'success', label: 'Seated' },
  LEFT: { color: 'default', label: 'Left' },
  CANCELLED: { color: 'error', label: 'Cancelled' },
};

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    partySize: 1,
    serviceId: '',
    preferredTech: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [waitlistRes, servicesRes, techRes] = await Promise.all([
        fetch('/api/waitlist?today=true'),
        fetch('/api/services'),
        fetch('/api/staff/technicians'),
      ]);

      const waitlistData = await waitlistRes.json();
      const servicesData = await servicesRes.json();
      const techData = await techRes.json();

      setEntries(waitlistData.entries || []);
      setServices(servicesData.services || []);
      setTechnicians(techData.technicians || []);
    } catch {
      setError('Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to add');

      setDialogOpen(false);
      setFormData({
        clientName: '',
        clientPhone: '',
        partySize: 1,
        serviceId: '',
        preferredTech: '',
        notes: '',
      });
      fetchData();
    } catch {
      setError('Failed to add to waitlist');
    }
  };

  const handleStatusChange = async (id: string, status: WaitlistStatus) => {
    try {
      await fetch(`/api/waitlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch {
      setError('Failed to update status');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await fetch(`/api/waitlist/${id}`, { method: 'DELETE' });
      fetchData();
    } catch {
      setError('Failed to remove');
    }
  };

  const waitingEntries = entries.filter((e) => e.status === 'WAITING');
  const notifiedEntries = entries.filter((e) => e.status === 'NOTIFIED');
  const completedEntries = entries.filter((e) => ['SEATED', 'LEFT', 'CANCELLED'].includes(e.status));

  const WaitlistCard = ({ entry, position }: { entry: WaitlistEntry; position?: number }) => (
    <Card
      sx={{
        mb: 2,
        borderLeft: 4,
        borderColor: `${STATUS_CONFIG[entry.status].color}.main`,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {position && (
                <Chip
                  size="small"
                  label={`#${position}`}
                  color="primary"
                  sx={{ fontWeight: 'bold' }}
                />
              )}
              <Typography variant="h6">{entry.clientName}</Typography>
              <Chip
                size="small"
                label={STATUS_CONFIG[entry.status].label}
                color={STATUS_CONFIG[entry.status].color}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneIcon fontSize="small" />
                <Typography variant="body2">{entry.clientPhone}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimeIcon fontSize="small" />
                <Typography variant="body2">
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </Typography>
              </Box>
              {entry.partySize > 1 && (
                <Typography variant="body2">Party of {entry.partySize}</Typography>
              )}
            </Box>

            {entry.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Note: {entry.notes}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {entry.status === 'WAITING' && (
              <>
                <IconButton
                  color="info"
                  onClick={() => handleStatusChange(entry.id, 'NOTIFIED')}
                  title="Notify client"
                >
                  <NotifyIcon />
                </IconButton>
                <IconButton
                  color="success"
                  onClick={() => handleStatusChange(entry.id, 'SEATED')}
                  title="Seat client"
                >
                  <SeatIcon />
                </IconButton>
              </>
            )}
            {entry.status === 'NOTIFIED' && (
              <IconButton
                color="success"
                onClick={() => handleStatusChange(entry.id, 'SEATED')}
                title="Seat client"
              >
                <SeatIcon />
              </IconButton>
            )}
            <IconButton
              color="error"
              onClick={() => handleRemove(entry.id)}
              title="Remove"
            >
              <CancelIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Waitlist</Typography>
          <Typography variant="body2" color="text.secondary">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add to Waitlist
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}>
            <Typography variant="h3" color="warning.main">
              {waitingEntries.length}
            </Typography>
            <Typography color="text.secondary">Waiting</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50' }}>
            <Typography variant="h3" color="info.main">
              {notifiedEntries.length}
            </Typography>
            <Typography color="text.secondary">Notified</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}>
            <Typography variant="h3" color="success.main">
              {completedEntries.filter((e) => e.status === 'SEATED').length}
            </Typography>
            <Typography color="text.secondary">Seated Today</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Waiting Queue */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon color="warning" />
            Waiting ({waitingEntries.length})
          </Typography>
          {waitingEntries.length === 0 ? (
            <Card sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No one waiting</Typography>
            </Card>
          ) : (
            waitingEntries.map((entry, index) => (
              <WaitlistCard key={entry.id} entry={entry} position={index + 1} />
            ))
          )}

          {notifiedEntries.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotifyIcon color="info" />
                Notified ({notifiedEntries.length})
              </Typography>
              {notifiedEntries.map((entry) => (
                <WaitlistCard key={entry.id} entry={entry} />
              ))}
            </>
          )}
        </Grid>

        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          {completedEntries.length === 0 ? (
            <Card sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No activity yet today</Typography>
            </Card>
          ) : (
            completedEntries.slice(0, 10).map((entry) => (
              <WaitlistCard key={entry.id} entry={entry} />
            ))
          )}
        </Grid>
      </Grid>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add to Waitlist</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                required
                label="Client Name"
                value={formData.clientName}
                onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Party Size"
                value={formData.partySize}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, partySize: parseInt(e.target.value) || 1 }))
                }
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                required
                label="Phone Number"
                value={formData.clientPhone}
                onChange={(e) => setFormData((prev) => ({ ...prev, clientPhone: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Service (Optional)</InputLabel>
                <Select
                  value={formData.serviceId}
                  label="Service (Optional)"
                  onChange={(e) => setFormData((prev) => ({ ...prev, serviceId: e.target.value }))}
                >
                  <MenuItem value="">Not specified</MenuItem>
                  {services.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Preferred Technician</InputLabel>
                <Select
                  value={formData.preferredTech}
                  label="Preferred Technician"
                  onChange={(e) => setFormData((prev) => ({ ...prev, preferredTech: e.target.value }))}
                >
                  <MenuItem value="">No preference</MenuItem>
                  {technicians.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!formData.clientName || !formData.clientPhone}
          >
            Add to Waitlist
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
