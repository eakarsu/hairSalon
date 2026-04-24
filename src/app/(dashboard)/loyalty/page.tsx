'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
  Close,
  Edit,
  ArrowUpward,
  ArrowDownward,
  SwapVert,
  AccessTime,
  Delete,
} from '@mui/icons-material';
import Autocomplete from '@mui/material/Autocomplete';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface LoyaltyTransaction {
  id: string;
  type: 'EARN' | 'REDEEM' | 'ADJUST';
  points: number;
  description: string | null;
  createdAt: string;
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

interface LoyaltyAccountDetail extends LoyaltyAccount {
  transactions: LoyaltyTransaction[];
  createdAt: string;
}

const tierConfig: Record<string, { color: 'default' | 'info' | 'warning' | 'success'; min: number; max: number }> = {
  BRONZE: { color: 'default', min: 0, max: 500 },
  SILVER: { color: 'info', min: 500, max: 1000 },
  GOLD: { color: 'warning', min: 1000, max: 2000 },
  PLATINUM: { color: 'success', min: 2000, max: 5000 },
};

const DRAWER_WIDTH = 480;

export default function LoyaltyPage() {
  const { showSuccess, showError, showInfo } = useToast();

  // Main list state
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Points dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pointsAction, setPointsAction] = useState<'add' | 'redeem'>('add');
  const [pointsAmount, setPointsAmount] = useState(0);
  const [pointsDescription, setPointsDescription] = useState('');
  const [savingPoints, setSavingPoints] = useState(false);

  // Message dialog state
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Add member dialog state
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  // Detail drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<LoyaltyAccount | null>(null);
  const [accountDetail, setAccountDetail] = useState<LoyaltyAccountDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit mode inside drawer
  const [editMode, setEditMode] = useState(false);
  const [editTier, setEditTier] = useState('');
  const [editPoints, setEditPoints] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState<string | React.ReactNode>('');
  const [confirmVariant, setConfirmVariant] = useState<'danger' | 'warning' | 'info' | 'success'>('warning');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('Confirm');

  // ===================== DATA FETCHING =====================

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/loyalty');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      } else {
        showError('Failed to load loyalty accounts');
      }
    } catch (error) {
      console.error('Failed to fetch loyalty accounts:', error);
      showError('Failed to load loyalty accounts');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const fetchAccountDetail = useCallback(async (account: LoyaltyAccount) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/loyalty/${account.id}`);
      if (response.ok) {
        const data = await response.json();
        setAccountDetail(data.account || {
          ...account,
          transactions: [],
          createdAt: account.lastActivity,
        });
      } else {
        // If no detail endpoint exists yet, construct from existing data
        setAccountDetail({
          ...account,
          transactions: [],
          createdAt: account.lastActivity,
        });
      }
    } catch {
      // Fallback: construct from existing data if endpoint doesn't exist
      setAccountDetail({
        ...account,
        transactions: [],
        createdAt: account.lastActivity,
      });
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const fetchClientsWithoutLoyalty = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        const existingClientIds = accounts.map(a => a.clientId);
        const availableClients = (data.clients || []).filter(
          (c: Client & { id: string }) => !existingClientIds.includes(c.id)
        );
        setClients(availableClients);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      showError('Failed to load clients');
    }
  };

  // ===================== ROW CLICK / DRAWER =====================

  const handleRowClick = (account: LoyaltyAccount) => {
    setSelectedAccount(account);
    setDrawerOpen(true);
    setEditMode(false);
    fetchAccountDetail(account);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedAccount(null);
    setAccountDetail(null);
    setEditMode(false);
  };

  const handleEditToggle = () => {
    if (selectedAccount) {
      setEditTier(selectedAccount.tier);
      setEditPoints(selectedAccount.pointsBalance);
      setEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleSaveEdit = () => {
    if (!selectedAccount) return;

    const pointsDiff = editPoints - selectedAccount.pointsBalance;
    const tierChanged = editTier !== selectedAccount.tier;

    if (pointsDiff === 0 && !tierChanged) {
      showInfo('No changes to save');
      setEditMode(false);
      return;
    }

    setConfirmTitle('Save Changes');
    setConfirmMessage(
      <Box>
        <Typography variant="body2" gutterBottom>
          Are you sure you want to update this loyalty account?
        </Typography>
        {pointsDiff !== 0 && (
          <Typography variant="body2" color="text.secondary">
            Points: {selectedAccount.pointsBalance.toLocaleString()} {'->'} {editPoints.toLocaleString()}
            ({pointsDiff > 0 ? '+' : ''}{pointsDiff.toLocaleString()})
          </Typography>
        )}
        {tierChanged && (
          <Typography variant="body2" color="text.secondary">
            Tier: {selectedAccount.tier} {'->'} {editTier}
          </Typography>
        )}
      </Box>
    );
    setConfirmVariant('warning');
    setConfirmText('Save Changes');
    setConfirmAction(() => async () => {
      setSavingEdit(true);
      setConfirmLoading(true);
      try {
        const pointsDiff = editPoints - (selectedAccount?.pointsBalance || 0);

        if (pointsDiff !== 0) {
          const action = pointsDiff > 0 ? 'add' : 'redeem';
          const points = Math.abs(pointsDiff);
          const response = await fetch(`/api/loyalty/${selectedAccount?.id}/points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action,
              points,
              description: `Manual adjustment via edit (${action === 'add' ? '+' : '-'}${points})`,
            }),
          });

          if (!response.ok) {
            const data = await response.json();
            showError(data.error || 'Failed to update points');
            return;
          }
        }

        showSuccess('Loyalty account updated successfully');
        setEditMode(false);
        setConfirmOpen(false);
        await fetchAccounts();

        // Refresh the drawer detail
        if (selectedAccount) {
          const updatedAccount = {
            ...selectedAccount,
            pointsBalance: editPoints,
            tier: editTier,
          };
          setSelectedAccount(updatedAccount);
          fetchAccountDetail(updatedAccount);
        }
      } catch (error) {
        console.error('Failed to save edit:', error);
        showError('Failed to update loyalty account');
      } finally {
        setSavingEdit(false);
        setConfirmLoading(false);
      }
    });
    setConfirmOpen(true);
  };

  // ===================== ADD MEMBER =====================

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
        showSuccess(`${selectedClient.name} has been enrolled in the loyalty program`);
        fetchAccounts();
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      showError('Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  // ===================== POINTS MANAGEMENT =====================

  const handleOpenPoints = (account: LoyaltyAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAccount(account);
    setPointsAction('add');
    setPointsAmount(0);
    setPointsDescription('');
    setDialogOpen(true);
  };

  const handleSavePoints = async () => {
    if (!selectedAccount || pointsAmount <= 0) return;

    if (pointsAction === 'redeem' && pointsAmount > selectedAccount.pointsBalance) {
      setConfirmTitle('Insufficient Points');
      setConfirmMessage(
        `${selectedAccount.clientName} only has ${selectedAccount.pointsBalance.toLocaleString()} points. Cannot redeem ${pointsAmount.toLocaleString()} points.`
      );
      setConfirmVariant('warning');
      setConfirmText('OK');
      setConfirmAction(() => () => setConfirmOpen(false));
      setConfirmOpen(true);
      return;
    }

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
        showSuccess(
          pointsAction === 'add'
            ? `${pointsAmount.toLocaleString()} points added to ${selectedAccount.clientName}'s account`
            : `${pointsAmount.toLocaleString()} points redeemed from ${selectedAccount.clientName}'s account`
        );
        await fetchAccounts();

        // Refresh drawer if open
        if (drawerOpen && selectedAccount) {
          fetchAccountDetail(selectedAccount);
        }
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to update points');
      }
    } catch (error) {
      console.error('Failed to save points:', error);
      showError('Failed to update points');
    } finally {
      setSavingPoints(false);
    }
  };

  // ===================== MESSAGING =====================

  const handleOpenMessage = (account: LoyaltyAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAccount(account);
    setMessageDialogOpen(true);
    setGeneratedMessage('');
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
        showSuccess('Message generated successfully');
      } else {
        showError('Failed to generate message');
      }
    } catch (error) {
      console.error('Failed to generate message:', error);
      showError('Failed to generate message');
    } finally {
      setGeneratingMessage(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedAccount || !generatedMessage) return;

    setConfirmTitle('Send Loyalty Message');
    setConfirmMessage(
      <Box>
        <Typography variant="body2" gutterBottom>
          Send this message to <strong>{selectedAccount.clientName}</strong> ({selectedAccount.clientPhone})?
        </Typography>
        <Paper variant="outlined" sx={{ p: 1.5, mt: 1, bgcolor: 'grey.50' }}>
          <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap' }}>
            {generatedMessage.substring(0, 200)}{generatedMessage.length > 200 ? '...' : ''}
          </Typography>
        </Paper>
      </Box>
    );
    setConfirmVariant('info');
    setConfirmText('Send Message');
    setConfirmAction(() => async () => {
      setSendingMessage(true);
      setConfirmLoading(true);
      try {
        const response = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedAccount?.clientPhone,
            message: generatedMessage,
            type: 'LOYALTY',
          }),
        });

        if (response.ok) {
          setMessageDialogOpen(false);
          setGeneratedMessage('');
          setConfirmOpen(false);
          showSuccess('Loyalty message sent successfully');
        } else {
          const data = await response.json();
          showError(data.error || 'Failed to send message');
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        showError('Failed to send message');
      } finally {
        setSendingMessage(false);
        setConfirmLoading(false);
      }
    });
    setConfirmOpen(true);
  };

  // ===================== DELETE MEMBER =====================

  const handleDeleteMember = () => {
    if (!selectedAccount) return;

    setConfirmTitle('Remove Loyalty Member');
    setConfirmMessage(
      `Are you sure you want to remove ${selectedAccount.clientName} from the loyalty program? This will delete their account with ${selectedAccount.pointsBalance.toLocaleString()} points. This action cannot be undone.`
    );
    setConfirmVariant('danger');
    setConfirmText('Remove Member');
    setConfirmAction(() => async () => {
      setConfirmLoading(true);
      try {
        const response = await fetch(`/api/loyalty/${selectedAccount?.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          showSuccess(`${selectedAccount?.clientName} has been removed from the loyalty program`);
          handleCloseDrawer();
          setConfirmOpen(false);
          fetchAccounts();
        } else {
          const data = await response.json();
          showError(data.error || 'Failed to remove member');
        }
      } catch (error) {
        console.error('Failed to delete member:', error);
        showError('Failed to remove member');
      } finally {
        setConfirmLoading(false);
      }
    });
    setConfirmOpen(true);
  };

  // ===================== FILTERING / STATS =====================

  const tiers = ['All', 'Bronze', 'Silver', 'Gold', 'Platinum'];

  const filteredAccounts = accounts.filter(
    (account) =>
      (selectedTier === 0 || account.tier === tiers[selectedTier].toUpperCase()) &&
      ((account.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (account.clientPhone || '').includes(searchQuery))
  );

  const totalPoints = accounts.reduce((sum, a) => sum + (a.pointsBalance || 0), 0);
  const totalMembers = accounts.length;

  // ===================== TRANSACTION ICON HELPER =====================

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'EARN':
        return <ArrowUpward sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'REDEEM':
        return <ArrowDownward sx={{ color: 'error.main', fontSize: 20 }} />;
      case 'ADJUST':
        return <SwapVert sx={{ color: 'info.main', fontSize: 20 }} />;
      default:
        return <SwapVert sx={{ fontSize: 20 }} />;
    }
  };

  // ===================== RENDER =====================

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
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
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
                      <TableRow
                        key={account.id}
                        hover
                        onClick={() => handleRowClick(account)}
                        sx={{ cursor: 'pointer' }}
                      >
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
                              {config.max - pointsBalance > 0
                                ? `${(config.max - pointsBalance).toLocaleString()} to next tier`
                                : 'Max tier reached'}
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
                            onClick={(e) => handleOpenPoints(account, e)}
                          >
                            <AddIcon />
                          </IconButton>
                          <IconButton
                            color="secondary"
                            onClick={(e) => handleOpenMessage(account, e)}
                          >
                            <Send />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {filteredAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {searchQuery
                          ? 'No members match your search'
                          : 'No loyalty members yet. Add your first member to get started.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
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
        </Paper>
      )}

      {/* ==================== DETAIL DRAWER ==================== */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: { width: { xs: '100%', sm: DRAWER_WIDTH } },
        }}
      >
        {selectedAccount && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={600}>
                Loyalty Account
              </Typography>
              <Box>
                {!editMode && (
                  <IconButton onClick={handleEditToggle} color="primary" size="small" sx={{ mr: 0.5 }}>
                    <Edit />
                  </IconButton>
                )}
                <IconButton onClick={handleCloseDrawer} size="small">
                  <Close />
                </IconButton>
              </Box>
            </Box>

            {loadingDetail ? (
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {/* Member Info Section */}
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        bgcolor: 'primary.main',
                        fontSize: 28,
                      }}
                    >
                      {(selectedAccount.clientName || 'U').charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {selectedAccount.clientName || 'Unknown'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedAccount.clientPhone || 'No phone'}
                      </Typography>
                      {selectedAccount.clientLanguage && (
                        <Typography variant="caption" color="text.secondary">
                          Language: {selectedAccount.clientLanguage.toUpperCase()}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Tier & Points Section */}
                  {editMode ? (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
                      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                        Edit Account
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Tier</InputLabel>
                          <Select
                            label="Tier"
                            value={editTier}
                            onChange={(e) => setEditTier(e.target.value)}
                          >
                            <MenuItem value="BRONZE">Bronze</MenuItem>
                            <MenuItem value="SILVER">Silver</MenuItem>
                            <MenuItem value="GOLD">Gold</MenuItem>
                            <MenuItem value="PLATINUM">Platinum</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          label="Points Balance"
                          type="number"
                          size="small"
                          fullWidth
                          value={editPoints}
                          onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={handleSaveEdit}
                            disabled={savingEdit}
                            startIcon={savingEdit ? <CircularProgress size={16} /> : null}
                          >
                            {savingEdit ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            size="small"
                            onClick={handleCancelEdit}
                            disabled={savingEdit}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  ) : (
                    <Box sx={{ mb: 2 }}>
                      {/* Tier Badge */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Chip
                          icon={<EmojiEvents sx={{ fontSize: 18 }} />}
                          label={selectedAccount.tier}
                          color={(tierConfig[selectedAccount.tier] || tierConfig.BRONZE).color}
                        />
                      </Box>

                      {/* Points Cards */}
                      <Grid container spacing={1.5} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Balance</Typography>
                            <Typography variant="h6" color="primary.main" fontWeight={700}>
                              {(selectedAccount.pointsBalance || 0).toLocaleString()}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Earned</Typography>
                            <Typography variant="h6" color="success.main" fontWeight={700}>
                              {(selectedAccount.totalEarned || 0).toLocaleString()}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary">Redeemed</Typography>
                            <Typography variant="h6" color="error.main" fontWeight={700}>
                              {(selectedAccount.totalRedeemed || 0).toLocaleString()}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* Progress to Next Tier */}
                      {(() => {
                        const config = tierConfig[selectedAccount.tier] || tierConfig.BRONZE;
                        const balance = selectedAccount.pointsBalance || 0;
                        const progress = Math.min(
                          ((balance - config.min) / (config.max - config.min)) * 100,
                          100
                        );
                        return (
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                Progress to Next Tier
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {Math.round(progress)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {config.max - balance > 0
                                ? `${(config.max - balance).toLocaleString()} points to reach next tier`
                                : 'Top tier reached'}
                            </Typography>
                          </Box>
                        );
                      })()}

                      {/* Quick Actions */}
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={(e) => handleOpenPoints(selectedAccount, e)}
                        >
                          Add Points
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          startIcon={<Send />}
                          onClick={(e) => handleOpenMessage(selectedAccount, e)}
                        >
                          Send Message
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>

                <Divider />

                {/* Transactions Section */}
                <Box sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Transaction History
                  </Typography>

                  {accountDetail?.transactions && accountDetail.transactions.length > 0 ? (
                    <List disablePadding>
                      {accountDetail.transactions.map((tx) => (
                        <ListItem
                          key={tx.id}
                          disableGutters
                          sx={{
                            py: 1,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {getTransactionIcon(tx.type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" fontWeight={500}>
                                  {tx.type === 'EARN' ? 'Earned' : tx.type === 'REDEEM' ? 'Redeemed' : 'Adjusted'}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  color={tx.type === 'EARN' ? 'success.main' : tx.type === 'REDEEM' ? 'error.main' : 'info.main'}
                                >
                                  {tx.type === 'EARN' ? '+' : tx.type === 'REDEEM' ? '-' : ''}{tx.points.toLocaleString()} pts
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {tx.description || 'No description'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <AccessTime sx={{ fontSize: 12 }} />
                                  {new Date(tx.createdAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ py: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No transactions yet
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Divider />

                {/* Account Metadata */}
                <Box sx={{ p: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Account Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Account ID</Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {selectedAccount.id.substring(0, 16)}...
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Last Activity</Typography>
                      <Typography variant="caption">
                        {selectedAccount.lastActivity
                          ? new Date(selectedAccount.lastActivity).toLocaleDateString()
                          : 'N/A'}
                      </Typography>
                    </Box>
                    {accountDetail?.createdAt && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">Member Since</Typography>
                        <Typography variant="caption">
                          {new Date(accountDetail.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Divider />

                {/* Danger Zone */}
                <Box sx={{ p: 3 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<Delete />}
                    onClick={handleDeleteMember}
                    fullWidth
                  >
                    Remove from Loyalty Program
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Drawer>

      {/* ==================== ADD/REDEEM POINTS DIALOG ==================== */}
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

      {/* ==================== AI MESSAGE DIALOG ==================== */}
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

      {/* ==================== ADD MEMBER DIALOG ==================== */}
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

      {/* ==================== CONFIRM DIALOG ==================== */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        variant={confirmVariant}
        confirmText={confirmText}
        loading={confirmLoading}
        onConfirm={() => {
          if (confirmAction) confirmAction();
        }}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirmOpen(false);
            setConfirmAction(null);
          }
        }}
      />
    </Box>
  );
}
