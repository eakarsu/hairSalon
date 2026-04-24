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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Drawer,
  Divider,
  Checkbox,
  Toolbar,
  alpha,
} from '@mui/material';
import {
  Add,
  CardGiftcard,
  People,
  Star,
  TrendingUp,
  Close,
  Edit,
  Delete,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton } from '@/components/LoadingSkeleton';

interface Referral {
  id: string;
  referrer: { id: string; name: string; phone: string; email: string | null };
  referred: { id: string; name: string; phone: string; email: string | null; createdAt: string };
  status: string;
  rewardType: string | null;
  rewardValue: number | null;
  rewardGivenAt: string | null;
  createdAt: string;
}

interface TopReferrer {
  client: { id: string; name: string; phone: string } | undefined;
  count: number;
}

const statusColors: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
  PENDING: 'default',
  QUALIFIED: 'warning',
  REWARDED: 'success',
  EXPIRED: 'default',
};

export default function ReferralsPage() {
  const { showSuccess, showError } = useToast();

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    qualified: 0,
    rewarded: 0,
    totalRewardsGiven: 0,
  });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    referrerId: '',
    referredId: '',
    rewardType: 'points',
    rewardValue: 100,
  });

  // Detail Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  // Confirm Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchReferrals();
    fetchClients();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await fetch('/api/referrals');
      if (response.ok) {
        const data = await response.json();
        setReferrals(data.referrals || []);
        setTopReferrers(data.topReferrers || []);
        setSummary(data.summary || {
          total: 0,
          pending: 0,
          qualified: 0,
          rewarded: 0,
          totalRewardsGiven: 0,
        });
      } else {
        showError('Failed to fetch referrals');
      }
    } catch (error) {
      showError('Failed to fetch referrals');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      } else {
        showError('Failed to fetch clients');
      }
    } catch (error) {
      showError('Failed to fetch clients');
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        showError(data.error || 'Failed to create referral');
        return;
      }

      setDialogOpen(false);
      setFormData({ referrerId: '', referredId: '', rewardType: 'points', rewardValue: 100 });
      showSuccess('Referral created successfully');
      fetchReferrals();
    } catch (error) {
      showError('Failed to create referral');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const response = await fetch('/api/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!response.ok) {
        showError('Failed to update referral');
        return;
      }
      showSuccess(
        action === 'qualify'
          ? 'Referral marked as qualified'
          : 'Reward given successfully'
      );
      fetchReferrals();
      // Update the drawer if it is open and showing the same referral
      if (selectedReferral?.id === id) {
        const updated = await fetch('/api/referrals');
        if (updated.ok) {
          const data = await updated.json();
          const found = (data.referrals || []).find((r: Referral) => r.id === id);
          if (found) setSelectedReferral(found);
        }
      }
    } catch (error) {
      showError('Failed to update referral');
    }
  };

  // Delete single referral
  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setConfirmLoading(true);
    try {
      const response = await fetch(`/api/referrals?id=${deleteTargetId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        showError('Failed to delete referral');
        return;
      }
      showSuccess('Referral deleted successfully');
      // Close drawer if the deleted referral was being viewed
      if (selectedReferral?.id === deleteTargetId) {
        setDrawerOpen(false);
        setSelectedReferral(null);
      }
      // Remove from selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTargetId);
        return next;
      });
      fetchReferrals();
    } catch (error) {
      showError('Failed to delete referral');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setDeleteTargetId(null);
    }
  };

  // Bulk delete
  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    setBulkConfirmOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    try {
      const response = await fetch('/api/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), type: 'referrals' }),
      });
      if (!response.ok) {
        showError('Failed to delete selected referrals');
        return;
      }
      showSuccess(`${selectedIds.size} referral${selectedIds.size !== 1 ? 's' : ''} deleted successfully`);
      // Close drawer if viewed referral was in the bulk delete set
      if (selectedReferral && selectedIds.has(selectedReferral.id)) {
        setDrawerOpen(false);
        setSelectedReferral(null);
      }
      setSelectedIds(new Set());
      fetchReferrals();
    } catch (error) {
      showError('Failed to delete selected referrals');
    } finally {
      setBulkDeleting(false);
      setBulkConfirmOpen(false);
    }
  };

  // Row click handler - open detail drawer
  const handleRowClick = (referral: Referral) => {
    setSelectedReferral(referral);
    setDrawerOpen(true);
  };

  // Bulk select helpers
  const tabs = ['All', 'Pending', 'Qualified', 'Rewarded'];
  const statusMap: Record<number, string | null> = {
    0: null,
    1: 'PENDING',
    2: 'QUALIFIED',
    3: 'REWARDED',
  };

  const filteredReferrals = referrals.filter(
    r => selectedTab === 0 || r.status === statusMap[selectedTab]
  );

  const allFilteredSelected =
    filteredReferrals.length > 0 &&
    filteredReferrals.every((r) => selectedIds.has(r.id));

  const someFilteredSelected =
    filteredReferrals.some((r) => selectedIds.has(r.id)) && !allFilteredSelected;

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredReferrals.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredReferrals.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const handleSelectOne = (id: string) => {
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

  const formatReward = (referral: Referral) => {
    if (referral.rewardType === 'points') return `${referral.rewardValue} pts`;
    if (referral.rewardType === 'discount') return `$${referral.rewardValue} off`;
    return referral.rewardType || '-';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Referrals
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Add Referral
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <People color="primary" />
                <Typography variant="body2" color="text.secondary">Total Referrals</Typography>
              </Box>
              <Typography variant="h4">{summary.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp color="warning" />
                <Typography variant="body2" color="text.secondary">Qualified</Typography>
              </Box>
              <Typography variant="h4">{summary.qualified}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CardGiftcard color="success" />
                <Typography variant="body2" color="text.secondary">Rewarded</Typography>
              </Box>
              <Typography variant="h4">{summary.rewarded}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Star color="info" />
                <Typography variant="body2" color="text.secondary">Rewards Given</Typography>
              </Box>
              <Typography variant="h4">{summary.totalRewardsGiven} pts</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
                {tabs.map((tab) => (
                  <Tab key={tab} label={tab} />
                ))}
              </Tabs>
            </Box>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <Toolbar
                sx={{
                  pl: 2,
                  pr: 1,
                  mb: 1,
                  borderRadius: 1,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                }}
              >
                <Typography sx={{ flex: '1 1 100%' }} color="primary" variant="subtitle1">
                  {selectedIds.size} selected
                </Typography>
                <Button
                  size="small"
                  onClick={() => setSelectedIds(new Set())}
                  sx={{ mr: 1 }}
                >
                  Clear Selection
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleBulkDeleteClick}
                >
                  Delete Selected
                </Button>
              </Toolbar>
            )}

            {loading ? (
              <TableSkeleton rows={5} columns={7} />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={someFilteredSelected}
                          checked={allFilteredSelected}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Referrer</TableCell>
                      <TableCell>Referred</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Reward</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredReferrals.map((referral) => (
                      <TableRow
                        key={referral.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        selected={selectedIds.has(referral.id)}
                        onClick={() => handleRowClick(referral)}
                      >
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(referral.id)}
                            onChange={() => handleSelectOne(referral.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {referral.referrer.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {referral.referrer.phone}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {referral.referred.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Joined {format(new Date(referral.referred.createdAt), 'MMM d, yyyy')}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={referral.status}
                            size="small"
                            color={statusColors[referral.status]}
                          />
                        </TableCell>
                        <TableCell>
                          {formatReward(referral)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(referral.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          {referral.status === 'PENDING' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleAction(referral.id, 'qualify')}
                            >
                              Mark Qualified
                            </Button>
                          )}
                          {referral.status === 'QUALIFIED' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleAction(referral.id, 'reward')}
                            >
                              Give Reward
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredReferrals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>
                            No referrals found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Referrers
            </Typography>
            <List>
              {topReferrers.map((item, index) => (
                <ListItem key={index}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: index === 0 ? 'gold' : index === 1 ? 'silver' : '#CD7F32' }}>
                      {index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.client?.name || 'Unknown'}
                    secondary={`${item.count} referral${item.count !== 1 ? 's' : ''}`}
                  />
                </ListItem>
              ))}
              {topReferrers.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                  No referrers yet
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Add Referral Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Referral</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Referrer (Existing Client)</InputLabel>
              <Select
                label="Referrer (Existing Client)"
                value={formData.referrerId}
                onChange={(e) => setFormData({ ...formData, referrerId: e.target.value })}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Referred (New Client)</InputLabel>
              <Select
                label="Referred (New Client)"
                value={formData.referredId}
                onChange={(e) => setFormData({ ...formData, referredId: e.target.value })}
              >
                {clients
                  .filter(c => c.id !== formData.referrerId)
                  .map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Reward Type</InputLabel>
              <Select
                label="Reward Type"
                value={formData.rewardType}
                onChange={(e) => setFormData({ ...formData, rewardType: e.target.value })}
              >
                <MenuItem value="points">Loyalty Points</MenuItem>
                <MenuItem value="discount">Discount</MenuItem>
                <MenuItem value="free_service">Free Service</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving || !formData.referrerId || !formData.referredId}
          >
            {saving ? 'Creating...' : 'Add Referral'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 420, maxWidth: '100vw' } }}
      >
        {selectedReferral && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={600}>
                Referral Details
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)}>
                <Close />
              </IconButton>
            </Box>

            {/* Drawer Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {/* Status */}
              <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Status:</Typography>
                <Chip
                  label={selectedReferral.status}
                  size="small"
                  color={statusColors[selectedReferral.status]}
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Referrer Section */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                REFERRER
              </Typography>
              <Box sx={{ mb: 3, pl: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Name</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedReferral.referrer.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography variant="body2">{selectedReferral.referrer.phone}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{selectedReferral.referrer.email || '-'}</Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Referred Section */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                REFERRED
              </Typography>
              <Box sx={{ mb: 3, pl: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Name</Typography>
                  <Typography variant="body2" fontWeight={500}>{selectedReferral.referred.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography variant="body2">{selectedReferral.referred.phone}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{selectedReferral.referred.email || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Join Date</Typography>
                  <Typography variant="body2">
                    {format(new Date(selectedReferral.referred.createdAt), 'MMM d, yyyy')}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Reward Section */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                REWARD
              </Typography>
              <Box sx={{ mb: 3, pl: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Reward Type</Typography>
                  <Typography variant="body2">{selectedReferral.rewardType || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Reward Value</Typography>
                  <Typography variant="body2">{formatReward(selectedReferral)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Reward Given Date</Typography>
                  <Typography variant="body2">
                    {selectedReferral.rewardGivenAt
                      ? format(new Date(selectedReferral.rewardGivenAt), 'MMM d, yyyy')
                      : '-'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Dates */}
              <Box sx={{ pl: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Created At</Typography>
                  <Typography variant="body2">
                    {format(new Date(selectedReferral.createdAt), 'MMM d, yyyy h:mm a')}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Drawer Footer Actions */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
              {selectedReferral.status === 'PENDING' && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Edit />}
                  onClick={() => {
                    handleAction(selectedReferral.id, 'qualify');
                  }}
                >
                  Mark Qualified
                </Button>
              )}
              {selectedReferral.status === 'QUALIFIED' && (
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  startIcon={<CardGiftcard />}
                  onClick={() => {
                    handleAction(selectedReferral.id, 'reward');
                  }}
                >
                  Give Reward
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                fullWidth
                startIcon={<Delete />}
                onClick={() => {
                  handleDeleteClick(selectedReferral.id);
                }}
              >
                Delete
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Single Delete Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Referral"
        message="Are you sure you want to delete this referral? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={confirmLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTargetId(null);
        }}
      />

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Delete Selected Referrals"
        message={`Are you sure you want to delete ${selectedIds.size} referral${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText={`Delete ${selectedIds.size}`}
        cancelText="Cancel"
        variant="danger"
        loading={bulkDeleting}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkConfirmOpen(false)}
      />
    </Box>
  );
}
