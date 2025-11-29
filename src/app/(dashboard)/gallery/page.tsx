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
  CircularProgress,
  Alert,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Tabs,
  Tab,
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
} from '@mui/icons-material';

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

  // Preview dialog
  const [previewPhoto, setPreviewPhoto] = useState<GalleryPhoto | null>(null);

  // Upload state
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

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
      setError('Failed to load gallery');
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
      console.error('Failed to fetch technicians');
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
      setError(err instanceof Error ? err.message : 'Failed to upload file');
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
        if (!uploadedUrl) return; // Error already set
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
      fetchPhotos();
    } catch {
      setError('Failed to save photo');
    }
  };

  const handleToggleFeatured = async (photo: GalleryPhoto) => {
    try {
      await fetch(`/api/gallery/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !photo.featured }),
      });
      fetchPhotos();
    } catch {
      setError('Failed to update photo');
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await fetch(`/api/gallery/${photoId}`, { method: 'DELETE' });
      fetchPhotos();
    } catch {
      setError('Failed to delete photo');
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
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
              }}
              onClick={() => setPreviewPhoto(photo)}
            >
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

      {/* Add/Edit Dialog */}
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

      {/* Preview Dialog */}
      <Dialog
        open={!!previewPhoto}
        onClose={() => setPreviewPhoto(null)}
        maxWidth="md"
        fullWidth
      >
        {previewPhoto && (
          <>
            <DialogContent sx={{ p: 0 }}>
              <img
                src={previewPhoto.imageUrl}
                alt={previewPhoto.title || 'Nail art'}
                style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </DialogContent>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">{previewPhoto.title || 'Untitled'}</Typography>
              <Typography color="text.secondary" gutterBottom>
                by {previewPhoto.technician.name}
              </Typography>
              {previewPhoto.description && (
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {previewPhoto.description}
                </Typography>
              )}
              {previewPhoto.tags.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {previewPhoto.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => {
                    setPreviewPhoto(null);
                    handleOpenDialog(previewPhoto);
                  }}
                >
                  Edit
                </Button>
                <Button
                  startIcon={<DeleteIcon />}
                  color="error"
                  onClick={() => {
                    handleDelete(previewPhoto.id);
                    setPreviewPhoto(null);
                  }}
                >
                  Delete
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Dialog>
    </Box>
  );
}
