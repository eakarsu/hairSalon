'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Alert,
  Drawer,
  Divider,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  ShoppingCart,
  Inventory,
  Warning,
  TrendingUp,
  Close,
  Category,
  LocalOffer,
  QrCode,
  AttachMoney,
  Storefront,
} from '@mui/icons-material';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

interface RetailProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  brand: string | null;
  costPrice: number;
  retailPrice: number;
  quantity: number;
  minQuantity: number;
  imageUrl: string | null;
}

interface RetailSale {
  id: string;
  product: { id: string; name: string; sku: string | null };
  client: { id: string; name: string } | null;
  soldBy: { id: string; name: string } | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export default function RetailPage() {
  const { showSuccess, showError, showWarning } = useToast();

  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [sales, setSales] = useState<RetailSale[]>([]);
  const [salesSummary, setSalesSummary] = useState({ totalSales: 0, totalUnits: 0, salesCount: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RetailProduct | null>(null);
  const [saving, setSaving] = useState(false);

  // Detail drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<RetailProduct | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RetailProduct | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    costPrice: 0,
    retailPrice: 0,
    quantity: 0,
    minQuantity: 5,
  });
  const [saleData, setSaleData] = useState({
    productId: '',
    quantity: 1,
  });

  useEffect(() => {
    fetchProducts();
    fetchSales();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/retail-products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
      } else {
        showError('Failed to load products');
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      showError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await fetch('/api/retail-sales');
      if (response.ok) {
        const data = await response.json();
        setSales(data.sales || []);
        setSalesSummary(data.summary || { totalSales: 0, totalUnits: 0, salesCount: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    }
  };

  // --- Dialog handlers ---

  const handleOpenDialog = (product?: RetailProduct) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || '',
        brand: product.brand || '',
        costPrice: product.costPrice,
        retailPrice: product.retailPrice,
        quantity: product.quantity,
        minQuantity: product.minQuantity,
      });
    } else {
      setSelectedProduct(null);
      setFormData({
        name: '',
        description: '',
        sku: '',
        barcode: '',
        category: '',
        brand: '',
        costPrice: 0,
        retailPrice: 0,
        quantity: 0,
        minQuantity: 5,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/retail-products', {
        method: selectedProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedProduct ? { id: selectedProduct.id, ...formData } : formData),
      });

      if (!response.ok) throw new Error('Failed to save');

      setDialogOpen(false);
      showSuccess(selectedProduct ? 'Product updated successfully' : 'Product added successfully');
      await fetchProducts();

      // Update drawer product if it was the one edited
      if (selectedProduct && drawerProduct && selectedProduct.id === drawerProduct.id) {
        const updatedProduct = { ...drawerProduct, ...formData } as RetailProduct;
        setDrawerProduct(updatedProduct);
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      showError('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleSale = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/retail-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const data = await response.json();
        showError(data.error || 'Failed to create sale');
        return;
      }

      setSaleDialogOpen(false);
      setSaleData({ productId: '', quantity: 1 });
      showSuccess('Sale completed successfully');
      fetchProducts();
      fetchSales();
    } catch (error) {
      console.error('Failed to create sale:', error);
      showError('Failed to create sale');
    } finally {
      setSaving(false);
    }
  };

  // --- Row click / Drawer handlers ---

