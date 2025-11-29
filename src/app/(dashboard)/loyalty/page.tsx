'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Search,
  CardGiftcard,
  TrendingUp,
  Send,
  AutoAwesome,
  EmojiEvents,
  Add as AddIcon,
  Remove,
  PersonAdd,
} from '@mui/icons-material';
import Autocomplete from '@mui/material/Autocomplete';

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface LoyaltyAccount {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientLanguage: string;
  pointsBalance: number;
  tier: string;
  totalEarned: number;
  totalRedeemed: number;
  lastActivity: string;
}

const tierConfig: Record<string, { color: 'default' | 'info' | 'warning' | 'success'; min: number; max: number }> = {
  BRONZE: { color: 'default', min: 0, max: 500 },
  SILVER: { color: 'info', min: 500, max: 1000 },
  GOLD: { color: 'warning', min: 1000, max: 2000 },
  PLATINUM: { color: 'success', min: 2000, max: 5000 },
};

export default function LoyaltyPage() {
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<LoyaltyAccount | null>(null);
  const [pointsAction, setPointsAction] = useState<'add' | 'redeem'>('add');
  const [pointsAmount, setPointsAmount] = useState(0);
  const [generatedMessage, setGeneratedMessage] = useState('');

  // Add member state
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState(false);

  // Points and messaging state
  const [pointsDescription, setPointsDescription] = useState('');
  const [savingPoints, setSavingPoints] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/loyalty');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch loyalty accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientsWithoutLoyalty = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        // Filter out clients who already have loyalty accounts
        const existingClientIds = accounts.map(a => a.clientId);
        const availableClients = (data.clients || []).filter(
          (c: Client & { id: string }) => !existingClientIds.includes(c.id)
        );
        setClients(availableClients);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleOpenAddMember = () => {
    fetchClientsWithoutLoyalty();
    setSelectedClient(null);
    setAddMemberDialogOpen(true);
  };

  const handleAddMember = async () => {
    if (!selectedClient) return;

    setAddingMember(true);
    try {
      const response = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient.id }),
      });

      if (response.ok) {
        setAddMemberDialogOpen(false);
        setSelectedClient(null);
        fetchAccounts();
      } else {
        const data = await response.json();
        console.error('Failed to add member:', data.error);
      }
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setAddingMember(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!selectedAccount) return;

    setGeneratingMessage(true);
    try {
      const response = await fetch('/api/ai/loyalty-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: selectedAccount.clientName,
          pointsBalance: selectedAccount.pointsBalance,
          tier: selectedAccount.tier,
          offers: ['10% off next visit', 'Free nail art with pedicure'],
          language: selectedAccount.clientLanguage,
          clientId: selectedAccount.clientId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedMessage(data.message);
      }
    } catch (error) {
      console.error('Failed to generate message:', error);
    } finally {
      setGeneratingMessage(false);
    }
  };

  const handleSavePoints = async () => {
    if (!selectedAccount || pointsAmount <= 0) return;

    setSavingPoints(true);
    try {
      const response = await fetch(`/api/loyalty/${selectedAccount.id}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: pointsAction,
          points: pointsAmount,
          description: pointsDescription,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setPointsAmount(0);
        setPointsDescription('');
        fetchAccounts();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update points');
      }
    } catch (error) {
      console.error('Failed to save points:', error);
      alert('Failed to update points');
    } finally {
      setSavingPoints(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedAccount || !generatedMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedAccount.clientPhone,
          message: generatedMessage,
          type: 'LOYALTY',
        }),
      });

      if (response.ok) {
        setMessageDialogOpen(false);
        setGeneratedMessage('');
        alert('Message sent successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const tiers = ['All', 'Bronze', 'Silver', 'Gold', 'Platinum'];

  const filteredAccounts = accounts.filter(
    (account) =>
      (selectedTier === 0 || account.tier === tiers[selectedTier].toUpperCase()) &&
      ((account.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (account.clientPhone || '').includes(searchQuery))
  );

  const totalPoints = accounts.reduce((sum, a) => sum + (a.pointsBalance || 0), 0);
  const totalMembers = accounts.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Loyalty Program
        </Typography>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={handleOpenAddMember}>
          Add Member
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CardGiftcard color="primary" />
                <Typography variant="body2" color="text.secondary">Total Members</Typography>
              </Box>
              <Typography variant="h4">{totalMembers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp color="success" />
                <Typography variant="body2" color="text.secondary">Total Points</Typography>
              </Box>
              <Typography variant="h4">{totalPoints.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <EmojiEvents sx={{ color: '#FFD700' }} />
                <Typography variant="body2" color="text.secondary">Gold+ Members</Typography>
              </Box>
              <Typography variant="h4">
                {accounts.filter(a => ['GOLD', 'PLATINUM'].includes(a.tier)).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Tier Distribution</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.keys(tierConfig).map((tier) => (
                  <Chip
                    key={tier}
                    label={`${tier}: ${accounts.filter(a => a.tier === tier).length}`}
                    size="small"
                    color={tierConfig[tier].color}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedTier} onChange={(_, v) => setSelectedTier(v)}>
            {tiers.map((tier) => (
              <Tab key={tier} label={tier} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Search members..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Tier</TableCell>
                    <TableCell>Points Balance</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Lifetime Stats</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAccounts
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((account) => {
                      const config = tierConfig[account.tier] || tierConfig.BRONZE;
                      const pointsBalance = account.pointsBalance || 0;
                      const progress = Math.min(
                        ((pointsBalance - config.min) / (config.max - config.min)) * 100,
                        100
                      );

                      return (
                        <TableRow key={account.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                {(account.clientName || 'U').charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {account.clientName || 'Unknown'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {account.clientPhone || 'No phone'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={<EmojiEvents sx={{ fontSize: 16 }} />}
                              label={account.tier}
                              size="small"
                              color={config.color}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="h6" color="primary.main">
                              {pointsBalance.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ width: 120 }}>
                              <LinearProgress
                                variant="determinate"
                                value={progress}
                                sx={{ height: 8, borderRadius: 4 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {config.max - pointsBalance} to next tier
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              Earned: {(account.totalEarned || 0).toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Redeemed: {(account.totalRedeemed || 0).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              color="primary"
                              onClick={() => {
                                setSelectedAccount(account);
                                setPointsAction('add');
                                setPointsAmount(0);
                                setPointsDescription('');
                                setDialogOpen(true);
                              }}
                            >
                              <AddIcon />
                            </IconButton>
                            <IconButton
                              color="secondary"
                              onClick={() => {
                                setSelectedAccount(account);
                                setMessageDialogOpen(true);
                                setGeneratedMessage('');
                              }}
                            >
                              <Send />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredAccounts.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </>
        )}
      </Paper>

      {/* Add/Redeem Points Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Points - {selectedAccount?.clientName}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Current Balance: <strong>{(selectedAccount?.pointsBalance || 0).toLocaleString()} points</strong>
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                label="Action"
                value={pointsAction}
                onChange={(e) => setPointsAction(e.target.value as 'add' | 'redeem')}
              >
                <MenuItem value="add">Add Points</MenuItem>
                <MenuItem value="redeem">Redeem Points</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Points"
              type="number"
              fullWidth
              value={pointsAmount}
              onChange={(e) => setPointsAmount(parseInt(e.target.value) || 0)}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={pointsDescription}
              onChange={(e) => setPointsDescription(e.target.value)}
              placeholder="e.g., Service purchase, Birthday bonus, Reward redemption"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSavePoints}
            disabled={savingPoints || pointsAmount <= 0}
            startIcon={savingPoints ? <CircularProgress size={16} /> : (pointsAction === 'add' ? <AddIcon /> : <Remove />)}
          >
            {savingPoints ? 'Saving...' : (pointsAction === 'add' ? 'Add Points' : 'Redeem Points')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Send Loyalty Message - {selectedAccount?.clientName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Generate a personalized loyalty message in the client&apos;s preferred language
              ({selectedAccount?.clientLanguage?.toUpperCase() || 'EN'})
            </Typography>
            <Button
              variant="outlined"
              startIcon={generatingMessage ? <CircularProgress size={16} /> : <AutoAwesome />}
              onClick={handleGenerateMessage}
              disabled={generatingMessage}
              sx={{ mt: 2, mb: 2 }}
            >
              Generate Message
            </Button>
            {generatedMessage && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2">{generatedMessage}</Typography>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!generatedMessage || sendingMessage}
            startIcon={sendingMessage ? <CircularProgress size={16} /> : <Send />}
          >
            {sendingMessage ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onClose={() => setAddMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Loyalty Member</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select a client to enroll in the loyalty program
            </Typography>
            <Autocomplete
              options={clients}
              getOptionLabel={(option) => `${option.name} - ${option.phone}`}
              value={selectedClient}
              onChange={(_, newValue) => setSelectedClient(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Select Client" fullWidth sx={{ mt: 2 }} />
              )}
              noOptionsText="No clients available"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemberDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddMember}
            disabled={!selectedClient || addingMember}
            startIcon={addingMember ? <CircularProgress size={16} /> : <PersonAdd />}
          >
            {addingMember ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
