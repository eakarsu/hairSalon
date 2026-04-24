'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Paper,
  Divider,
  Drawer,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Notifications as NotifyIcon,
  Chair as SeatIcon,
  Close as CloseIcon,
  AccessTime as TimeIcon,
  Phone as PhoneIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  Group as GroupIcon,
  CalendarToday as CalendarIcon,
  CheckBoxOutlineBlank,
  CheckBox as CheckBoxIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

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

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    confirmText: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { showSuccess, showError, showInfo } = useToast();

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
      showSuccess(`${formData.clientName} added to waitlist`);
      fetchData();
    } catch {
      showError('Failed to add to waitlist');
    }
  };

  const handleStatusChange = async (id: string, status: WaitlistStatus) => {
    try {
      const res = await fetch(`/api/waitlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');

      const entry = entries.find((e) => e.id === id);
      const name = entry?.clientName || 'Entry';
      const statusLabel = STATUS_CONFIG[status].label.toLowerCase();
      showSuccess(`${name} marked as ${statusLabel}`);

      // Update the selected entry if it is the one being changed
      if (selectedEntry?.id === id) {
        setSelectedEntry((prev) => (prev ? { ...prev, status } : null));
      }

      fetchData();
    } catch {
      showError('Failed to update status');
    }
  };

  const handleRemove = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    setConfirmAction({
      title: 'Remove from Waitlist',
      message: `Are you sure you want to remove ${entry?.clientName || 'this entry'} from the waitlist? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/waitlist/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to remove');
          showSuccess(`${entry?.clientName || 'Entry'} removed from waitlist`);
          if (selectedEntry?.id === id) {
            setDrawerOpen(false);
            setSelectedEntry(null);
          }
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          fetchData();
        } catch {
          showError('Failed to remove from waitlist');
        }
      },
    });
    setConfirmOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      showInfo('No entries selected');
      return;
    }
    setConfirmAction({
      title: 'Bulk Delete',
      message: `Are you sure you want to remove ${selectedIds.size} waitlist ${selectedIds.size === 1 ? 'entry' : 'entries'}? This action cannot be undone.`,
      variant: 'danger',
      confirmText: `Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'Entry' : 'Entries'}`,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/bulk', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedIds), type: 'waitlist' }),
          });
          if (!res.ok) throw new Error('Failed to bulk delete');
          const data = await res.json();
          showSuccess(`${data.deletedCount} ${data.deletedCount === 1 ? 'entry' : 'entries'} removed`);
          if (selectedEntry && selectedIds.has(selectedEntry.id)) {
            setDrawerOpen(false);
            setSelectedEntry(null);
          }
          setSelectedIds(new Set());
          fetchData();
        } catch {
          showError('Failed to delete selected entries');
        }
      },
    });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      await confirmAction.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const handleRowClick = (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  };

  // Bulk selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  // Helper to find service name by id
  const getServiceName = (serviceId: string | null): string | null => {
    if (!serviceId) return null;
    const svc = services.find((s) => s.id === serviceId);
    return svc ? svc.name : null;
  };

  // Helper to find technician name by id
  const getTechName = (techId: string | null): string | null => {
    if (!techId) return null;
    const tech = technicians.find((t) => t.id === techId);
    return tech ? tech.name : null;
  };

  const waitingEntries = entries.filter((e) => e.status === 'WAITING');
  const notifiedEntries = entries.filter((e) => e.status === 'NOTIFIED');
  const completedEntries = entries.filter((e) => ['SEATED', 'LEFT', 'CANCELLED'].includes(e.status));

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4">Waitlist</Typography>
            <Typography variant="body2" color="text.secondary">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </Typography>
          </Box>
        </Box>
        <CardsSkeleton count={3} />
        <Box sx={{ mt: 4 }}>
          <TableSkeleton rows={6} columns={7} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Waitlist</Typography>
          <Typography variant="body2" color="text.secondary">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selectedIds.size > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDelete}
            >
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Add to Waitlist
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
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

      {/* Waitlist Table */}
      {entries.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="h6">
            No waitlist entries today
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
            Click &quot;Add to Waitlist&quot; to add your first entry.
          </Typography>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={entries.length > 0 && selectedIds.size === entries.length}
                    indeterminate={selectedIds.size > 0 && selectedIds.size < entries.length}
                    onChange={toggleSelectAll}
                    icon={<CheckBoxOutlineBlank />}
                    checkedIcon={<CheckBoxIcon />}
                  />
                </TableCell>
                <TableCell>#</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Party Size</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Wait Time</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry, index) => {
                const isSelected = selectedIds.has(entry.id);
                return (
                  <TableRow
                    key={entry.id}
                    hover
                    selected={isSelected}
                    sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                    onClick={() => handleRowClick(entry)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelect(entry.id)}
                        icon={<CheckBoxOutlineBlank />}
                        checkedIcon={<CheckBoxIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {index + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {entry.clientName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{entry.clientPhone}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{entry.partySize}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {getServiceName(entry.serviceId) || '--'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={STATUS_CONFIG[entry.status].label}
                        color={STATUS_CONFIG[entry.status].color}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        {entry.status === 'WAITING' && (
                          <>
                            <Tooltip title="Notify client">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => handleStatusChange(entry.id, 'NOTIFIED')}
                              >
                                <NotifyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Seat client">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleStatusChange(entry.id, 'SEATED')}
                              >
                                <SeatIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {entry.status === 'NOTIFIED' && (
                          <Tooltip title="Seat client">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleStatusChange(entry.id, 'SEATED')}
                            >
                              <SeatIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Remove">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemove(entry.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedEntry(null);
        }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
      >
        {selectedEntry && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Waitlist Details
              </Typography>
              <IconButton
                onClick={() => {
                  setDrawerOpen(false);
                  setSelectedEntry(null);
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Drawer Body */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {/* Client Name and Status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: `${STATUS_CONFIG[selectedEntry.status].color}.main`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <PersonIcon />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedEntry.clientName}
                  </Typography>
                  <Chip
                    size="small"
                    label={STATUS_CONFIG[selectedEntry.status].label}
                    color={STATUS_CONFIG[selectedEntry.status].color}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Details List */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PhoneIcon sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">{selectedEntry.clientPhone}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <GroupIcon sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Party Size
                    </Typography>
                    <Typography variant="body1">{selectedEntry.partySize}</Typography>
                  </Box>
                </Box>

                {selectedEntry.serviceId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CalendarIcon sx={{ color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Service
                      </Typography>
                      <Typography variant="body1">
                        {getServiceName(selectedEntry.serviceId) || 'Unknown'}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {selectedEntry.preferredTech && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PersonIcon sx={{ color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Preferred Technician
                      </Typography>
                      <Typography variant="body1">
                        {getTechName(selectedEntry.preferredTech) || 'Unknown'}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TimeIcon sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Estimated Wait
                    </Typography>
                    <Typography variant="body1">
                      {selectedEntry.estimatedWait != null
                        ? `${selectedEntry.estimatedWait} min`
                        : 'N/A'}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CalendarIcon sx={{ color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Joined
                    </Typography>
                    <Typography variant="body1">
                      {format(new Date(selectedEntry.createdAt), 'MMM d, yyyy h:mm a')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({formatDistanceToNow(new Date(selectedEntry.createdAt), { addSuffix: true })})
                    </Typography>
                  </Box>
                </Box>

                {selectedEntry.notifiedAt && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <NotifyIcon sx={{ color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Notified At
                      </Typography>
                      <Typography variant="body1">
                        {format(new Date(selectedEntry.notifiedAt), 'MMM d, yyyy h:mm a')}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {selectedEntry.seatedAt && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SeatIcon sx={{ color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Seated At
                      </Typography>
                      <Typography variant="body1">
                        {format(new Date(selectedEntry.seatedAt), 'MMM d, yyyy h:mm a')}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {selectedEntry.notes && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <NotesIcon sx={{ color: 'text.secondary', mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Notes
                      </Typography>
                      <Typography variant="body1">{selectedEntry.notes}</Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Drawer Actions */}
            <Divider />
            <Box sx={{ p: 2, display: 'flex', gap: 1.5 }}>
              {selectedEntry.status === 'WAITING' && (
                <>
                  <Button
                    variant="outlined"
                    color="info"
                    startIcon={<NotifyIcon />}
                    fullWidth
                    onClick={() => handleStatusChange(selectedEntry.id, 'NOTIFIED')}
                  >
                    Notify
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<SeatIcon />}
                    fullWidth
                    onClick={() => handleStatusChange(selectedEntry.id, 'SEATED')}
                  >
                    Seat
                  </Button>
                </>
              )}
              {selectedEntry.status === 'NOTIFIED' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<SeatIcon />}
                  fullWidth
                  onClick={() => handleStatusChange(selectedEntry.id, 'SEATED')}
                >
                  Seat
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                fullWidth
                onClick={() => handleRemove(selectedEntry.id)}
              >
                Remove
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        variant={confirmAction?.variant || 'danger'}
        confirmText={confirmAction?.confirmText || 'Confirm'}
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
      />
    </Box>
  );
}
