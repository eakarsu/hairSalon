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
  Checkbox,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  ButtonGroup,
} from '@mui/material';
import {
  Search,
  Add as AddIcon,
  Edit,
  Delete,
  Close,
  Download,
  PictureAsPdf,
  DeleteSweep,
  AddCircle as AddStockIcon,
  RemoveCircle as RemoveStockIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  Category,
  LocalOffer,
  AttachMoney,
  Store,
  QrCode,
  BarChart,
} from '@mui/icons-material';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

type InventoryCategory = 'NAIL_POLISH' | 'GEL' | 'ACRYLIC' | 'TOOLS' | 'SANITIZATION' | 'DISPOSABLES' | 'OTHER';

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: InventoryCategory;
  quantity: number;
  minQuantity: number;
  costPrice: number | null;
  retailPrice: number | null;
  supplier: string | null;
}

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'NAIL_POLISH', label: 'Nail Polish' },
  { value: 'GEL', label: 'Gel' },
  { value: 'ACRYLIC', label: 'Acrylic' },
  { value: 'TOOLS', label: 'Tools' },
  { value: 'SANITIZATION', label: 'Sanitization' },
  { value: 'DISPOSABLES', label: 'Disposables' },
  { value: 'OTHER', label: 'Other' },
];

const getCategoryLabel = (category: InventoryCategory) => {
  return CATEGORIES.find((c) => c.value === category)?.label || category;
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Add/Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'OTHER' as InventoryCategory,
    quantity: 0,
    minQuantity: 5,
    costPrice: '',
    retailPrice: '',
    supplier: '',
  });

  // Detail Drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'bulkDelete'>('delete');
  const [deleting, setDeleting] = useState(false);

  // Adjust Dialog
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  const toast = useToast();

  useEffect(() => {
    fetchItems();
  }, [filterCategory, selectedTab]);

  const fetchItems = async () => {
    try {
      let url = '/api/inventory?';
      if (filterCategory) url += `category=${filterCategory}&`;
      if (selectedTab === 1) url += 'lowStock=true';

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      } else {
        toast.showError('Failed to load inventory');
      }
    } catch {
      toast.showError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  // Row click -> open detail drawer
  const handleRowClick = (item: InventoryItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  // Edit from drawer or direct
  const handleEdit = (item?: InventoryItem) => {
    const i = item || detailItem;
    if (i) {
      setSelectedItem(i);
      setFormData({
        name: i.name,
        sku: i.sku || '',
        category: i.category,
        quantity: i.quantity,
        minQuantity: i.minQuantity,
        costPrice: i.costPrice?.toString() || '',
        retailPrice: i.retailPrice?.toString() || '',
        supplier: i.supplier || '',
      });
      setEditMode(true);
      setDialogOpen(true);
      setDetailOpen(false);
    }
  };

  const handleAddNew = () => {
    setSelectedItem(null);
    setEditMode(false);
    setFormData({
      name: '',
      sku: '',
      category: 'OTHER',
      quantity: 0,
      minQuantity: 5,
      costPrice: '',
      retailPrice: '',
      supplier: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editMode && selectedItem ? `/api/inventory/${selectedItem.id}` : '/api/inventory';
      const method = editMode ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        retailPrice: formData.retailPrice ? parseFloat(formData.retailPrice) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      setDialogOpen(false);
      toast.showSuccess(editMode ? 'Item updated successfully' : 'Item added successfully');
      fetchItems();
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  // Delete from drawer or direct
  const handleDeleteClick = (item?: InventoryItem) => {
    const i = item || detailItem;
    if (i) {
      setSelectedItem(i);
      setConfirmAction('delete');
      setConfirmOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/inventory/${selectedItem.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.showSuccess(`${selectedItem.name} deleted successfully`);
        setConfirmOpen(false);
        setDetailOpen(false);
        setSelectedItem(null);
        fetchItems();
      } else {
        const data = await response.json();
        toast.showError(data.error || 'Failed to delete item');
      }
    } catch {
      toast.showError('Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDeleteClick = () => {
    setConfirmAction('bulkDelete');
    setConfirmOpen(true);
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), type: 'inventory' }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.showSuccess(`Deleted ${data.deletedCount} items`);
        setSelectedIds(new Set());
        setConfirmOpen(false);
        fetchItems();
      } else {
        toast.showError('Failed to delete items');
      }
    } catch {
      toast.showError('Bulk delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // Export
  const handleExport = (format: 'csv' | 'pdf') => {
    window.open(`/api/export/${format}?type=inventory`, '_blank');
    toast.showInfo(`Exporting inventory as ${format.toUpperCase()}...`);
  };

  // Adjust stock
  const handleAdjustOpen = (item: InventoryItem, isAdd: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAdjustItem(item);
    setAdjustQty(isAdd ? 1 : -1);
    setAdjustReason('');
    setAdjustDialog(true);
    setDetailOpen(false);
  };

  const handleAdjustSubmit = async () => {
    if (!adjustItem) return;

    try {
      const res = await fetch(`/api/inventory/${adjustItem.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityChange: adjustQty,
          reason: adjustReason,
        }),
      });

      if (!res.ok) throw new Error('Failed to adjust');

      setAdjustDialog(false);
      toast.showSuccess(
        adjustQty > 0
          ? `Added ${Math.abs(adjustQty)} to ${adjustItem.name}`
          : `Removed ${Math.abs(adjustQty)} from ${adjustItem.name}`
      );
      fetchItems();
    } catch {
      toast.showError('Failed to adjust stock');
    }
  };

  // Filtered items (search + category tab filtering is done via API, but we also filter client-side by search)
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Stats
  const lowStockCount = items.filter((item) => item.quantity <= item.minQuantity).length;
  const totalValue = items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueCategories = new Set(items.map((i) => i.category)).size;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Inventory Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ButtonGroup variant="outlined" size="small">
            <Button startIcon={<Download />} onClick={() => handleExport('csv')}>
              CSV
            </Button>
            <Button startIcon={<PictureAsPdf />} onClick={() => handleExport('pdf')}>
              PDF
            </Button>
          </ButtonGroup>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddNew}>
            Add Item
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {loading ? (
        <CardsSkeleton count={4} />
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Total Products
                </Typography>
                <Typography variant="h4">{items.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Total Units in Stock
                </Typography>
                <Typography variant="h4">{totalItems}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Low Stock Alerts
                </Typography>
                <Typography variant="h4" color={lowStockCount > 0 ? 'warning.main' : 'text.primary'}>
                  {lowStockCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Total Inventory Value
                </Typography>
                <Typography variant="h4">${totalValue.toFixed(0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.50' }}>
          <Typography variant="body2" fontWeight={600}>
            {selectedIds.size} selected
          </Typography>
          <Button size="small" color="error" startIcon={<DeleteSweep />} onClick={handleBulkDeleteClick}>
            Delete Selected
          </Button>
          <Button size="small" onClick={() => setSelectedIds(new Set())}>
            Clear Selection
          </Button>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
            <Tab label="All Items" />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="warning" fontSize="small" />
                  Low Stock ({lowStockCount})
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Search + Category Filter */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search by name, SKU, or supplier..."
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
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Category</InputLabel>
            <Select
              value={filterCategory}
              label="Filter by Category"
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={8} columns={9} />
        ) : filteredItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No inventory items found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {items.length === 0 ? 'Start tracking your salon supplies' : 'Try adjusting your search or filters'}
            </Typography>
            {items.length === 0 && (
              <Button variant="contained" onClick={handleAddNew}>
                Add First Item
              </Button>
            )}
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedIds.size > 0 && selectedIds.size < filteredItems.length}
                        checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Min Stock</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Retail</TableCell>
                    <TableCell>Supplier</TableCell>
                    <TableCell align="center">Adjust</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((item) => (
                      <TableRow
                        key={item.id}
                        hover
                        sx={{
                          cursor: 'pointer',
                          bgcolor: item.quantity <= item.minQuantity ? 'warning.50' : 'inherit',
                          '&:hover': {
                            bgcolor: item.quantity <= item.minQuantity ? 'warning.100' : undefined,
                          },
                        }}
                        onClick={() => handleRowClick(item)}
                        selected={selectedIds.has(item.id)}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onClick={(e) => handleSelectOne(item.id, e)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {item.name}
                            </Typography>
                            {item.quantity <= item.minQuantity && (
                              <Chip size="small" color="warning" label="Low" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {item.sku || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={getCategoryLabel(item.category)} />
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            fontWeight="bold"
                            color={item.quantity <= item.minQuantity ? 'warning.main' : 'text.primary'}
                          >
                            {item.quantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{item.minQuantity}</TableCell>
                        <TableCell align="right">
                          {item.costPrice ? `$${item.costPrice.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {item.retailPrice ? `$${item.retailPrice.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>{item.supplier || '-'}</TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={(e) => handleAdjustOpen(item, true, e)}
                            title="Add stock"
                          >
                            <AddStockIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => handleAdjustOpen(item, false, e)}
                            title="Remove stock"
                          >
                            <RemoveStockIcon />
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
              count={filteredItems.length}
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

      {/* Detail Drawer */}
      <Drawer anchor="right" open={detailOpen} onClose={() => setDetailOpen(false)}>
        <Box sx={{ width: 420, p: 3 }}>
          <Toolbar sx={{ justifyContent: 'space-between', px: 0, mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              Item Details
            </Typography>
            <IconButton onClick={() => setDetailOpen(false)}>
              <Close />
            </IconButton>
          </Toolbar>
          {detailItem && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5 }}>
                  {detailItem.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip size="small" label={getCategoryLabel(detailItem.category)} />
                  {detailItem.quantity <= detailItem.minQuantity && (
                    <Chip size="small" color="warning" icon={<WarningIcon />} label="Low Stock" />
                  )}
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem>
                  <QrCode sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="SKU" secondary={detailItem.sku || 'Not set'} />
                </ListItem>
                <ListItem>
                  <Category sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Category" secondary={getCategoryLabel(detailItem.category)} />
                </ListItem>
                <ListItem>
                  <BarChart sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Quantity"
                    secondary={
                      <Typography
                        component="span"
                        variant="body2"
                        fontWeight={600}
                        color={detailItem.quantity <= detailItem.minQuantity ? 'warning.main' : 'text.secondary'}
                      >
                        {detailItem.quantity} units (min: {detailItem.minQuantity})
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem>
                  <AttachMoney sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Cost Price"
                    secondary={detailItem.costPrice ? `$${detailItem.costPrice.toFixed(2)}` : 'Not set'}
                  />
                </ListItem>
                <ListItem>
                  <LocalOffer sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Retail Price"
                    secondary={detailItem.retailPrice ? `$${detailItem.retailPrice.toFixed(2)}` : 'Not set'}
                  />
                </ListItem>
                <ListItem>
                  <Store sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Supplier" secondary={detailItem.supplier || 'Not set'} />
                </ListItem>
              </List>
              {detailItem.costPrice && detailItem.retailPrice && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Margin: ${(detailItem.retailPrice - detailItem.costPrice).toFixed(2)} (
                      {(((detailItem.retailPrice - detailItem.costPrice) / detailItem.costPrice) * 100).toFixed(0)}
                      %)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Stock Value: ${(detailItem.costPrice * detailItem.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                </>
              )}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<AddStockIcon />}
                  onClick={() => handleAdjustOpen(detailItem, true)}
                  fullWidth
                >
                  Add Stock
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RemoveStockIcon />}
                  onClick={() => handleAdjustOpen(detailItem, false)}
                  fullWidth
                >
                  Remove Stock
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<Edit />} onClick={() => handleEdit()} fullWidth>
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => handleDeleteClick()}
                  fullWidth
                >
                  Delete
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Add/Edit Item Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Item Name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />

            <TextField
              fullWidth
              label="SKU"
              value={formData.sku}
              onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, category: e.target.value as InventoryCategory }))
                }
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {!editMode && (
              <TextField
                fullWidth
                type="number"
                label="Initial Quantity"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                }
              />
            )}

            <TextField
              fullWidth
              type="number"
              label="Minimum Stock Level"
              value={formData.minQuantity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, minQuantity: parseInt(e.target.value) || 0 }))
              }
              helperText="Alert when stock falls below this level"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Cost Price"
                value={formData.costPrice}
                onChange={(e) => setFormData((prev) => ({ ...prev, costPrice: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
              <TextField
                fullWidth
                type="number"
                label="Retail Price"
                value={formData.retailPrice}
                onChange={(e) => setFormData((prev) => ({ ...prev, retailPrice: e.target.value }))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Box>

            <TextField
              fullWidth
              label="Supplier"
              value={formData.supplier}
              onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formData.name}>
            {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialog} onClose={() => setAdjustDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {adjustQty > 0 ? 'Add Stock' : 'Remove Stock'} - {adjustItem?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current quantity: {adjustItem?.quantity}
          </Typography>

          <TextField
            fullWidth
            type="number"
            label="Quantity"
            value={Math.abs(adjustQty)}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setAdjustQty(adjustQty > 0 ? val : -val);
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Reason"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder={adjustQty > 0 ? 'e.g., Received shipment' : 'e.g., Used, Damaged'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={adjustQty > 0 ? 'success' : 'error'}
            onClick={handleAdjustSubmit}
          >
            {adjustQty > 0 ? 'Add' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmAction === 'bulkDelete' ? 'Delete Selected Items' : 'Delete Item'}
        message={
          confirmAction === 'bulkDelete'
            ? `Are you sure you want to delete ${selectedIds.size} selected items? This action cannot be undone.`
            : `Are you sure you want to delete ${selectedItem?.name}? This action cannot be undone.`
        }
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmAction === 'bulkDelete' ? handleBulkDelete : handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
}
