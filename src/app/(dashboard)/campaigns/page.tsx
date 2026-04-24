'use client';

import { useState, useEffect, useCallback } from 'react';
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
  LinearProgress,
  Drawer,
  Divider,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Pause,
  Campaign,
  Email,
  Sms,
  Send,
  TrendingUp,
  Close,
  DeleteSweep,
} from '@mui/icons-material';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

interface CampaignData {
  id: string;
  name: string;
  type: string;
  status: string;
  totalMessages?: number;
  sentMessages?: number;
  pendingMessages?: number;
  openRate?: number;
  channel?: string;
  targetAudience?: string;
  messageTemplate?: string;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  REMINDER: 'Appointment Reminder',
  NO_SHOW_RECOVERY: 'No-Show Recovery',
  LOYALTY: 'Loyalty Program',
  PROMO: 'Promotion',
};

const statusColors: Record<string, 'success' | 'warning' | 'default'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  COMPLETED: 'default',
};

const audienceLabels: Record<string, string> = {
  ALL: 'All Clients',
  LOYALTY: 'Loyalty Members',
  GOLD_PLATINUM: 'Gold & Platinum Tier',
  INACTIVE: 'Inactive (30+ days)',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignData | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'PROMO',
    channel: 'SMS',
    targetAudience: 'ALL',
    messageTemplate: '',
  });

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCampaign, setDrawerCampaign] = useState<CampaignData | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'single' | 'bulk'>('single');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showSuccess, showError } = useToast();

  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await fetch('/api/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } else {
        showError('Failed to fetch campaigns');
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      showError('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // ---------- Create / Edit Dialog ----------

  const handleOpenCreateDialog = () => {
    setSelectedCampaign(null);
    setFormData({
      name: '',
      type: 'PROMO',
      channel: 'SMS',
      targetAudience: 'ALL',
      messageTemplate: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (campaign: CampaignData) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      type: campaign.type,
      channel: campaign.channel || 'SMS',
      targetAudience: campaign.targetAudience || 'ALL',
      messageTemplate: campaign.messageTemplate || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save');

      setDialogOpen(false);
      showSuccess(selectedCampaign ? 'Campaign updated successfully' : 'Campaign created successfully');
      fetchCampaigns();
    } catch (error) {
      console.error('Failed to save campaign:', error);
      showError('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Detail Drawer ----------

  const handleRowClick = (campaign: CampaignData) => {
    setDrawerCampaign(campaign);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setDrawerCampaign(null);
  };

  const handleDrawerEdit = () => {
    if (drawerCampaign) {
      handleOpenEditDialog(drawerCampaign);
      handleDrawerClose();
    }
  };

  const handleDrawerDelete = () => {
    if (drawerCampaign) {
      setDeleteTargetId(drawerCampaign.id);
      setConfirmAction('single');
      setConfirmOpen(true);
    }
  };

  // ---------- Single Delete ----------

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (confirmAction === 'single' && deleteTargetId) {
        const response = await fetch('/api/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [deleteTargetId], type: 'campaigns' }),
        });
        if (!response.ok) throw new Error('Failed to delete');
        showSuccess('Campaign deleted successfully');
        if (drawerCampaign?.id === deleteTargetId) {
          handleDrawerClose();
        }
      } else if (confirmAction === 'bulk') {
        const ids = Array.from(selectedIds);
        const response = await fetch('/api/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, type: 'campaigns' }),
        });
        if (!response.ok) throw new Error('Failed to delete');
        const data = await response.json();
        showSuccess(`${data.deletedCount} campaign(s) deleted successfully`);
        setSelectedIds(new Set());
        if (drawerCampaign && ids.includes(drawerCampaign.id)) {
          handleDrawerClose();
        }
      }
      setConfirmOpen(false);
      setDeleteTargetId(null);
      fetchCampaigns();
    } catch (error) {
      console.error('Delete failed:', error);
      showError('Failed to delete campaign(s)');
    } finally {
      setDeleting(false);
    }
  };

  // ---------- Bulk Selection ----------

  const handleToggleSelect = (id: string) => {
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

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredCampaigns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCampaigns.map((c) => c.id)));
    }
  };

  const handleBulkDelete = () => {
    setConfirmAction('bulk');
    setConfirmOpen(true);
  };

  // ---------- Derived data ----------

  const tabs = ['All', 'Active', 'Paused', 'Completed'];
  const filteredCampaigns =
    selectedTab === 0
      ? campaigns
      : campaigns.filter((c) => c.status === tabs[selectedTab].toUpperCase());

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const totalSent = campaigns.reduce(
    (sum, c) => sum + (c.sentMessages || c.totalMessages || 0),
    0,
  );
  const avgOpenRate =
    campaigns.length > 0
      ? Math.round(
          campaigns.reduce((sum, c) => sum + (c.openRate || 0), 0) / campaigns.length,
        )
      : 0;

  // ---------- Render ----------

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Campaigns
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selectedIds.size > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweep />}
              onClick={handleBulkDelete}
            >
              Delete ({selectedIds.size})
            </Button>
          )}
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreateDialog}>
            Create Campaign
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
                  <Campaign color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Active Campaigns
                  </Typography>
                </Box>
                <Typography variant="h4">{activeCampaigns}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Send color="success" />
                  <Typography variant="body2" color="text.secondary">
                    Messages Sent
                  </Typography>
                </Box>
                <Typography variant="h4">{totalSent.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TrendingUp color="info" />
                  <Typography variant="body2" color="text.secondary">
                    Avg Open Rate
                  </Typography>
                </Box>
                <Typography variant="h4">{avgOpenRate}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Channels
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip icon={<Sms sx={{ fontSize: 16 }} />} label="SMS" size="small" />
                  <Chip icon={<Email sx={{ fontSize: 16 }} />} label="Email" size="small" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} columns={7} />
      ) : (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
              {tabs.map((tab) => (
                <Tab key={tab} label={tab} />
              ))}
            </Tabs>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedIds.size > 0 && selectedIds.size < filteredCampaigns.length
                      }
                      checked={
                        filteredCampaigns.length > 0 &&
                        selectedIds.size === filteredCampaigns.length
                      }
                      onChange={handleToggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Campaign</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Open Rate</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No campaigns found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => {
                    const sent = campaign.sentMessages || campaign.totalMessages || 0;
                    const total = campaign.totalMessages || 0;
                    const progress = total > 0 ? (sent / total) * 100 : 0;
                    const openRate = campaign.openRate || 0;
                    const isSelected = selectedIds.has(campaign.id);

                    return (
                      <TableRow
                        key={campaign.id}
                        hover
                        selected={isSelected}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleRowClick(campaign)}
                      >
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleToggleSelect(campaign.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {campaign.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created {new Date(campaign.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={typeLabels[campaign.type] || campaign.type}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={campaign.status}
                            size="small"
                            color={statusColors[campaign.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ width: 150 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">
                                {sent}/{total}
                              </Typography>
                              <Typography variant="caption">{Math.round(progress)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            color={openRate > 70 ? 'success.main' : 'text.primary'}
                          >
                            {openRate}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditDialog(campaign)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          {campaign.status === 'ACTIVE' ? (
                            <Tooltip title="Pause">
                              <IconButton size="small" color="warning">
                                <Pause />
                              </IconButton>
                            </Tooltip>
                          ) : campaign.status === 'PAUSED' ? (
                            <Tooltip title="Resume">
                              <IconButton size="small" color="success">
                                <PlayArrow />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setDeleteTargetId(campaign.id);
                                setConfirmAction('single');
                                setConfirmOpen(true);
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
      >
        {drawerCampaign && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 3,
                py: 2,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Campaign Details
              </Typography>
              <IconButton onClick={handleDrawerClose} size="small">
                <Close />
              </IconButton>
            </Box>

            {/* Drawer Body */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
              {/* Name & Status */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  {drawerCampaign.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={drawerCampaign.status}
                    size="small"
                    color={statusColors[drawerCampaign.status] || 'default'}
                  />
                  <Chip
                    label={typeLabels[drawerCampaign.type] || drawerCampaign.type}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Details Grid */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body1">
                    {typeLabels[drawerCampaign.type] || drawerCampaign.type}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Channel
                  </Typography>
                  <Typography variant="body1">
                    {drawerCampaign.channel || 'SMS'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Target Audience
                  </Typography>
                  <Typography variant="body1">
                    {audienceLabels[drawerCampaign.targetAudience || 'ALL'] ||
                      drawerCampaign.targetAudience}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1">
                    {new Date(drawerCampaign.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Typography>
                </Box>

                <Divider />

                {/* Progress */}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Messages Progress
                  </Typography>
                  {(() => {
                    const sent =
                      drawerCampaign.sentMessages || drawerCampaign.totalMessages || 0;
                    const total = drawerCampaign.totalMessages || 0;
                    const progress = total > 0 ? (sent / total) * 100 : 0;
                    return (
                      <Box sx={{ mt: 0.5 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mb: 0.5,
                          }}
                        >
                          <Typography variant="body2">
                            {sent} / {total} sent
                          </Typography>
                          <Typography variant="body2">{Math.round(progress)}%</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    );
                  })()}
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Open Rate
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={500}
                    color={
                      (drawerCampaign.openRate || 0) > 70
                        ? 'success.main'
                        : 'text.primary'
                    }
                  >
                    {drawerCampaign.openRate || 0}%
                  </Typography>
                </Box>

                {drawerCampaign.messageTemplate && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Message Template
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {drawerCampaign.messageTemplate}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Drawer Footer */}
            <Box
              sx={{
                px: 3,
                py: 2,
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                gap: 1,
              }}
            >
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={handleDrawerEdit}
                fullWidth
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDrawerDelete}
                fullWidth
              >
                Delete
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Create/Edit Campaign Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCampaign ? 'Edit Campaign' : 'Create Campaign'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Campaign Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Campaign Type</InputLabel>
              <Select
                label="Campaign Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="REMINDER">Appointment Reminder</MenuItem>
                <MenuItem value="NO_SHOW_RECOVERY">No-Show Recovery</MenuItem>
                <MenuItem value="LOYALTY">Loyalty Program</MenuItem>
                <MenuItem value="PROMO">Promotion</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Channel</InputLabel>
              <Select
                label="Channel"
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              >
                <MenuItem value="SMS">SMS</MenuItem>
                <MenuItem value="EMAIL">Email</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Target Audience</InputLabel>
              <Select
                label="Target Audience"
                value={formData.targetAudience}
                onChange={(e) =>
                  setFormData({ ...formData, targetAudience: e.target.value })
                }
              >
                <MenuItem value="ALL">All Clients</MenuItem>
                <MenuItem value="LOYALTY">Loyalty Members</MenuItem>
                <MenuItem value="GOLD_PLATINUM">Gold & Platinum Tier</MenuItem>
                <MenuItem value="INACTIVE">Inactive (30+ days)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Message Template"
              fullWidth
              multiline
              rows={3}
              value={formData.messageTemplate}
              onChange={(e) =>
                setFormData({ ...formData, messageTemplate: e.target.value })
              }
              placeholder="Use {name}, {service}, {date} as placeholders..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.name}
          >
            {saving ? 'Saving...' : selectedCampaign ? 'Save Changes' : 'Create Campaign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmAction === 'bulk' ? 'Delete Selected Campaigns' : 'Delete Campaign'}
        message={
          confirmAction === 'bulk'
            ? `Are you sure you want to delete ${selectedIds.size} selected campaign(s)? This action cannot be undone.`
            : 'Are you sure you want to delete this campaign? This action cannot be undone.'
        }
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTargetId(null);
        }}
      />
    </Box>
  );
}
