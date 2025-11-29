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
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Send,
  Phone,
  Email,
  Loyalty,
} from '@mui/icons-material';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferredLanguage: string;
  preferredTechName: string | null;
  marketingOptIn: boolean;
  loyaltyPoints: number;
  loyaltyTier: string;
  totalVisits: number;
  lastVisit: string | null;
  birthday: string | null;
  notes: string | null;
}

const languageLabels: Record<string, string> = {
  en: 'English',
  vi: 'Vietnamese',
  es: 'Spanish',
  zh: 'Chinese',
  ko: 'Korean',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    preferredLanguage: 'en',
    birthday: '',
    notes: '',
    marketingOptIn: true,
  });

  // Message dialog state
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageStatus, setMessageStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    setAnchorEl(event.currentTarget);
    setSelectedClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedClient) {
      setFormData({
        name: selectedClient.name,
        phone: selectedClient.phone,
        email: selectedClient.email || '',
        preferredLanguage: selectedClient.preferredLanguage || 'en',
        birthday: selectedClient.birthday ? selectedClient.birthday.split('T')[0] : '',
        notes: selectedClient.notes || '',
        marketingOptIn: selectedClient.marketingOptIn,
      });
    }
    setEditMode(true);
    setDialogOpen(true);
    handleMenuClose();
  };

  const handleAddNew = () => {
    setSelectedClient(null);
    setEditMode(false);
    setFormData({
      name: '',
      phone: '',
      email: '',
      preferredLanguage: 'en',
      birthday: '',
      notes: '',
      marketingOptIn: true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editMode && selectedClient
        ? `/api/clients/${selectedClient.id}`
        : '/api/clients';

      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to save');
      }

      setDialogOpen(false);
      fetchClients();
    } catch (error) {
      console.error('Failed to save client:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = () => {
    if (selectedClient) {
      setMessageText(`Hi ${selectedClient.name}, `);
      setMessageStatus(null);
      setMessageDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleSendSMS = async () => {
    if (!selectedClient || !messageText) return;

    setSendingMessage(true);
    setMessageStatus(null);
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedClient.phone,
          message: messageText,
          type: 'GENERAL',
        }),
      });

      if (response.ok) {
        setMessageStatus({ type: 'success', text: 'Message sent successfully!' });
        setTimeout(() => {
          setMessageDialogOpen(false);
          setMessageText('');
          setMessageStatus(null);
        }, 2000);
      } else {
        const data = await response.json();
        setMessageStatus({ type: 'error', text: data.error || 'Failed to send message' });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessageStatus({ type: 'error', text: 'Failed to send message' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedClient) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        setSelectedClient(null);
        fetchClients();
      } else {
        const data = await response.json();
        console.error('Delete error:', data.error);
      }
    } catch (error) {
      console.error('Failed to delete client:', error);
    } finally {
      setDeleting(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const tierColors: Record<string, 'default' | 'warning' | 'info' | 'success'> = {
    BRONZE: 'default',
    SILVER: 'info',
    GOLD: 'warning',
    PLATINUM: 'success',
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Clients
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
          Add Client
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Clients</Typography>
              <Typography variant="h4">{clients.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Active (30 days)</Typography>
              <Typography variant="h4">{clients.filter(c => c.totalVisits > 0).length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Loyalty Members</Typography>
              <Typography variant="h4">{clients.filter(c => c.loyaltyPoints > 0).length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Marketing Opt-In</Typography>
              <Typography variant="h4">{clients.filter(c => c.marketingOptIn).length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Search clients by name, phone, or email..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: 400 }}
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
        ) : clients.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No clients found. Add your first client!</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Language</TableCell>
                    <TableCell>Preferred Tech</TableCell>
                    <TableCell>Loyalty</TableCell>
                    <TableCell>Visits</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredClients
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((client) => (
                      <TableRow key={client.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {client.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {client.name}
                              </Typography>
                              {client.marketingOptIn && (
                                <Chip label="Marketing" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="body2">{client.phone}</Typography>
                            </Box>
                            {client.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Email sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                  {client.email}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={languageLabels[client.preferredLanguage] || client.preferredLanguage}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {client.preferredTechName || (
                            <Typography variant="body2" color="text.secondary">
                              None
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              icon={<Loyalty sx={{ fontSize: 14 }} />}
                              label={`${client.loyaltyPoints} pts`}
                              size="small"
                              color={tierColors[client.loyaltyTier]}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{client.totalVisits}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton onClick={(e) => handleMenuOpen(e, client)}>
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredClients.length}
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

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <Edit sx={{ mr: 1, fontSize: 20 }} /> Edit
        </MenuItem>
        <MenuItem onClick={handleSendMessage}>
          <Send sx={{ mr: 1, fontSize: 20 }} /> Send Message
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1, fontSize: 20 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Full Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Phone"
              fullWidth
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Preferred Language</InputLabel>
              <Select
                label="Preferred Language"
                value={formData.preferredLanguage}
                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="vi">Vietnamese</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="zh">Chinese</MenuItem>
                <MenuItem value="ko">Korean</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Birthday"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.birthday}
              onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
            />
            <TextField
              label="Notes"
              multiline
              rows={2}
              fullWidth
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.marketingOptIn}
                  onChange={(e) => setFormData({ ...formData, marketingOptIn: e.target.checked })}
                />
              }
              label="Marketing Opt-In"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.phone}
          >
            {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Add Client'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Message to {selectedClient?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Phone: {selectedClient?.phone}
            </Typography>
            <TextField
              label="Message"
              multiline
              rows={4}
              fullWidth
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message here..."
            />
            {messageStatus && (
              <Alert severity={messageStatus.type} sx={{ mt: 2 }}>
                {messageStatus.text}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={sendingMessage ? <CircularProgress size={16} color="inherit" /> : <Send />}
            onClick={handleSendSMS}
            disabled={sendingMessage || !messageText.trim()}
          >
            {sendingMessage ? 'Sending...' : 'Send SMS'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Client</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedClient?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
