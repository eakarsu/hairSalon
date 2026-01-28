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
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Check,
  Close,
  EventBusy,
  Schedule,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';

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
      console.error('Failed to fetch time-off requests:', error);
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
      console.error('Failed to fetch staff:', error);
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
      fetchRequests();
    } catch (error) {
      console.error('Failed to submit request:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await fetch('/api/time-off', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchRequests();
    } catch (error) {
      console.error('Failed to update request:', error);
    }
  };

  const tabs = ['All', 'Pending', 'Approved', 'Denied'];
  const statusMap: Record<number, string | null> = { 0: null, 1: 'PENDING', 2: 'APPROVED', 3: 'DENIED' };

  const filteredRequests = requests.filter(
    r => selectedTab === 0 || r.status === statusMap[selectedTab]
  );

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

      <Paper sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
            {tabs.map((tab) => (
              <Tab key={tab} label={tab} />
            ))}
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
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
                  return (
                    <TableRow key={request.id} hover>
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
                      <TableCell align="right">
                        {request.status === 'PENDING' && (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleStatusUpdate(request.id, 'APPROVED')}
                              title="Approve"
                            >
                              <Check />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleStatusUpdate(request.id, 'DENIED')}
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
                    <TableCell colSpan={7} align="center">
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
    </Box>
  );
}
