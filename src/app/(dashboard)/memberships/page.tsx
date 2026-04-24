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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  Drawer,
  Divider,
  Stack,
} from '@mui/material';
import {
  Add,
  Edit,
  CardMembership,
  People,
  AttachMoney,
  Check,
  Pause,
  PlayArrow,
  Cancel,
  Close,
  CalendarMonth,
  Phone,
  Email,
  CreditCard,
  EventRepeat,
} from '@mui/icons-material';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  annualPrice: number | null;
  benefits: string[];
  discountPercent: number;
  freeServices: Record<string, number> | null;
  _count: { memberships: number };
}

interface Membership {
  id: string;
  plan: { id: string; name: string; monthlyPrice: number; discountPercent: number };
  client: { id: string; name: string; phone: string; email: string | null };
  status: string;
  startDate: string;
  endDate: string | null;
  billingCycle: string;
  nextBillDate: string | null;
}

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  CANCELLED: 'error',
  EXPIRED: 'default',
};

export default function MembershipsPage() {
  const { showSuccess, showError } = useToast();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [summary, setSummary] = useState({ active: 0, paused: 0, cancelled: 0, monthlyRevenue: 0 });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    monthlyPrice: 0,
    annualPrice: 0,
    discountPercent: 10,
    benefits: [''],
  });
  const [enrollForm, setEnrollForm] = useState({
    planId: '',
    clientId: '',
    billingCycle: 'MONTHLY',
  });

  // Detail Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);

  // Edit Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    planId: '',
    billingCycle: '',
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
    variant: 'danger',
    confirmText: 'Confirm',
    onConfirm: () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchMemberships();
    fetchClients();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/memberships?type=plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      showError('Failed to load membership plans');
    }
  };

  const fetchMemberships = async () => {
    try {
      const response = await fetch('/api/memberships?type=members');
      if (response.ok) {
        const data = await response.json();
        setMemberships(data.memberships || []);
        setSummary(data.summary || { active: 0, paused: 0, cancelled: 0, monthlyRevenue: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch memberships:', error);
      showError('Failed to load memberships');
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
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'plan',
          ...planForm,
          benefits: planForm.benefits.filter(b => b.trim()),
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      setPlanDialogOpen(false);
      setPlanForm({
        name: '',
        description: '',
        monthlyPrice: 0,
        annualPrice: 0,
        discountPercent: 10,
        benefits: [''],
      });
      fetchPlans();
      showSuccess('Membership plan created successfully');
    } catch (error) {
      console.error('Failed to save plan:', error);
      showError('Failed to create membership plan');
    } finally {
      setSaving(false);
    }
  };

  const handleEnroll = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'enrollment',
          ...enrollForm,
        }),
      });

      if (!response.ok) throw new Error('Failed to enroll');

      setEnrollDialogOpen(false);
      setEnrollForm({ planId: '', clientId: '', billingCycle: 'MONTHLY' });
      fetchMemberships();
      showSuccess('Client enrolled successfully');
    } catch (error) {
      console.error('Failed to enroll:', error);
      showError('Failed to enroll client');
    } finally {
      setSaving(false);
    }
  };

  const handleMembershipAction = async (id: string, action: string) => {
    setConfirmLoading(true);
    try {
      const response = await fetch('/api/memberships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} membership`);

      await fetchMemberships();

      // Update the selected membership in the drawer if it matches
      if (selectedMembership && selectedMembership.id === id) {
        const updated = memberships.find(m => m.id === id);
        // Re-fetch to get the latest state - find the updated one
        const refetchRes = await fetch('/api/memberships?type=members');
        if (refetchRes.ok) {
          const data = await refetchRes.json();
          const updatedMembership = (data.memberships || []).find((m: Membership) => m.id === id);
          if (updatedMembership) {
            setSelectedMembership(updatedMembership);
          } else {
            // membership might have been removed from list, close drawer
            setDrawerOpen(false);
            setSelectedMembership(null);
          }
        }
      }

      const actionLabels: Record<string, string> = {
        pause: 'Membership paused',
        resume: 'Membership resumed',
        cancel: 'Membership cancelled',
      };
      showSuccess(actionLabels[action] || 'Membership updated');
    } catch (error) {
      console.error('Failed to update membership:', error);
      showError(`Failed to ${action} membership`);
    } finally {
      setConfirmLoading(false);
      setConfirmDialog(prev => ({ ...prev, open: false }));
    }
  };

  const handleEditMembership = async () => {
    if (!selectedMembership) return;
    setSaving(true);
    try {
      const response = await fetch('/api/memberships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMembership.id,
          action: 'update',
          planId: editForm.planId,
          billingCycle: editForm.billingCycle,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setEditDialogOpen(false);
      await fetchMemberships();

      // Refresh the drawer with updated data
      const refetchRes = await fetch('/api/memberships?type=members');
      if (refetchRes.ok) {
        const data = await refetchRes.json();
        const updatedMembership = (data.memberships || []).find(
          (m: Membership) => m.id === selectedMembership.id
        );
        if (updatedMembership) {
          setSelectedMembership(updatedMembership);
        }
      }

      showSuccess('Membership updated successfully');
    } catch (error) {
      console.error('Failed to update membership:', error);
      showError('Failed to update membership');
    } finally {
      setSaving(false);
    }
  };

  const openConfirmAction = (
    membership: Membership,
    action: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();

    const configs: Record<string, {
      title: string;
      message: string;
      variant: 'danger' | 'warning' | 'info' | 'success';
      confirmText: string;
    }> = {
      pause: {
        title: 'Pause Membership',
        message: `Are you sure you want to pause ${membership.client.name}'s "${membership.plan.name}" membership? Billing will be suspended until resumed.`,
        variant: 'warning',
        confirmText: 'Pause Membership',
      },
      resume: {
        title: 'Resume Membership',
        message: `Resume ${membership.client.name}'s "${membership.plan.name}" membership? Billing will restart from the next cycle.`,
        variant: 'success',
        confirmText: 'Resume Membership',
      },
      cancel: {
        title: 'Cancel Membership',
        message: `Are you sure you want to cancel ${membership.client.name}'s "${membership.plan.name}" membership? This action cannot be undone.`,
        variant: 'danger',
        confirmText: 'Cancel Membership',
      },
    };

    const config = configs[action];
    if (!config) return;

    setConfirmDialog({
      open: true,
      ...config,
      onConfirm: () => handleMembershipAction(membership.id, action),
    });
  };

  const openDrawer = (membership: Membership) => {
    setSelectedMembership(membership);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedMembership(null);
  };

  const openEditDialog = () => {
    if (!selectedMembership) return;
    setEditForm({
      planId: selectedMembership.plan.id,
      billingCycle: selectedMembership.billingCycle,
    });
    setEditDialogOpen(true);
  };

  const addBenefit = () => {
    setPlanForm({ ...planForm, benefits: [...planForm.benefits, ''] });
  };

  const updateBenefit = (index: number, value: string) => {
    const updated = [...planForm.benefits];
    updated[index] = value;
    setPlanForm({ ...planForm, benefits: updated });
  };

  const tabs = ['Plans', 'Members'];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Memberships
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setPlanDialogOpen(true)}
          >
            Create Plan
          </Button>
          <Button
            variant="contained"
            startIcon={<People />}
            onClick={() => setEnrollDialogOpen(true)}
          >
            Enroll Client
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {loading ? (
        <Box sx={{ mb: 3 }}>
          <CardsSkeleton count={4} />
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CardMembership color="primary" />
                  <Typography variant="body2" color="text.secondary">Active Members</Typography>
                </Box>
                <Typography variant="h4">{summary.active}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Pause color="warning" />
                  <Typography variant="body2" color="text.secondary">Paused</Typography>
                </Box>
                <Typography variant="h4">{summary.paused}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AttachMoney color="success" />
                  <Typography variant="body2" color="text.secondary">Monthly Revenue</Typography>
                </Box>
                <Typography variant="h4">${summary.monthlyRevenue.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <People color="info" />
                  <Typography variant="body2" color="text.secondary">Total Plans</Typography>
                </Box>
                <Typography variant="h4">{plans.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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
          <TableSkeleton rows={5} columns={6} />
        ) : (
          <>
            {selectedTab === 0 && (
              <Grid container spacing={3}>
                {plans.map((plan) => (
                  <Grid key={plan.id} size={{ xs: 12, md: 6, lg: 4 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>{plan.name}</Typography>
                        <Typography variant="h4" color="primary" gutterBottom>
                          ${plan.monthlyPrice.toFixed(2)}<Typography component="span" variant="body2">/mo</Typography>
                        </Typography>
                        {plan.annualPrice && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            or ${plan.annualPrice.toFixed(2)}/year (save {Math.round((1 - plan.annualPrice / (plan.monthlyPrice * 12)) * 100)}%)
                          </Typography>
                        )}
                        <Chip
                          label={`${plan.discountPercent}% off services`}
                          color="success"
                          size="small"
                          sx={{ mb: 2 }}
                        />
                        {plan.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {plan.description}
                          </Typography>
                        )}
                        <List dense>
                          {plan.benefits.map((benefit, i) => (
                            <ListItem key={i} sx={{ py: 0 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <Check color="success" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={benefit} />
                            </ListItem>
                          ))}
                        </List>
                        <Typography variant="caption" color="text.secondary">
                          {plan._count.memberships} active members
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {plans.length === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                      No membership plans created yet.
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}

            {selectedTab === 1 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Billing</TableCell>
                      <TableCell>Start Date</TableCell>
                      <TableCell>Next Bill</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {memberships.map((membership) => (
                      <TableRow
                        key={membership.id}
                        hover
                        onClick={() => openDrawer(membership)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {membership.client.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {membership.client.phone}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{membership.plan.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              ${membership.plan.monthlyPrice}/mo
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={membership.status}
                            size="small"
                            color={statusColors[membership.status]}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={membership.billingCycle}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(membership.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {membership.nextBillDate
                            ? new Date(membership.nextBillDate).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {membership.status === 'ACTIVE' && (
                            <IconButton
                              size="small"
                              onClick={(e) => openConfirmAction(membership, 'pause', e)}
                              title="Pause"
                            >
                              <Pause />
                            </IconButton>
                          )}
                          {membership.status === 'PAUSED' && (
                            <IconButton
                              size="small"
                              onClick={(e) => openConfirmAction(membership, 'resume', e)}
                              title="Resume"
                            >
                              <PlayArrow />
                            </IconButton>
                          )}
                          {membership.status !== 'CANCELLED' && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => openConfirmAction(membership, 'cancel', e)}
                              title="Cancel"
                            >
                              <Cancel />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {memberships.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>
                            No members enrolled yet.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Paper>

      {/* Membership Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
      >
        {selectedMembership && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Membership Details
              </Typography>
              <IconButton onClick={closeDrawer} size="small">
                <Close />
              </IconButton>
            </Box>

            {/* Drawer Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {/* Client Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary">
                  Client
                </Typography>
                <Typography variant="h5" fontWeight={600} sx={{ mt: 0.5 }}>
                  {selectedMembership.client.name}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {selectedMembership.client.phone}
                  </Typography>
                </Stack>
                {selectedMembership.client.email && (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                    <Email fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {selectedMembership.client.email}
                    </Typography>
                  </Stack>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Status */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={selectedMembership.status}
                    color={statusColors[selectedMembership.status]}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Box>

              {/* Plan Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary">
                  Plan
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    {selectedMembership.plan.name}
                  </Typography>
                  <Typography variant="h5" color="primary" sx={{ mt: 0.5 }}>
                    ${selectedMembership.plan.monthlyPrice.toFixed(2)}
                    <Typography component="span" variant="body2" color="text.secondary">
                      /mo
                    </Typography>
                  </Typography>
                  <Chip
                    label={`${selectedMembership.plan.discountPercent}% off services`}
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Billing Details */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary">
                  Billing Details
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CreditCard fontSize="small" color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Billing Cycle
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {selectedMembership.billingCycle === 'MONTHLY' ? 'Monthly' : 'Annual'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <CalendarMonth fontSize="small" color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Start Date
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {new Date(selectedMembership.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Typography>
                    </Box>
                  </Stack>
                  {selectedMembership.nextBillDate && (
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <EventRepeat fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Next Billing Date
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {new Date(selectedMembership.nextBillDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Typography>
                      </Box>
                    </Stack>
                  )}
                  {selectedMembership.endDate && (
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <CalendarMonth fontSize="small" color="error" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          End Date
                        </Typography>
                        <Typography variant="body2" fontWeight={500} color="error">
                          {new Date(selectedMembership.endDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Typography>
                      </Box>
                    </Stack>
                  )}
                </Stack>
              </Box>
            </Box>

            {/* Drawer Footer - Action Buttons */}
            <Box
              sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Button
                variant="outlined"
                startIcon={<Edit />}
                fullWidth
                onClick={openEditDialog}
              >
                Edit Membership
              </Button>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {selectedMembership.status === 'ACTIVE' && (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<Pause />}
                    fullWidth
                    onClick={() => openConfirmAction(selectedMembership, 'pause')}
                  >
                    Pause
                  </Button>
                )}
                {selectedMembership.status === 'PAUSED' && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PlayArrow />}
                    fullWidth
                    onClick={() => openConfirmAction(selectedMembership, 'resume')}
                  >
                    Resume
                  </Button>
                )}
                {selectedMembership.status !== 'CANCELLED' && selectedMembership.status !== 'EXPIRED' && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel />}
                    fullWidth
                    onClick={() => openConfirmAction(selectedMembership, 'cancel')}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Edit Membership Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Membership</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {selectedMembership && (
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Client
                </Typography>
                <Typography variant="subtitle1" fontWeight={600}>
                  {selectedMembership.client.name}
                </Typography>
              </Box>
            )}
            <FormControl fullWidth>
              <InputLabel>Plan</InputLabel>
              <Select
                label="Plan"
                value={editForm.planId}
                onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}
              >
                {plans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.monthlyPrice}/mo
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Billing Cycle</InputLabel>
              <Select
                label="Billing Cycle"
                value={editForm.billingCycle}
                onChange={(e) => setEditForm({ ...editForm, billingCycle: e.target.value })}
              >
                <MenuItem value="MONTHLY">Monthly</MenuItem>
                <MenuItem value="ANNUAL">Annual</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEditMembership}
            disabled={saving || !editForm.planId || !editForm.billingCycle}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Plan Dialog */}
      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Membership Plan</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Plan Name"
              fullWidth
              required
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Monthly Price"
                  type="number"
                  fullWidth
                  required
                  value={planForm.monthlyPrice}
                  onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: parseFloat(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Annual Price (optional)"
                  type="number"
                  fullWidth
                  value={planForm.annualPrice}
                  onChange={(e) => setPlanForm({ ...planForm, annualPrice: parseFloat(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Service Discount %"
              type="number"
              fullWidth
              value={planForm.discountPercent}
              onChange={(e) => setPlanForm({ ...planForm, discountPercent: parseFloat(e.target.value) })}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            />
            <Typography variant="subtitle2">Benefits</Typography>
            {planForm.benefits.map((benefit, index) => (
              <TextField
                key={index}
                placeholder={`Benefit ${index + 1}`}
                fullWidth
                size="small"
                value={benefit}
                onChange={(e) => updateBenefit(index, e.target.value)}
              />
            ))}
            <Button variant="text" onClick={addBenefit} startIcon={<Add />}>
              Add Benefit
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSavePlan}
            disabled={saving || !planForm.name || !planForm.monthlyPrice}
          >
            {saving ? 'Creating...' : 'Create Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enroll Client Dialog */}
      <Dialog open={enrollDialogOpen} onClose={() => setEnrollDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enroll Client in Membership</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Client</InputLabel>
              <Select
                label="Client"
                value={enrollForm.clientId}
                onChange={(e) => setEnrollForm({ ...enrollForm, clientId: e.target.value })}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Plan</InputLabel>
              <Select
                label="Plan"
                value={enrollForm.planId}
                onChange={(e) => setEnrollForm({ ...enrollForm, planId: e.target.value })}
              >
                {plans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.monthlyPrice}/mo
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Billing Cycle</InputLabel>
              <Select
                label="Billing Cycle"
                value={enrollForm.billingCycle}
                onChange={(e) => setEnrollForm({ ...enrollForm, billingCycle: e.target.value })}
              >
                <MenuItem value="MONTHLY">Monthly</MenuItem>
                <MenuItem value="ANNUAL">Annual</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEnroll}
            disabled={saving || !enrollForm.clientId || !enrollForm.planId}
          >
            {saving ? 'Enrolling...' : 'Enroll'}
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
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </Box>
  );
}
