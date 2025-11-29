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
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  PlayArrow,
  Pause,
  Campaign,
  Email,
  Sms,
  Send,
  TrendingUp,
} from '@mui/icons-material';

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

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
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
      fetchCampaigns();
    } catch (error) {
      console.error('Failed to save campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = ['All', 'Active', 'Paused', 'Completed'];
  const filteredCampaigns = selectedTab === 0
    ? campaigns
    : campaigns.filter(c => c.status === tabs[selectedTab].toUpperCase());

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sentMessages || c.totalMessages || 0), 0);
  const avgOpenRate = campaigns.length > 0
    ? Math.round(campaigns.reduce((sum, c) => sum + (c.openRate || 0), 0) / campaigns.length)
    : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Campaigns
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenDialog}>
          Create Campaign
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Campaign color="primary" />
                <Typography variant="body2" color="text.secondary">Active Campaigns</Typography>
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
                <Typography variant="body2" color="text.secondary">Messages Sent</Typography>
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
                <Typography variant="body2" color="text.secondary">Avg Open Rate</Typography>
              </Box>
              <Typography variant="h4">{avgOpenRate}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Channels</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip icon={<Sms sx={{ fontSize: 16 }} />} label="SMS" size="small" />
                <Chip icon={<Email sx={{ fontSize: 16 }} />} label="Email" size="small" />
              </Box>
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
                  <TableCell>Campaign</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Open Rate</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCampaigns.map((campaign) => {
                  const sent = campaign.sentMessages || campaign.totalMessages || 0;
                  const total = campaign.totalMessages || 0;
                  const progress = total > 0 ? (sent / total) * 100 : 0;
                  const openRate = campaign.openRate || 0;

                  return (
                    <TableRow key={campaign.id} hover>
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
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit />
                        </IconButton>
                        {campaign.status === 'ACTIVE' ? (
                          <IconButton size="small" color="warning">
                            <Pause />
                          </IconButton>
                        ) : campaign.status === 'PAUSED' ? (
                          <IconButton size="small" color="success">
                            <PlayArrow />
                          </IconButton>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

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
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
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
    </Box>
  );
}
