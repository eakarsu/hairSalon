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
  IconButton,
  Tooltip,
  Drawer,
  Divider,
} from '@mui/material';
import {
  AttachMoney,
  CheckCircle,
  Schedule,
  PendingActions,
  Edit,
  Settings,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

interface Commission {
  id: string;
  technicianId: string;
  technician: { id: string; name: string; level: string | null };
  serviceAmount: number;
  productAmount: number;
  tipAmount: number;
  commissionRate: number;
  commissionAmount: number;
  period: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface CommissionRule {
  id: string;
  technicianId: string;
  technician: { id: string; name: string };
  serviceRate: number;
  productRate: number;
  tipRate: number;
}

const statusColors: Record<string, 'default' | 'primary' | 'success'> = {
  PENDING: 'default',
  APPROVED: 'primary',
  PAID: 'success',
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [summary, setSummary] = useState({ totalPending: 0, totalApproved: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7) // Current month
  );

  // Detail drawer state
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    commissionRate: '',
    status: '',
  });

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchCommissions();
  }, [selectedPeriod]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/commissions?period=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setCommissions(data.commissions || []);
        setRules(data.rules || []);
        setSummary(data.summary || { totalPending: 0, totalApproved: 0, totalPaid: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch commissions:', error);
      showError('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (selectedIds.length === 0) return;

    try {
      await fetch('/api/commissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      });
      setSelectedIds([]);
      showSuccess(`${selectedIds.length} commission(s) marked as ${status.toLowerCase()}`);
      fetchCommissions();
    } catch (error) {
      console.error('Failed to update commissions:', error);
      showError('Failed to update commissions');
    }
  };

  const handleRowClick = (commission: Commission, e: React.MouseEvent) => {
    // Don't open drawer when clicking checkbox
    const target = e.target as HTMLElement;
    if (target.closest('input[type="checkbox"]') || target.closest('.MuiCheckbox-root')) return;

    setSelectedCommission(commission);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedCommission(null);
  };

  const handleEditOpen = () => {
    if (!selectedCommission) return;
    setEditFormData({
      commissionRate: (selectedCommission.commissionRate * 100).toString(),
      status: selectedCommission.status,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedCommission) return;
    try {
      const res = await fetch('/api/commissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [selectedCommission.id],
          status: editFormData.status,
        }),
      });

      if (!res.ok) throw new Error('Failed to update commission');

      setEditDialogOpen(false);
      setDrawerOpen(false);
      setSelectedCommission(null);
      showSuccess('Commission updated successfully');
      fetchCommissions();
    } catch {
      showError('Failed to update commission');
    }
  };

  const handleDeleteClick = () => {
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCommission) return;
    setConfirmLoading(true);
    try {
      const res = await fetch(`/api/commissions?id=${selectedCommission.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete commission');

      setConfirmOpen(false);
      setDrawerOpen(false);
      setSelectedCommission(null);
      showSuccess('Commission deleted successfully');
      fetchCommissions();
    } catch {
      showError('Failed to delete commission');
    } finally {
      setConfirmLoading(false);
    }
  };

  const tabs = ['All', 'Pending', 'Approved', 'Paid'];
  const statusMap: Record<number, string | null> = { 0: null, 1: 'PENDING', 2: 'APPROVED', 3: 'PAID' };

  const filteredCommissions = commissions.filter(
    c => selectedTab === 0 || c.status === statusMap[selectedTab]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const pendingIds = filteredCommissions.filter(c => c.status !== 'PAID').map(c => c.id);
    setSelectedIds(prev => prev.length === pendingIds.length ? [] : pendingIds);
  };

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={600}>Commissions</Typography>
        </Box>
        <CardsSkeleton count={4} />
        <Box sx={{ mt: 3 }}>
          <TableSkeleton rows={6} columns={8} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Commissions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            type="month"
            size="small"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            sx={{ width: 180 }}
          />
          <IconButton onClick={() => setRuleDialogOpen(true)}>
            <Tooltip title="Commission Rules">
              <Settings />
            </Tooltip>
          </IconButton>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PendingActions color="warning" />
                <Typography variant="body2" color="text.secondary">Pending</Typography>
              </Box>
              <Typography variant="h4">${summary.totalPending.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Schedule color="primary" />
                <Typography variant="body2" color="text.secondary">Approved</Typography>
              </Box>
              <Typography variant="h4">${summary.totalApproved.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="success" />
                <Typography variant="body2" color="text.secondary">Paid</Typography>
              </Box>
              <Typography variant="h4">${summary.totalPaid.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AttachMoney color="info" />
                <Typography variant="body2" color="text.secondary">Total</Typography>
              </Box>
              <Typography variant="h4">
                ${(summary.totalPending + summary.totalApproved + summary.totalPaid).toFixed(2)}
              </Typography>
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

        {selectedIds.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => handleStatusUpdate('APPROVED')}
            >
              Approve Selected ({selectedIds.length})
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleStatusUpdate('PAID')}
            >
              Mark as Paid ({selectedIds.length})
            </Button>
          </Box>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.length > 0 && selectedIds.length === filteredCommissions.filter(c => c.status !== 'PAID').length}
                    onChange={selectAll}
                  />
                </TableCell>
                <TableCell>Technician</TableCell>
                <TableCell align="right">Services</TableCell>
                <TableCell align="right">Products</TableCell>
                <TableCell align="right">Tips</TableCell>
                <TableCell align="right">Rate</TableCell>
                <TableCell align="right">Commission</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCommissions.map((commission) => (
                <TableRow
                  key={commission.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={(e) => handleRowClick(commission, e)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(commission.id)}
                      onChange={() => toggleSelect(commission.id)}
                      disabled={commission.status === 'PAID'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {commission.technician.name}
                      </Typography>
                      {commission.technician.level && (
                        <Typography variant="caption" color="text.secondary">
                          {commission.technician.level}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">${commission.serviceAmount.toFixed(2)}</TableCell>
                  <TableCell align="right">${commission.productAmount.toFixed(2)}</TableCell>
                  <TableCell align="right">${commission.tipAmount.toFixed(2)}</TableCell>
                  <TableCell align="right">{(commission.commissionRate * 100).toFixed(0)}%</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600}>${commission.commissionAmount.toFixed(2)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={commission.status}
                      size="small"
                      color={statusColors[commission.status]}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filteredCommissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No commissions for this period
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Commission Rules Dialog */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Commission Rules</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Technician</TableCell>
                  <TableCell align="right">Service Rate</TableCell>
                  <TableCell align="right">Product Rate</TableCell>
                  <TableCell align="right">Tip Rate</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.technician.name}</TableCell>
                    <TableCell align="right">{(rule.serviceRate * 100).toFixed(0)}%</TableCell>
                    <TableCell align="right">{(rule.productRate * 100).toFixed(0)}%</TableCell>
                    <TableCell align="right">{(rule.tipRate * 100).toFixed(0)}%</TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary">
                        No custom rules. Default: 45% services, 10% products, 100% tips
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{ sx: { width: 400 } }}
      >
        {selectedCommission && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Commission Details</Typography>
              <IconButton onClick={handleCloseDrawer}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Commission ID</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedCommission.id}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Technician</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {selectedCommission.technician.name}
                </Typography>
                {selectedCommission.technician.level && (
                  <Typography variant="caption" color="text.secondary">
                    {selectedCommission.technician.level}
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Service Amount</Typography>
                <Typography variant="body2" fontWeight={500}>
                  ${selectedCommission.serviceAmount.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Product Amount</Typography>
                <Typography variant="body2" fontWeight={500}>
                  ${selectedCommission.productAmount.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Tip Amount</Typography>
                <Typography variant="body2" fontWeight={500}>
                  ${selectedCommission.tipAmount.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Commission Rate</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {(selectedCommission.commissionRate * 100).toFixed(0)}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Commission Amount</Typography>
                <Typography variant="h5" fontWeight={600} color="primary.main">
                  ${selectedCommission.commissionAmount.toFixed(2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Period</Typography>
                <Typography variant="body2" fontWeight={500}>{selectedCommission.period}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={selectedCommission.status}
                    size="small"
                    color={statusColors[selectedCommission.status]}
                  />
                </Box>
              </Box>
              {selectedCommission.paidAt && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Paid At</Typography>
                  <Typography variant="body2">{new Date(selectedCommission.paidAt).toLocaleDateString()}</Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Edit />}
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

      {/* Edit Commission Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Commission</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={editFormData.status}
              label="Status"
              onChange={(e) => setEditFormData((prev) => ({ ...prev, status: e.target.value }))}
            >
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="PAID">Paid</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Commission"
        message={`Are you sure you want to delete this commission of $${selectedCommission?.commissionAmount.toFixed(2)} for ${selectedCommission?.technician.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={confirmLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
}
