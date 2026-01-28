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
  List,
  ListItem,
  ListItemText,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CardGiftcard,
  LocalOffer,
  People,
} from '@mui/icons-material';

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

export default function PackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
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
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
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

  const handleOpenDialog = (pkg?: ServicePackage) => {
    if (pkg) {
      setSelectedPackage(pkg);
      setFormData({
        name: pkg.name,
        description: pkg.description || '',
        price: pkg.price,
        validDays: pkg.validDays,
        services: pkg.services.map(s => ({ serviceId: s.serviceId, quantity: s.quantity })),
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
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save');

      setDialogOpen(false);
      fetchPackages();
    } catch (error) {
      console.error('Failed to save package:', error);
    } finally {
      setSaving(false);
    }
  };

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
      fetchPackages();
    } catch (error) {
      console.error('Failed to sell package:', error);
    } finally {
      setSaving(false);
    }
  };

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
  const suggestedPrice = formData.services.reduce((sum, s) => {
    const service = services.find(svc => svc.id === s.serviceId);
    return sum + (service?.basePrice || 0) * s.quantity;
  }, 0) * 0.85; // 15% discount

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Service Packages
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Create Package
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CardGiftcard color="primary" />
                <Typography variant="body2" color="text.secondary">Active Packages</Typography>
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
                <Typography variant="body2" color="text.secondary">Packages Sold</Typography>
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
                <Typography variant="body2" color="text.secondary">Avg. Savings</Typography>
              </Box>
              <Typography variant="h4">
                {packages.length > 0
                  ? Math.round(packages.reduce((sum, p) => sum + parseFloat(p.savingsPercent), 0) / packages.length)
                  : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {packages.map((pkg) => (
              <Grid key={pkg.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">{pkg.name}</Typography>
                      <Box>
                        <IconButton size="small" onClick={() => handleOpenDialog(pkg)}>
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
                      <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                        ${pkg.regularPrice.toFixed(2)}
                      </Typography>
                      <Chip label={`Save ${pkg.savingsPercent}%`} color="success" size="small" />
                    </Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Includes:</Typography>
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
                      Valid for {pkg.validDays} days • {pkg.sales.length} sold
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={() => {
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
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  helperText={suggestedPrice > 0 ? `Suggested: $${suggestedPrice.toFixed(2)} (15% off)` : ''}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Valid Days"
                  type="number"
                  fullWidth
                  value={formData.validDays}
                  onChange={(e) => setFormData({ ...formData, validDays: parseInt(e.target.value) })}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>Services Included</Typography>
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
      <Dialog open={sellDialogOpen} onClose={() => setSellDialogOpen(false)} maxWidth="sm" fullWidth>
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
                Price: ${packages.find(p => p.id === sellData.packageId)?.price.toFixed(2)}
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