  const handleRowClick = (product: RetailProduct) => {
    setDrawerProduct(product);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handleDrawerEdit = () => {
    if (drawerProduct) {
      handleOpenDialog(drawerProduct);
    }
  };

  const handleDrawerDelete = () => {
    if (drawerProduct) {
      setDeleteTarget(drawerProduct);
      setDeleteConfirmOpen(true);
    }
  };

  // --- Delete handlers ---

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch('/api/retail-products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!response.ok) throw new Error('Failed to delete');

      showSuccess(`"${deleteTarget.name}" deleted successfully`);
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);

      // Close drawer if the deleted product was shown
      if (drawerProduct && drawerProduct.id === deleteTarget.id) {
        setDrawerOpen(false);
        setDrawerProduct(null);
      }

      // Remove from selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });

      await fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      showError('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setDeleting(true);
    const ids = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        const response = await fetch('/api/retail-products', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      showSuccess(`${successCount} product(s) deleted successfully`);
    }
    if (failCount > 0) {
      showError(`Failed to delete ${failCount} product(s)`);
    }

    setBulkDeleteConfirmOpen(false);
    setSelectedIds(new Set());

    // Close drawer if the shown product was in the bulk delete set
    if (drawerProduct && ids.includes(drawerProduct.id)) {
      setDrawerOpen(false);
      setDrawerProduct(null);
    }

    await fetchProducts();
    setDeleting(false);
  };

  // --- Bulk select handlers ---

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [products, searchQuery]
  );

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.quantity <= p.minQuantity),
    [products]
  );

  const allFilteredSelected =
    filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id));

  const someFilteredSelected =
    filteredProducts.some((p) => selectedIds.has(p.id)) && !allFilteredSelected;

  const handleToggleAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredProducts.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const handleToggleOne = (id: string) => {
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

  const tabs = ['Products', 'Sales History', 'Low Stock'];

  // --- Drawer detail row helper ---
  const DetailRow = ({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', py: 1.5 }}>
      {icon && <Box sx={{ color: 'text.secondary', mr: 1.5, mt: 0.25 }}>{icon}</Box>}
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body1">{value}</Typography>
      </Box>
    </Box>
  );

  // --- Profit margin calculation ---
  const profitMargin = (product: RetailProduct) => {
    if (product.retailPrice === 0) return 0;
    return ((product.retailPrice - product.costPrice) / product.retailPrice) * 100;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Retail Products
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ShoppingCart />}
            onClick={() => setSaleDialogOpen(true)}
          >
            New Sale
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Product
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
                  <Inventory color="primary" />
                  <Typography variant="body2" color="text.secondary">Total Products</Typography>
                </Box>
                <Typography variant="h4">{products.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Warning color="warning" />
                  <Typography variant="body2" color="text.secondary">Low Stock</Typography>
                </Box>
                <Typography variant="h4" color="warning.main">{lowStockProducts.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ShoppingCart color="success" />
                  <Typography variant="body2" color="text.secondary">Total Sales</Typography>
                </Box>
                <Typography variant="h4">${salesSummary.totalSales.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TrendingUp color="info" />
                  <Typography variant="body2" color="text.secondary">Units Sold</Typography>
                </Box>
                <Typography variant="h4">{salesSummary.totalUnits}</Typography>
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

        {/* ===== Products Tab ===== */}
        {selectedTab === 0 && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <TextField
                placeholder="Search products..."
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

              {selectedIds.size > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedIds.size} selected
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<Delete />}
                    onClick={() => setBulkDeleteConfirmOpen(true)}
                  >
                    Delete Selected
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                </Box>
              )}
            </Box>

            {loading ? (
              <TableSkeleton rows={6} columns={8} />
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={someFilteredSelected}
                          checked={allFilteredSelected}
                          onChange={handleToggleAll}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            {searchQuery ? 'No products match your search' : 'No products yet. Add your first product to get started.'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => {
                        const isSelected = selectedIds.has(product.id);
                        return (
                          <TableRow
                            key={product.id}
                            hover
                            selected={isSelected}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => handleRowClick(product)}
                          >
                            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleToggleOne(product.id)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {product.name}
                                </Typography>
                                {product.brand && (
                                  <Typography variant="caption" color="text.secondary">
                                    {product.brand}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>{product.sku || '-'}</TableCell>
                            <TableCell>
                              {product.category && (
                                <Chip label={product.category} size="small" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell align="right">${product.costPrice.toFixed(2)}</TableCell>
                            <TableCell align="right">${product.retailPrice.toFixed(2)}</TableCell>
                            <TableCell align="right">
                              <Typography
                                color={product.quantity <= product.minQuantity ? 'error' : 'inherit'}
                                fontWeight={product.quantity <= product.minQuantity ? 600 : 400}
                              >
                                {product.quantity}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => handleOpenDialog(product)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setDeleteTarget(product);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Delete fontSize="small" />
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
            )}
          </>
        )}

        {/* ===== Sales History Tab ===== */}
        {selectedTab === 1 && (
          loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Sold By</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No sales recorded yet.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow key={sale.id} hover>
                        <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{sale.product.name}</TableCell>
                        <TableCell>{sale.client?.name || 'Walk-in'}</TableCell>
                        <TableCell>{sale.soldBy?.name || '-'}</TableCell>
                        <TableCell align="right">{sale.quantity}</TableCell>
                        <TableCell align="right">${sale.totalPrice.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}

        {/* ===== Low Stock Tab ===== */}
        {selectedTab === 2 && (
          loading ? (
            <TableSkeleton rows={4} columns={5} />
          ) : (
            <>
              {lowStockProducts.length === 0 ? (
                <Alert severity="success">All products are well stocked!</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell align="right">Current Stock</TableCell>
                        <TableCell align="right">Min Required</TableCell>
                        <TableCell align="right">Reorder Qty</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lowStockProducts.map((product) => (
                        <TableRow key={product.id} hover>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.sku || '-'}</TableCell>
                          <TableCell align="right">
                            <Typography color="error" fontWeight={600}>
                              {product.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{product.minQuantity}</TableCell>
                          <TableCell align="right">
                            {Math.max(product.minQuantity * 2 - product.quantity, 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )
        )}
      </Paper>

      {/* ===== Detail Drawer ===== */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
      >
        {drawerProduct && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                Product Details
              </Typography>
              <IconButton onClick={handleDrawerClose} size="small">
                <Close />
              </IconButton>
            </Box>

            {/* Drawer Content */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
              {/* Product name and brand */}
              <Typography variant="h5" fontWeight={600} gutterBottom>
                {drawerProduct.name}
              </Typography>
              {drawerProduct.brand && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {drawerProduct.brand}
                </Typography>
              )}

              {/* Status chip */}
              <Box sx={{ mt: 1, mb: 2 }}>
                {drawerProduct.quantity <= drawerProduct.minQuantity ? (
                  <Chip label="Low Stock" color="error" size="small" />
                ) : (
                  <Chip label="In Stock" color="success" size="small" />
                )}
              </Box>

              {drawerProduct.description && (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {drawerProduct.description}
                  </Typography>
                </>
              )}

              <Divider sx={{ my: 1 }} />

              {/* Pricing section */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                Pricing
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Cost Price</Typography>
                  <Typography variant="h6">${drawerProduct.costPrice.toFixed(2)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Retail Price</Typography>
                  <Typography variant="h6" color="primary.main">
                    ${drawerProduct.retailPrice.toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Margin</Typography>
                  <Typography variant="h6" color="success.main">
                    {profitMargin(drawerProduct).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1 }} />

              {/* Inventory section */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                Inventory
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">In Stock</Typography>
                  <Typography
                    variant="h6"
                    color={drawerProduct.quantity <= drawerProduct.minQuantity ? 'error.main' : 'text.primary'}
                    fontWeight={600}
                  >
                    {drawerProduct.quantity}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Min Quantity</Typography>
                  <Typography variant="h6">{drawerProduct.minQuantity}</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 1 }} />

              {/* Identification section */}
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                Identification
              </Typography>
              <DetailRow label="SKU" value={drawerProduct.sku || '-'} icon={<QrCode fontSize="small" />} />
              <DetailRow label="Barcode" value={drawerProduct.barcode || '-'} icon={<LocalOffer fontSize="small" />} />
              <DetailRow label="Category" value={
                drawerProduct.category
                  ? <Chip label={drawerProduct.category} size="small" variant="outlined" />
                  : '-'
              } icon={<Category fontSize="small" />} />
            </Box>

            {/* Drawer Footer with actions */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                px: 3,
                py: 2,
                borderTop: 1,
                borderColor: 'divider',
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

      {/* ===== Add/Edit Product Dialog ===== */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
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
                  label="SKU"
                  fullWidth
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Barcode"
                  fullWidth
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Category"
                  fullWidth
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Brand"
                  fullWidth
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Cost Price"
                  type="number"
                  fullWidth
                  required
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Retail Price"
                  type="number"
                  fullWidth
                  required
                  value={formData.retailPrice}
                  onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) })}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Min Quantity"
                  type="number"
                  fullWidth
                  value={formData.minQuantity}
                  onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.name}
          >
            {saving ? 'Saving...' : selectedProduct ? 'Save Changes' : 'Add Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== New Sale Dialog ===== */}
      <Dialog open={saleDialogOpen} onClose={() => setSaleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Sale</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Product</InputLabel>
              <Select
                label="Product"
                value={saleData.productId}
                onChange={(e) => setSaleData({ ...saleData, productId: e.target.value })}
              >
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name} - ${product.retailPrice.toFixed(2)} ({product.quantity} in stock)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Quantity"
              type="number"
              fullWidth
              value={saleData.quantity}
              onChange={(e) => setSaleData({ ...saleData, quantity: parseInt(e.target.value) })}
              inputProps={{ min: 1 }}
            />
            {saleData.productId && (
              <Typography variant="h6">
                Total: ${((products.find((p) => p.id === saleData.productId)?.retailPrice || 0) * saleData.quantity).toFixed(2)}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaleDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSale}
            disabled={saving || !saleData.productId}
          >
            {saving ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== Single Delete Confirm Dialog ===== */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Product"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />

      {/* ===== Bulk Delete Confirm Dialog ===== */}
      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        title="Delete Selected Products"
        message={`Are you sure you want to delete ${selectedIds.size} selected product(s)? This action cannot be undone.`}
        confirmText={`Delete ${selectedIds.size} Product(s)`}
        variant="danger"
        loading={deleting}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
      />
    </Box>
  );
}
