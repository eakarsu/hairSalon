'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
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
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Checkbox,
  Drawer,
  Divider,
} from '@mui/material';
import {
  Add,
  Check,
  Close,
  EventBusy,
  Schedule,
  CheckCircle,
  Cancel,
  Edit,
  Delete,
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton } from '@/components/LoadingSkeleton';

interface TimeOffRequest {
  id: string;
  technician: { id: string; name: string; email: string };
  approvedBy: { id: string; name: string } | null;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  approvedAt: string | null;
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string;
}

const statusColors: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'error',
  CANCELLED: 'default',
};

export default function TimeOffPage() {
  const { showSuccess, showError } = useToast();

  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, denied: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    technicianId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    confirmText: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    variant: 'warning',
    confirmText: 'Confirm',
    onConfirm: () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Detail drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchStaff();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/time-off');
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
        setSummary(data.summary || { pending: 0, approved: 0, denied: 0 });
      }
    } catch (error) {
      showError('Failed to fetch time-off requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
      }
    } catch (error) {
      showError('Failed to fetch staff');
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to submit');

      setDialogOpen(false);
      setFormData({ technicianId: '', startDate: '', endDate: '', reason: '' });
      showSuccess('Time-off request submitted successfully');
      fetchRequests();
    } catch (error) {
      showError('Failed to submit time-off request');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    setConfirmLoading(true);
    try {
      const response = await fetch('/api/time-off', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error('Failed to update');
      showSuccess(`Request ${status.toLowerCase()} successfully`);
      fetchRequests();
    } catch (error) {
      showError('Failed to update request status');
    } finally {
      setConfirmLoading(false);
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    }
  };

  const openStatusConfirm = (id: string, status: string) => {
    const isApprove = status === 'APPROVED';
    setConfirmDialog({
      open: true,
      title: isApprove ? 'Approve Request' : 'Deny Request',
      message: isApprove
        ? 'Are you sure you want to approve this time-off request?'
        : 'Are you sure you want to deny this time-off request?',
      variant: isApprove ? 'success' : 'warning',
      confirmText: isApprove ? 'Approve' : 'Deny',
      onConfirm: () => handleStatusUpdate(id, status),
    });
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Request',
      message: 'Are you sure you want to delete this time-off request? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const response = await fetch(`/api/time-off?id=${id}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error('Failed to delete');
          showSuccess('Time-off request deleted successfully');
          setDrawerOpen(false);
          setSelectedRequest(null);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          fetchRequests();
        } catch (error) {
          showError('Failed to delete time-off request');
        } finally {
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleEdit = (request: TimeOffRequest) => {
    setDrawerOpen(false);
    setFormData({
      technicianId: request.technician.id,
      startDate: request.startDate.split('T')[0],
      endDate: request.endDate.split('T')[0],
      reason: request.reason || '',
    });
    setDialogOpen(true);
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredRequests.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setConfirmDialog({
      open: true,
      title: 'Delete Selected Requests',
      message: `Are you sure you want to delete ${selectedIds.size} selected time-off request${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`,
      variant: 'danger',
      confirmText: `Delete ${selectedIds.size} Request${selectedIds.size !== 1 ? 's' : ''}`,
      onConfirm: async () => {
        setConfirmLoading(true);
        setBulkDeleting(true);
        try {
          const response = await fetch('/api/bulk', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedIds), type: 'time-off' }),
          });
          if (!response.ok) throw new Error('Failed to bulk delete');
          showSuccess(`${selectedIds.size} request${selectedIds.size !== 1 ? 's' : ''} deleted successfully`);
          setSelectedIds(new Set());
          setDrawerOpen(false);
          setSelectedRequest(null);
          fetchRequests();
        } catch (error) {
          showError('Failed to delete selected requests');
        } finally {
          setConfirmLoading(false);
          setBulkDeleting(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  // Row click handler for drawer
  const handleRowClick = (request: TimeOffRequest) => {
    setSelectedRequest(request);
    setDrawerOpen(true);
  };

  const tabs = ['All', 'Pending', 'Approved', 'Denied'];
  const statusMap: Record<number, string | null> = { 0: null, 1: 'PENDING', 2: 'APPROVED', 3: 'DENIED' };

  const filteredRequests = requests.filter(
    (r) => selectedTab === 0 || r.status === statusMap[selectedTab]
  );

  const allSelected = filteredRequests.length > 0 && filteredRequests.every((r) => selectedIds.has(r.id));
  const someSelected = filteredRequests.some((r) => selectedIds.has(r.id)) && !allSelected;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Time-Off Requests
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Request Time Off
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Schedule color="warning" />
                <Typography variant="body2" color="text.secondary">Pending</Typography>
              </Box>
              <Typography variant="h4">{summary.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="success" />
                <Typography variant="body2" color="text.secondary">Approved</Typography>
              </Box>
              <Typography variant="h4">{summary.approved}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Cancel color="error" />
                <Typography variant="body2" color="text.secondary">Denied</Typography>
              </Box>
              <Typography variant="h4">{summary.denied}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EventBusy color="info" />
                <Typography variant="body2" color="text.secondary">Total Requests</Typography>
              </Box>
              <Typography variant="h4">{requests.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
          }}
        >
          <Typography variant="body2" fontWeight={500}>
            {selectedIds.size} request{selectedIds.size !== 1 ? 's' : ''} selected
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              Delete Selected
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
            {tabs.map((tab) => (
              <Tab key={tab} label={tab} />
            ))}
          </Tabs>
        </Box>

        {loading ? (
          <TableSkeleton rows={5} columns={8} />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={someSelected}
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Approved By</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((request) => {
                  const days = differenceInDays(new Date(request.endDate), new Date(request.startDate)) + 1;
                  const isSelected = selectedIds.has(request.id);
                  return (
                    <TableRow
                      key={request.id}
                      hover
                      selected={isSelected}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(request)}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(request.id, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {request.technician.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {request.technician.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {format(new Date(request.startDate), 'MMM d, yyyy')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          to {format(new Date(request.endDate), 'MMM d, yyyy')}
                        </Typography>
                      </TableCell>
                      <TableCell>{days} day{days !== 1 ? 's' : ''}</TableCell>
                      <TableCell>{request.reason || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={request.status}
                          size="small"
                          color={statusColors[request.status]}
                        />
                      </TableCell>
                      <TableCell>
                        {request.approvedBy ? (
                          <Box>
                            <Typography variant="body2">{request.approvedBy.name}</Typography>
                            {request.approvedAt && (
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(request.approvedAt), 'MMM d')}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        {request.status === 'PENDING' && (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => openStatusConfirm(request.id, 'APPROVED')}
                              title="Approve"
                            >
                              <Check />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openStatusConfirm(request.id, 'DENIED')}
                              title="Deny"
                            >
                              <Close />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        No time-off requests found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 420 } }}
      >
        {selectedRequest && (() => {
          const days = differenceInDays(
            new Date(selectedRequest.endDate),
            new Date(selectedRequest.startDate)
          ) + 1;
          return (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Request Details
                </Typography>
                <IconButton onClick={() => setDrawerOpen(false)} size="small">
                  <Close />
                </IconButton>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Employee Name
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {selectedRequest.technician.name}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.technician.email}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Dates
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedRequest.startDate), 'MMM d, yyyy')} -{' '}
                    {format(new Date(selectedRequest.endDate), 'MMM d, yyyy')}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body1">
                    {days} day{days !== 1 ? 's' : ''}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Reason
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.reason || 'No reason provided'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedRequest.status}
                      size="small"
                      color={statusColors[selectedRequest.status]}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Approved By
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.approvedBy
                      ? selectedRequest.approvedBy.name
                      : 'Not yet reviewed'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created At
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedRequest.createdAt), 'MMM d, yyyy h:mm a')}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => handleEdit(selectedRequest)}
                  fullWidth
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => handleDelete(selectedRequest.id)}
                  fullWidth
                >
                  Delete
                </Button>
              </Box>
            </Box>
          );
        })()}
      </Drawer>

      {/* Request Time Off Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Time Off</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                label="Employee"
                value={formData.technicianId}
                onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
              >
                {staff.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </Grid>
            </Grid>
            <TextField
              label="Reason"
              fullWidth
              multiline
              rows={2}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving || !formData.technicianId || !formData.startDate || !formData.endDate}
          >
            {saving ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        loading={confirmLoading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}
