'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
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
  List,
  ListItem,
  ListItemText,
  InputAdornment,
  Drawer,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CardGiftcard,
  LocalOffer,
  People,
  Close,
  AccessTime,
  AttachMoney,
} from '@mui/icons-material';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { CardsSkeleton } from '@/components/LoadingSkeleton';

interface PackageService {
  id: string;
  serviceId: string;
  service: { id: string; name: string; basePrice: number; durationMinutes: number };
  quantity: number;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  validDays: number;
  services: PackageService[];
  sales: { id: string; client: { id: string; name: string }; expiresAt: string }[];
  regularPrice: number;
  savings: number;
  savingsPercent: string;
}

interface Service {
  id: string;
  name: string;
  basePrice: number;
}

const DRAWER_WIDTH = 420;

export default function PackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPackage, setDrawerPackage] = useState<ServicePackage | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<ServicePackage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    validDays: 365,
    services: [] as { serviceId: string; quantity: number }[],
  });
  const [sellData, setSellData] = useState({
    packageId: '',
    clientId: '',
  });

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchPackages();
    fetchServices();
    fetchClients();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/packages');
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages || []);
      } else {
        showError('Failed to load packages');
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      showError('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
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

  // --- Drawer handlers ---
  const handleRowClick = (pkg: ServicePackage) => {
    setDrawerPackage(pkg);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setDrawerPackage(null);
  };

  const handleDrawerEdit = () => {
    if (drawerPackage) {
      handleOpenDialog(drawerPackage);
      handleDrawerClose();
    }
  };

  const handleDrawerDelete = () => {
    if (drawerPackage) {
      setPackageToDelete(drawerPackage);
      setConfirmDeleteOpen(true);
    }
  };

  // --- Create / Edit dialog handlers ---
  const handleOpenDialog = (pkg?: ServicePackage) => {
    if (pkg) {
      setSelectedPackage(pkg);
      setFormData({
        name: pkg.name,
        description: pkg.description || '',
        price: pkg.price,
        validDays: pkg.validDays,
        services: pkg.services.map((s) => ({ serviceId: s.serviceId, quantity: s.quantity })),
      });
    } else {
      setSelectedPackage(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        validDays: 365,
        services: [],
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = selectedPackage ? `/api/packages/${selectedPackage.id}` : '/api/packages';
      const method = selectedPackage ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save');

      setDialogOpen(false);
      showSuccess(selectedPackage ? 'Package updated successfully' : 'Package created successfully');
      fetchPackages();
    } catch (error) {
      console.error('Failed to save package:', error);
      showError('Failed to save package. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // --- Delete handler ---
  const handleDelete = async () => {
    if (!packageToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/packages/${packageToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      showSuccess(`"${packageToDelete.name}" deleted successfully`);
      setConfirmDeleteOpen(false);
      setPackageToDelete(null);
      handleDrawerClose();
      fetchPackages();
    } catch (error) {
      console.error('Failed to delete package:', error);
      showError('Failed to delete package. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // --- Sell handler ---
  const handleSell = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellData),
      });

      if (!response.ok) throw new Error('Failed to sell package');

      setSellDialogOpen(false);
      setSellData({ packageId: '', clientId: '' });
      showSuccess('Package sold successfully!');
      fetchPackages();
    } catch (error) {
      console.error('Failed to sell package:', error);
      showError('Failed to sell package. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // --- Package service form helpers ---
  const addServiceToPackage = () => {
    setFormData({
      ...formData,
      services: [...formData.services, { serviceId: '', quantity: 1 }],
    });
  };

  const removeServiceFromPackage = (index: number) => {
    setFormData({
      ...formData,
      services: formData.services.filter((_, i) => i !== index),
    });
  };

  const updatePackageService = (index: number, field: string, value: string | number) => {
    const updated = [...formData.services];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, services: updated });
  };

  // Calculate suggested price based on services
  const suggestedPrice =
    formData.services.reduce((sum, s) => {
      const service = services.find((svc) => svc.id === s.serviceId);
      return sum + (service?.basePrice || 0) * s.quantity;
    }, 0) * 0.85; // 15% discount

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Service Packages
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Create Package
        </Button>
      </Box>

      {/* Stats Cards */}
      {loading ? (
        <Box sx={{ mb: 3 }}>
          <CardsSkeleton count={3} />
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CardGiftcard color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Active Packages
                  </Typography>
                </Box>
                <Typography variant="h4">{packages.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <People color="success" />
                  <Typography variant="body2" color="text.secondary">
                    Packages Sold
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {packages.reduce((sum, p) => sum + p.sales.length, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocalOffer color="info" />
                  <Typography variant="body2" color="text.secondary">
                    Avg. Savings
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {packages.length > 0
                    ? Math.round(
                        packages.reduce((sum, p) => sum + parseFloat(p.savingsPercent), 0) /
                          packages.length
                      )
                    : 0}
                  %
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Package Cards */}
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <CardsSkeleton count={6} />
        ) : (
          <Grid container spacing={3}>
            {packages.map((pkg) => (
              <Grid key={pkg.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                      borderColor: 'primary.main',
                    },
                  }}
                  onClick={() => handleRowClick(pkg)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">{pkg.name}</Typography>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(pkg);
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </Box>
                    </Box>
                    {pkg.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {pkg.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
                      <Typography variant="h4" color="primary">
                        ${pkg.price.toFixed(2)}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textDecoration: 'line-through' }}
                      >
                        ${pkg.regularPrice.toFixed(2)}
                      </Typography>
                      <Chip label={`Save ${pkg.savingsPercent}%`} color="success" size="small" />
                    </Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Includes:
                    </Typography>
                    <List dense>
                      {pkg.services.map((s) => (
                        <ListItem key={s.id} sx={{ py: 0 }}>
                          <ListItemText
                            primary={`${s.quantity}x ${s.service.name}`}
                            secondary={`$${(s.service.basePrice * s.quantity).toFixed(2)} value`}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Typography variant="caption" color="text.secondary">
                      Valid for {pkg.validDays} days &bull; {pkg.sales.length} sold
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSellData({ ...sellData, packageId: pkg.id });
                        setSellDialogOpen(true);
                      }}
                    >
                      Sell Package
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {packages.length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  No packages created yet. Create your first package to start selling!
                </Typography>
              </Grid>
            )}
          </Grid>
        )}
      </Paper>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{ sx: { width: { xs: '100%', sm: DRAWER_WIDTH }, p: 0 } }}
      >
        {drawerPackage && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography variant="h6" fontWeight={600}>
                Package Details
              </Typography>
              <IconButton onClick={handleDrawerClose} size="small">
                <Close />
              </IconButton>
            </Box>

            {/* Drawer Body */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {/* Name */}
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {drawerPackage.name}
              </Typography>

              {/* Description */}
              {drawerPackage.description && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {drawerPackage.description}
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Price */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AttachMoney color="primary" />
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: 80 }}>
                  Price
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h5" color="primary" fontWeight={600}>
                    ${drawerPackage.price.toFixed(2)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textDecoration: 'line-through' }}
                  >
                    ${drawerPackage.regularPrice.toFixed(2)}
                  </Typography>
                  <Chip
                    label={`Save ${drawerPackage.savingsPercent}%`}
                    color="success"
                    size="small"
                  />
                </Box>
              </Box>

              {/* Valid Days */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccessTime color="action" />
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: 80 }}>
                  Valid Days
                </Typography>
                <Typography variant="body1">{drawerPackage.validDays} days</Typography>
              </Box>

              {/* Sales Count */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <People color="action" />
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: 80 }}>
                  Sold
                </Typography>
                <Typography variant="body1">{drawerPackage.sales.length} times</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Included Services */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Included Services
              </Typography>
              <List dense disablePadding>
                {drawerPackage.services.map((s) => (
                  <ListItem
                    key={s.id}
                    sx={{
                      py: 1,
                      px: 1.5,
                      mb: 0.5,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={500}>
                          {s.quantity}x {s.service.name}
                        </Typography>
                      }
                      secondary={`$${s.service.basePrice.toFixed(2)} each | $${(s.service.basePrice * s.quantity).toFixed(2)} total value`}
                    />
                  </ListItem>
                ))}
              </List>

              {/* Sales History (if any) */}
              {drawerPackage.sales.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    Recent Sales
                  </Typography>
                  <List dense disablePadding>
                    {drawerPackage.sales.slice(0, 5).map((sale) => (
                      <ListItem key={sale.id} sx={{ py: 0.5, px: 1.5 }}>
                        <ListItemText
                          primary={sale.client.name}
                          secondary={`Expires: ${new Date(sale.expiresAt).toLocaleDateString()}`}
                        />
                      </ListItem>
                    ))}
                    {drawerPackage.sales.length > 5 && (
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 1.5 }}>
                        +{drawerPackage.sales.length - 5} more
                      </Typography>
                    )}
                  </List>
                </>
              )}
            </Box>

            {/* Drawer Footer / Actions */}
            <Box
              sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                gap: 1.5,
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Package"
        message={
          packageToDelete
            ? `Are you sure you want to delete "${packageToDelete.name}"? This action cannot be undone.${
                packageToDelete.sales.length > 0
                  ? ` This package has ${packageToDelete.sales.length} active sale(s).`
                  : ''
              }`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setPackageToDelete(null);
        }}
      />

      {/* Create/Edit Package Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedPackage ? 'Edit Package' : 'Create Package'}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Package Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Price"
                  type="number"
                  fullWidth
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText={
                    suggestedPrice > 0 ? `Suggested: $${suggestedPrice.toFixed(2)} (15% off)` : ''
                  }
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Valid Days"
                  type="number"
                  fullWidth
                  value={formData.validDays}
                  onChange={(e) =>
                    setFormData({ ...formData, validDays: parseInt(e.target.value) })
                  }
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              Services Included
            </Typography>
            {formData.services.map((s, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl sx={{ flex: 2 }}>
                  <InputLabel>Service</InputLabel>
                  <Select
                    label="Service"
                    value={s.serviceId}
                    onChange={(e) => updatePackageService(index, 'serviceId', e.target.value)}
                  >
                    {services.map((service) => (
                      <MenuItem key={service.id} value={service.id}>
                        {service.name} - ${service.basePrice.toFixed(2)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Qty"
                  type="number"
                  sx={{ flex: 1 }}
                  value={s.quantity}
                  onChange={(e) => updatePackageService(index, 'quantity', parseInt(e.target.value))}
                  inputProps={{ min: 1 }}
                />
                <IconButton color="error" onClick={() => removeServiceFromPackage(index)}>
                  <Delete />
                </IconButton>
              </Box>
            ))}
            <Button variant="outlined" onClick={addServiceToPackage} startIcon={<Add />}>
              Add Service
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.name || formData.services.length === 0}
          >
            {saving ? 'Saving...' : 'Save Package'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sell Package Dialog */}
      <Dialog
        open={sellDialogOpen}
        onClose={() => setSellDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Sell Package</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Client</InputLabel>
              <Select
                label="Client"
                value={sellData.clientId}
                onChange={(e) => setSellData({ ...sellData, clientId: e.target.value })}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {sellData.packageId && (
              <Typography>
                Price: ${packages.find((p) => p.id === sellData.packageId)?.price.toFixed(2)}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSellDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSell}
            disabled={saving || !sellData.clientId}
          >
            {saving ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
