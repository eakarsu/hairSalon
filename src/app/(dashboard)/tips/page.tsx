'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
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
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  InputAdornment,
  Autocomplete,
  LinearProgress,
  Drawer,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  MonetizationOn as TipIcon,
  CreditCard as CardIcon,
  Money as CashIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

interface Technician {
  id: string;
  name: string;
}

interface Tip {
  id: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'GIFT_CARD' | 'OTHER';
  createdAt: string;
  technician: Technician;
  appointment: {
    id: string;
    startTime: string;
    service: { name: string };
    client: { name: string };
  };
}

interface TipSummary {
  total: number;
  cash: number;
  card: number;
  count: number;
  byTechnician: Array<{
    name: string;
    total: number;
    count: number;
    cash: number;
    card: number;
  }>;
}

interface Appointment {
  id: string;
  startTime: string;
  status: string;
  serviceName?: string;
  clientName?: string;
  technicianId?: string;
  technicianName?: string;
  service?: { name: string };
  client?: { name: string };
  technician?: { id: string; name: string };
}

export default function TipsPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [summary, setSummary] = useState<TipSummary | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [period, setPeriod] = useState('today');
  const [filterTech, setFilterTech] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    appointmentId: '',
    technicianId: '',
    amount: '',
    method: 'CASH' as 'CASH' | 'CARD' | 'GIFT_CARD' | 'OTHER',
  });

  // Detail drawer state
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    method: 'CASH' as 'CASH' | 'CARD' | 'GIFT_CARD' | 'OTHER',
  });

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchData();
  }, [period, filterTech]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/tips?period=${period}`;
      if (filterTech) url += `&technicianId=${filterTech}`;

      const [tipsRes, techRes, appointmentsRes] = await Promise.all([
        fetch(url),
        fetch('/api/staff/technicians'),
        fetch('/api/appointments?status=COMPLETED'),
      ]);

      const tipsData = await tipsRes.json();
      const techData = await techRes.json();
      const appointmentsData = await appointmentsRes.json();

      setTips(tipsData.tips || []);
      setSummary(tipsData.summary || null);
      setTechnicians(techData.technicians || []);
      setTodayAppointments(appointmentsData.appointments || []);
    } catch {
      setError('Failed to load tips');
      showError('Failed to load tips');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTip = async () => {
    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add tip');
      }

      setDialogOpen(false);
      setFormData({ appointmentId: '', technicianId: '', amount: '', method: 'CASH' });
      showSuccess('Tip recorded successfully');
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add tip';
      setError(message);
      showError(message);
    }
  };

  const handleRowClick = (tip: Tip) => {
    setSelectedTip(tip);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedTip(null);
  };

  const handleEditOpen = () => {
    if (!selectedTip) return;
    setEditFormData({
      amount: selectedTip.amount.toString(),
      method: selectedTip.method,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedTip) return;
    try {
      const res = await fetch(`/api/tips`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTip.id,
          amount: parseFloat(editFormData.amount),
          method: editFormData.method,
        }),
      });

      if (!res.ok) throw new Error('Failed to update tip');

      setEditDialogOpen(false);
      setDrawerOpen(false);
      setSelectedTip(null);
      showSuccess('Tip updated successfully');
      fetchData();
    } catch {
      showError('Failed to update tip');
    }
  };

  const handleDeleteClick = () => {
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTip) return;
    setConfirmLoading(true);
    try {
      const res = await fetch(`/api/tips?id=${selectedTip.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete tip');

      setConfirmOpen(false);
      setDrawerOpen(false);
      setSelectedTip(null);
      showSuccess('Tip deleted successfully');
      fetchData();
    } catch {
      showError('Failed to delete tip');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleAppointmentSelect = (appointment: Appointment | null) => {
    if (appointment) {
      setFormData((prev) => ({
        ...prev,
        appointmentId: appointment.id,
        technicianId: appointment.technicianId || appointment.technician?.id || '',
      }));
    }
  };

  const getAppointmentLabel = (option: Appointment) => {
    const clientName = option.clientName || option.client?.name || 'Unknown Client';
    const serviceName = option.serviceName || option.service?.name || 'Unknown Service';
    const time = format(new Date(option.startTime), 'h:mm a');
    return `${clientName} - ${serviceName} (${time})`;
  };

  // Get appointments that don't have tips yet
  const appointmentsWithoutTips = todayAppointments.filter(
    (apt) => !tips.some((tip) => tip.appointment?.id === apt.id)
  );

  const maxTechTotal = summary?.byTechnician?.[0]?.total || 1;

  if (loading && !summary) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Tips Tracking</Typography>
        </Box>
        <CardsSkeleton count={4} />
        <Box sx={{ mt: 3 }}>
          <TableSkeleton rows={5} columns={5} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tips Tracking</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Record Tip
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Period Toggle */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, v) => v && setPeriod(v)}
          size="small"
        >
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="week">This Week</ToggleButton>
          <ToggleButton value="month">This Month</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Technician</InputLabel>
          <Select
            value={filterTech}
            label="Technician"
            onChange={(e) => setFilterTech(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {technicians.map((tech) => (
              <MenuItem key={tech.id} value={tech.id}>
                {tech.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'success.50' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Tips
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      ${summary.total.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {summary.count} tips
                    </Typography>
                  </Box>
                  <TipIcon sx={{ fontSize: 48, color: 'success.light' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Cash Tips
                    </Typography>
                    <Typography variant="h4">${summary.cash.toFixed(2)}</Typography>
                  </Box>
                  <CashIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Card Tips
                    </Typography>
                    <Typography variant="h4">${summary.card.toFixed(2)}</Typography>
                  </Box>
                  <CardIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Average Tip
                </Typography>
                <Typography variant="h4">
                  ${summary.count > 0 ? (summary.total / summary.count).toFixed(2) : '0.00'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* Tips by Technician */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tips by Technician
              </Typography>
              {summary?.byTechnician?.length === 0 ? (
                <Typography color="text.secondary">No tips recorded</Typography>
              ) : (
                <Box>
                  {summary?.byTechnician?.map((tech) => (
                    <Box key={tech.name} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {tech.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip
                            size="small"
                            label={`${tech.count} tips`}
                            variant="outlined"
                          />
                          <Typography variant="body2" fontWeight="bold">
                            ${tech.total.toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(tech.total / maxTechTotal) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                      <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Cash: ${tech.cash.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Card: ${tech.card.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Tips */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Tips
              </Typography>
              {tips.length === 0 ? (
                <Typography color="text.secondary">No tips recorded</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Technician</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Method</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tips.slice(0, 10).map((tip) => (
                        <TableRow
                          key={tip.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => handleRowClick(tip)}
                        >
                          <TableCell>
                            {format(new Date(tip.createdAt), 'h:mm a')}
                          </TableCell>
                          <TableCell>{tip.technician?.name || 'Unknown'}</TableCell>
                          <TableCell>{tip.appointment?.client?.name || 'Unknown'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            ${tip.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={tip.method}
                              color={tip.method === 'CASH' ? 'success' : 'primary'}
                              variant="outlined"
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

      {/* Add Tip Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Tip</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 2, mb: 2 }}
            options={appointmentsWithoutTips}
            getOptionLabel={getAppointmentLabel}
            onChange={(_, value) => handleAppointmentSelect(value)}
            renderInput={(params) => (
              <TextField {...params} label="Select Appointment" required />
            )}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Technician</InputLabel>
            <Select
              value={formData.technicianId}
              label="Technician"
              onChange={(e) => setFormData((prev) => ({ ...prev, technicianId: e.target.value }))}
              required
            >
              {technicians.map((tech) => (
                <MenuItem key={tech.id} value={tech.id}>
                  {tech.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            required
            type="number"
            label="Tip Amount"
            value={formData.amount}
            onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />

          <FormControl fullWidth>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={formData.method}
              label="Payment Method"
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  method: e.target.value as 'CASH' | 'CARD' | 'GIFT_CARD' | 'OTHER',
                }))
              }
            >
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="CARD">Card</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddTip}
            disabled={!formData.appointmentId || !formData.technicianId || !formData.amount}
          >
            Record Tip
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{ sx: { width: 400 } }}
      >
        {selectedTip && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Tip Details</Typography>
              <IconButton onClick={handleCloseDrawer}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Tip ID</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedTip.id}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Amount</Typography>
                <Typography variant="h5" fontWeight={600} color="success.main">
                  ${selectedTip.amount.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Payment Method</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={selectedTip.method}
                    color={selectedTip.method === 'CASH' ? 'success' : 'primary'}
                    size="small"
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Technician</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {selectedTip.technician?.name || 'Unknown'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Client</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {selectedTip.appointment?.client?.name || 'Unknown'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Service</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {selectedTip.appointment?.service?.name || 'Unknown'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Appointment ID</Typography>
                <Typography variant="body2">{selectedTip.appointment?.id || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Date</Typography>
                <Typography variant="body2">
                  {format(new Date(selectedTip.createdAt), 'MMM d, yyyy h:mm a')}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditOpen}
                fullWidth
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteClick}
                fullWidth
              >
                Delete
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Edit Tip Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Tip</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            required
            type="number"
            label="Tip Amount"
            value={editFormData.amount}
            onChange={(e) => setEditFormData((prev) => ({ ...prev, amount: e.target.value }))}
            sx={{ mt: 2, mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
          <FormControl fullWidth>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={editFormData.method}
              label="Payment Method"
              onChange={(e) =>
                setEditFormData((prev) => ({
                  ...prev,
                  method: e.target.value as 'CASH' | 'CARD' | 'GIFT_CARD' | 'OTHER',
                }))
              }
            >
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="CARD">Card</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={!editFormData.amount}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Tip"
        message={`Are you sure you want to delete this $${selectedTip?.amount.toFixed(2)} tip? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={confirmLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
}
