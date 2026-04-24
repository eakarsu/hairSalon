'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
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
  Chip,
  FormControlLabel,
  Switch,
  Alert,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Tabs,
  Tab,
  Drawer,
  Divider,
  Checkbox,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PhotoCamera as PhotoIcon,
  CloudUpload as UploadIcon,
  Link as LinkIcon,
  Close as CloseIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { CardsSkeleton } from '@/components/LoadingSkeleton';

interface Technician {
  id: string;
  name: string;
}

interface GalleryPhoto {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  tags: string[];
  featured: boolean;
  technicianId: string;
  technician: Technician;
  createdAt: string;
}

const COMMON_TAGS = [
  'Gel Nails',
  'Acrylic',
  'Nail Art',
  'French Tips',
  'Ombre',
  'Glitter',
  'Matte',
  'Chrome',
  'Stiletto',
  'Coffin',
  'Almond',
  'Square',
];

export default function GalleryPage() {
  const { showSuccess, showError } = useToast();

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedTab, setSelectedTab] = useState(0);
  const [filterTech, setFilterTech] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [formData, setFormData] = useState({
    imageUrl: '',
    title: '',
    description: '',
    tags: [] as string[],
    technicianId: '',
    featured: false,
  });

  // Detail Drawer state (replaces preview dialog)
  const [drawerPhoto, setDrawerPhoto] = useState<GalleryPhoto | null>(null);

  // Upload state
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchPhotos();
    fetchTechnicians();
  }, [filterTech, selectedTab]);

  const fetchPhotos = async () => {
    try {
      let url = '/api/gallery?';
      if (filterTech) url += `technicianId=${filterTech}&`;
      if (selectedTab === 1) url += 'featured=true';

      const res = await fetch(url);
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch {
      showError('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await fetch('/api/staff/technicians');
      const data = await res.json();
      setTechnicians(data.technicians || []);
    } catch {
      showError('Failed to fetch technicians');
    }
  };

  const handleOpenDialog = (photo?: GalleryPhoto) => {
    if (photo) {
      setEditingPhoto(photo);
      setFormData({
        imageUrl: photo.imageUrl,
        title: photo.title || '',
        description: photo.description || '',
        tags: photo.tags,
        technicianId: photo.technicianId,
        featured: photo.featured,
      });
      setUploadMethod('url');
    } else {
      setEditingPhoto(null);
      setFormData({
        imageUrl: '',
        title: '',
        description: '',
        tags: [],
        technicianId: '',
        featured: false,
      });
      setUploadMethod('upload');
    }
    setSelectedFile(null);
    setUploadPreview(null);
    setDialogOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      return data.imageUrl;
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to upload file');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      let imageUrl = formData.imageUrl;

      // If uploading a file, upload it first
      if (uploadMethod === 'upload' && selectedFile && !editingPhoto) {
        const uploadedUrl = await uploadFile();
        if (!uploadedUrl) return; // Error already shown via toast
        imageUrl = uploadedUrl;
      }

      const url = editingPhoto ? `/api/gallery/${editingPhoto.id}` : '/api/gallery';
      const method = editingPhoto ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, imageUrl }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setDialogOpen(false);
      showSuccess(editingPhoto ? 'Photo updated successfully' : 'Photo added successfully');
      fetchPhotos();
    } catch {
      showError('Failed to save photo');
    }
  };

  const handleToggleFeatured = async (photo: GalleryPhoto) => {
    try {
      await fetch(`/api/gallery/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !photo.featured }),
      });
      showSuccess(photo.featured ? 'Removed from featured' : 'Added to featured');
      fetchPhotos();
    } catch {
      showError('Failed to update photo');
    }
  };

  // Single delete: open confirm dialog
  const handleDeleteRequest = (photoId: string) => {
    setPendingDeleteId(photoId);
    setConfirmOpen(true);
  };

  // Single delete: confirmed
  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    setConfirmLoading(true);
    try {
      const res = await fetch(`/api/gallery/${pendingDeleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      showSuccess('Photo deleted successfully');
      // Close drawer if the deleted photo was being viewed
      if (drawerPhoto && drawerPhoto.id === pendingDeleteId) {
        setDrawerPhoto(null);
      }
      // Remove from selection if selected
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(pendingDeleteId);
        return next;
      });
      fetchPhotos();
    } catch {
      showError('Failed to delete photo');
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  // Bulk delete: open confirm dialog
  const handleBulkDeleteRequest = () => {
    setBulkConfirmOpen(true);
  };

  // Bulk delete: confirmed
  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch('/api/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, type: 'gallery' }),
      });
      if (!res.ok) throw new Error('Bulk delete failed');
      showSuccess(`${ids.length} photo${ids.length !== 1 ? 's' : ''} deleted successfully`);
      // Close drawer if the viewed photo was in the bulk delete set
      if (drawerPhoto && selectedIds.has(drawerPhoto.id)) {
        setDrawerPhoto(null);
      }
      setSelectedIds(new Set());
      fetchPhotos();
    } catch {
      showError('Failed to delete selected photos');
    } finally {
      setBulkDeleting(false);
      setBulkConfirmOpen(false);
    }
  };

  // Bulk select helpers
  const toggleSelect = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <CardsSkeleton count={8} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Photo Gallery</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Add Photo
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Paper
          elevation={3}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 3,
            py: 1.5,
            mb: 3,
            bgcolor: 'primary.50',
            borderLeft: 4,
            borderColor: 'primary.main',
          }}
        >
          <Typography variant="body1" fontWeight={600}>
            {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''} selected
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" size="small" onClick={clearSelection}>
            Clear Selection
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={handleBulkDeleteRequest}
          >
            Delete Selected
          </Button>
        </Paper>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
          <Tab label="All Photos" />
          <Tab label="Featured" icon={<StarIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Technician</InputLabel>
          <Select
            value={filterTech}
            label="Filter by Technician"
            onChange={(e) => setFilterTech(e.target.value)}
          >
            <MenuItem value="">All Technicians</MenuItem>
            {technicians.map((tech) => (
              <MenuItem key={tech.id} value={tech.id}>
                {tech.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {photos.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <PhotoIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No photos yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Add photos to showcase your nail art work
          </Typography>
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            Add First Photo
          </Button>
        </Card>
      ) : (
        <ImageList cols={4} gap={16}>
          {photos.map((photo) => (
            <ImageListItem
              key={photo.id}
              sx={{
                cursor: 'pointer',
                '&:hover': { opacity: 0.9 },
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
              }}
              onClick={() => setDrawerPhoto(photo)}
            >
              {/* Bulk select checkbox */}
              <Checkbox
                checked={selectedIds.has(photo.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(photo.id);
                }}
                icon={<CheckBoxOutlineBlankIcon />}
                checkedIcon={<CheckBoxIcon />}
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  zIndex: 2,
                  color: 'rgba(255,255,255,0.8)',
                  '&.Mui-checked': { color: 'primary.main' },
                  bgcolor: 'rgba(0,0,0,0.3)',
                  borderRadius: 1,
                  p: 0.5,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.5)' },
                }}
              />
              <img
                src={photo.thumbnailUrl || photo.imageUrl}
                alt={photo.title || 'Nail art'}
                loading="lazy"
                style={{ height: 200, objectFit: 'cover' }}
              />
              <ImageListItemBar
                title={photo.title || 'Untitled'}
                subtitle={photo.technician.name}
                actionIcon={
                  <IconButton
                    sx={{ color: photo.featured ? 'warning.main' : 'rgba(255,255,255,0.54)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFeatured(photo);
                    }}
                  >
                    {photo.featured ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}

      {/* Add/Edit Dialog - KEPT AS IS */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPhoto ? 'Edit Photo' : 'Add Photo'}</DialogTitle>
        <DialogContent>
          {!editingPhoto && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, mt: 1 }}>
              <Tabs
                value={uploadMethod}
                onChange={(_, v) => setUploadMethod(v)}
                sx={{ minHeight: 40 }}
              >
                <Tab
                  icon={<UploadIcon sx={{ fontSize: 18, mr: 0.5 }} />}
                  iconPosition="start"
                  label="Upload File"
                  value="upload"
                  sx={{ minHeight: 40 }}
                />
                <Tab
                  icon={<LinkIcon sx={{ fontSize: 18, mr: 0.5 }} />}
                  iconPosition="start"
                  label="Image URL"
                  value="url"
                  sx={{ minHeight: 40 }}
                />
              </Tabs>
            </Box>
          )}

          {uploadMethod === 'upload' && !editingPhoto ? (
            <Box sx={{ mb: 2 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="photo-upload"
                type="file"
                onChange={handleFileSelect}
              />
              <label htmlFor="photo-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadIcon />}
                  fullWidth
                  sx={{ height: 100, borderStyle: 'dashed' }}
                >
                  {selectedFile ? selectedFile.name : 'Click to select image'}
                </Button>
              </label>
              {uploadPreview && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <img
                    src={uploadPreview}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
                  />
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
              </Typography>
            </Box>
          ) : (
            <TextField
              fullWidth
              label="Image URL"
              value={formData.imageUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
              sx={{ mt: editingPhoto ? 2 : 0, mb: 2 }}
              required
              helperText="Enter the URL of the image"
            />
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Technician</InputLabel>
            <Select
              value={formData.technicianId}
              label="Technician"
              onChange={(e) => setFormData((prev) => ({ ...prev, technicianId: e.target.value }))}
              required
            >
              {technicians.map((tech) => (
                <MenuItem key={tech.id} value={tech.id}>
                  {tech.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" gutterBottom>
            Tags
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {COMMON_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onClick={() => toggleTag(tag)}
                color={formData.tags.includes(tag) ? 'primary' : 'default'}
                variant={formData.tags.includes(tag) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={formData.featured}
                onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
              />
            }
            label="Featured photo"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              uploading ||
              !formData.technicianId ||
              (uploadMethod === 'url' && !formData.imageUrl) ||
              (uploadMethod === 'upload' && !editingPhoto && !selectedFile)
            }
          >
            {uploading ? 'Uploading...' : editingPhoto ? 'Save' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Drawer (replaces Preview Dialog) */}
      <Drawer
        anchor="right"
        open={!!drawerPhoto}
        onClose={() => setDrawerPhoto(null)}
        PaperProps={{ sx: { width: 420, maxWidth: '100vw' } }}
      >
        {drawerPhoto && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
              <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                Photo Details
              </Typography>
              <IconButton onClick={() => setDrawerPhoto(null)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider />

            {/* Image preview */}
            <Box sx={{ width: '100%', bgcolor: 'grey.100' }}>
              <img
                src={drawerPhoto.imageUrl}
                alt={drawerPhoto.title || 'Nail art'}
                style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
              />
            </Box>

            {/* Details */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
              <Typography variant="h6" gutterBottom>
                {drawerPhoto.title || 'Untitled'}
              </Typography>

              {drawerPhoto.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {drawerPhoto.description}
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Technician</Typography>
                  <Typography variant="body2" fontWeight={500}>{drawerPhoto.technician.name}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Featured</Typography>
                  <Chip
                    label={drawerPhoto.featured ? 'Yes' : 'No'}
                    size="small"
                    color={drawerPhoto.featured ? 'warning' : 'default'}
                    icon={drawerPhoto.featured ? <StarIcon /> : undefined}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Created</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {new Date(drawerPhoto.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Typography>
                </Box>
              </Box>

              {drawerPhoto.tags.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {drawerPhoto.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </>
              )}
            </Box>

            {/* Action buttons */}
            <Divider />
            <Box sx={{ display: 'flex', gap: 1, p: 2 }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                fullWidth
                onClick={() => {
                  const photo = drawerPhoto;
                  setDrawerPhoto(null);
                  handleOpenDialog(photo);
                }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                fullWidth
                onClick={() => {
                  handleDeleteRequest(drawerPhoto.id);
                }}
              >
                Delete
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Single delete confirm dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Photo"
        message="Are you sure you want to delete this photo? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={confirmLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />

      {/* Bulk delete confirm dialog */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Delete Selected Photos"
        message={`Are you sure you want to delete ${selectedIds.size} selected photo${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText={`Delete ${selectedIds.size} Photo${selectedIds.size !== 1 ? 's' : ''}`}
        cancelText="Cancel"
        variant="danger"
        loading={bulkDeleting}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkConfirmOpen(false)}
      />
    </Box>
  );
}
