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
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
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
  Add,
  Edit,
  Delete,
  Schedule,
  Person,
  CalendarMonth,
  Close,
  Download,
  PictureAsPdf,
  DeleteSweep,
  Email,
  Phone,
  Badge,
  ToggleOn,
  Translate,
  WorkspacePremium,
} from '@mui/icons-material';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton, CardsSkeleton } from '@/components/LoadingSkeleton';

const ROLES = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  TECHNICIAN: 'Technician',
  FRONTDESK: 'Front Desk',
} as const;

const LEVELS = {
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
  MASTER: 'Master',
  SPECIALIST: 'Specialist',
} as const;

const LANGUAGES: Record<string, string> = {
  en: 'English',
  vi: 'Vietnamese',
  es: 'Spanish',
  zh: 'Chinese',
  ko: 'Korean',
};

type StaffRole = keyof typeof ROLES;
type StaffLevel = keyof typeof LEVELS;

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  level: StaffLevel;
  active: boolean;
  preferredLanguage: string;
  appointmentsToday?: number;
  appointmentsWeek?: number;
}

interface ScheduleEntry {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
}

const roleColors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  OWNER: 'error',
  MANAGER: 'secondary',
  TECHNICIAN: 'primary',
  FRONTDESK: 'success',
};

const levelColors: Record<string, 'default' | 'primary' | 'secondary' | 'warning'> = {
  JUNIOR: 'default',
  SENIOR: 'primary',
  MASTER: 'warning',
  SPECIALIST: 'secondary',
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'TECHNICIAN' as StaffRole,
    level: 'JUNIOR' as StaffLevel,
    preferredLanguage: 'en',
    active: true,
  });

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStaff, setDetailStaff] = useState<StaffMember | null>(null);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'bulkDelete'>('delete');
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
      }
    } catch (error) {
      toast.showError('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  // Row click opens detail drawer
  const handleRowClick = (member: StaffMember) => {
    setDetailStaff(member);
    setDetailOpen(true);
  };

  // Edit from drawer or directly
  const handleEdit = (member?: StaffMember) => {
    const s = member || detailStaff;
    if (s) {
      setSelectedStaff(s);
      setFormData({
        name: s.name,
        email: s.email,
        phone: s.phone || '',
        role: s.role,
        level: s.level || 'JUNIOR',
        preferredLanguage: s.preferredLanguage || 'en',
        active: s.active,
      });
      setEditMode(true);
      setDialogOpen(true);
      setDetailOpen(false);
    }
  };

  const handleAddNew = () => {
    setSelectedStaff(null);
    setEditMode(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'TECHNICIAN',
      level: 'JUNIOR',
      preferredLanguage: 'en',
      active: true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editMode && selectedStaff ? `/api/staff/${selectedStaff.id}` : '/api/staff';
      const response = await fetch(url, {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to save');
      setDialogOpen(false);
      toast.showSuccess(editMode ? 'Staff member updated successfully' : 'Staff member added successfully');
      fetchStaff();
    } catch (error) {
      toast.showError('Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (member?: StaffMember) => {
    const s = member || detailStaff;
    if (s) {
      setSelectedStaff(s);
      setConfirmAction('delete');
      setConfirmOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/staff/${selectedStaff.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.showSuccess(`${selectedStaff.name} deleted`);
        setConfirmOpen(false);
        setDetailOpen(false);
        fetchStaff();
      } else {
        toast.showError('Failed to delete staff member');
      }
    } catch (error) {
      toast.showError('Failed to delete staff member');
    } finally {
      setDeleting(false);
    }
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedIds.size === filteredStaff.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStaff.map(s => s.id)));
    }
  };

  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
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
        body: JSON.stringify({ ids: Array.from(selectedIds), type: 'staff' }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.showSuccess(`Deleted ${data.deletedCount} staff members`);
        setSelectedIds(new Set());
        setConfirmOpen(false);
        fetchStaff();
      }
    } catch (error) {
      toast.showError('Bulk delete failed');
    } finally {
      setDeleting(false);
    }
  };

  // Export
  const handleExport = (format: 'csv' | 'pdf') => {
    window.open(`/api/export/${format}?type=staff`, '_blank');
    toast.showInfo(`Exporting staff as ${format.toUpperCase()}...`);
  };

  // Mock schedule data for the schedule dialog / weekly view
  const mockSchedule: ScheduleEntry[] = [
    { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '19:00', isWorking: true },
    { id: '2', dayOfWeek: 2, startTime: '09:00', endTime: '19:00', isWorking: true },
    { id: '3', dayOfWeek: 3, startTime: '09:00', endTime: '19:00', isWorking: true },
    { id: '4', dayOfWeek: 4, startTime: '09:00', endTime: '19:00', isWorking: true },
    { id: '5', dayOfWeek: 5, startTime: '09:00', endTime: '19:00', isWorking: true },
    { id: '6', dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isWorking: true },
    { id: '7', dayOfWeek: 0, startTime: '10:00', endTime: '17:00', isWorking: false },
  ];

  // Filtering
  const filteredStaff = staff.filter(
    (member) =>
      (selectedTab === 0 || (selectedTab === 1 && member.role === 'TECHNICIAN')) &&
      (member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.phone && member.phone.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const technicians = staff.filter(s => s.role === 'TECHNICIAN');
  const activeStaff = staff.filter(s => s.active);
  const totalAppointmentsToday = technicians.reduce((sum, t) => sum + (t.appointmentsToday || 0), 0);
  const avgAppointmentsWeek = technicians.length > 0
    ? Math.round(technicians.reduce((sum, t) => sum + (t.appointmentsWeek || 0), 0) / technicians.length)
    : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Staff Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ButtonGroup variant="outlined" size="small">
            <Button startIcon={<Download />} onClick={() => handleExport('csv')}>CSV</Button>
            <Button startIcon={<PictureAsPdf />} onClick={() => handleExport('pdf')}>PDF</Button>
          </ButtonGroup>
          <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
            Add Staff
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {loading ? <CardsSkeleton count={4} /> : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Person color="primary" />
                  <Typography variant="body2" color="text.secondary">Total Staff</Typography>
                </Box>
                <Typography variant="h4">{staff.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Person color="success" />
                  <Typography variant="body2" color="text.secondary">Active Staff</Typography>
                </Box>
                <Typography variant="h4">{activeStaff.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CalendarMonth color="secondary" />
                  <Typography variant="body2" color="text.secondary">Today&apos;s Appointments</Typography>
                </Box>
                <Typography variant="h4">{totalAppointmentsToday}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Schedule color="info" />
                  <Typography variant="body2" color="text.secondary">Avg Weekly/Tech</Typography>
                </Box>
                <Typography variant="h4">{avgAppointmentsWeek}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'primary.50' }}>
          <Typography variant="body2" fontWeight={600}>{selectedIds.size} selected</Typography>
          <Button size="small" color="error" startIcon={<DeleteSweep />} onClick={handleBulkDeleteClick}>Delete Selected</Button>
          <Button size="small" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
            <Tab label="All Staff" />
            <Tab label="Technicians" />
            <Tab label="Weekly Schedule" />
          </Tabs>
        </Box>

        {/* Search bar (shown for list tabs) */}
        {selectedTab !== 2 && (
          <Box sx={{ mb: 2 }}>
            <TextField
              placeholder="Search staff by name, email, or phone..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 350 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><Search /></InputAdornment>
                ),
              }}
            />
          </Box>
        )}

        {loading ? <TableSkeleton rows={8} columns={7} /> : selectedTab === 2 ? (
          /* Weekly Schedule View */
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Technician</TableCell>
                  {dayNames.map((day) => (
                    <TableCell key={day} align="center">{day.substring(0, 3)}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {technicians.map((tech) => (
                  <TableRow key={tech.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          {tech.name.charAt(0)}
                        </Avatar>
                        <Typography variant="body2">{tech.name}</Typography>
                      </Box>
                    </TableCell>
                    {dayNames.map((_, dayIndex) => {
                      const scheduleEntry = mockSchedule.find(s => s.dayOfWeek === dayIndex);
                      return (
                        <TableCell key={dayIndex} align="center">
                          {scheduleEntry?.isWorking ? (
                            <Chip
                              label={`${scheduleEntry.startTime}-${scheduleEntry.endTime}`}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          ) : (
                            <Chip label="Off" size="small" variant="outlined" />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          /* Staff List View */
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedIds.size > 0 && selectedIds.size < filteredStaff.length}
                      checked={filteredStaff.length > 0 && selectedIds.size === filteredStaff.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Today</TableCell>
                  <TableCell>This Week</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow
                    key={member.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(member)}
                    selected={selectedIds.has(member.id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.has(member.id)}
                        onClick={(e) => handleSelectOne(member.id, e)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {member.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {member.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ROLES[member.role] || member.role}
                        size="small"
                        color={roleColors[member.role] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={LEVELS[member.level] || member.level || '-'}
                        size="small"
                        variant="outlined"
                        color={levelColors[member.level] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{member.phone || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {member.role === 'TECHNICIAN' ? (member.appointmentsToday ?? 0) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {member.role === 'TECHNICIAN' ? (member.appointmentsWeek ?? 0) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.active ? 'Active' : 'Inactive'}
                        size="small"
                        color={member.active ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Detail Drawer */}
      <Drawer anchor="right" open={detailOpen} onClose={() => setDetailOpen(false)}>
        <Box sx={{ width: 400, p: 3 }}>
          <Toolbar sx={{ justifyContent: 'space-between', px: 0, mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>Staff Details</Typography>
            <IconButton onClick={() => setDetailOpen(false)}><Close /></IconButton>
          </Toolbar>
          {detailStaff && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 24 }}>
                  {detailStaff.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={600}>{detailStaff.name}</Typography>
                  <Chip
                    label={ROLES[detailStaff.role] || detailStaff.role}
                    size="small"
                    color={roleColors[detailStaff.role] || 'default'}
                  />
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem>
                  <Email sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Email" secondary={detailStaff.email} />
                </ListItem>
                <ListItem>
                  <Phone sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Phone" secondary={detailStaff.phone || 'Not provided'} />
                </ListItem>
                <ListItem>
                  <Badge sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Role" secondary={ROLES[detailStaff.role] || detailStaff.role} />
                </ListItem>
                <ListItem>
                  <WorkspacePremium sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Level" secondary={LEVELS[detailStaff.level] || detailStaff.level || 'Not set'} />
                </ListItem>
                <ListItem>
                  <Translate sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Preferred Language" secondary={LANGUAGES[detailStaff.preferredLanguage] || detailStaff.preferredLanguage} />
                </ListItem>
                <ListItem>
                  <ToggleOn sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText primary="Status" secondary={detailStaff.active ? 'Active' : 'Inactive'} />
                </ListItem>
              </List>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" startIcon={<Edit />} onClick={() => handleEdit()} fullWidth>Edit</Button>
                <Button variant="outlined" color="error" startIcon={<Delete />} onClick={() => handleDeleteClick()} fullWidth>Delete</Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
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
              label="Email"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              label="Phone"
              fullWidth
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                label="Role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
              >
                <MenuItem value="OWNER">Owner</MenuItem>
                <MenuItem value="MANAGER">Manager</MenuItem>
                <MenuItem value="TECHNICIAN">Technician</MenuItem>
                <MenuItem value="FRONTDESK">Front Desk</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select
                label="Level"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as StaffLevel })}
              >
                <MenuItem value="JUNIOR">Junior</MenuItem>
                <MenuItem value="SENIOR">Senior</MenuItem>
                <MenuItem value="MASTER">Master</MenuItem>
                <MenuItem value="SPECIALIST">Specialist</MenuItem>
              </Select>
            </FormControl>
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
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.email}
          >
            {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Add Staff'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Schedule - {selectedStaff?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Day</TableCell>
                    <TableCell>Working</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dayNames.map((day, index) => {
                    const entry = schedule.find(s => s.dayOfWeek === index);
                    return (
                      <TableRow key={day}>
                        <TableCell>{day}</TableCell>
                        <TableCell>
                          <Switch defaultChecked={entry?.isWorking ?? false} />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="time"
                            size="small"
                            defaultValue={entry?.startTime || '09:00'}
                            disabled={!entry?.isWorking}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="time"
                            size="small"
                            defaultValue={entry?.endTime || '17:00'}
                            disabled={!entry?.isWorking}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Save Schedule</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmAction === 'bulkDelete' ? 'Delete Selected Staff' : 'Delete Staff Member'}
        message={confirmAction === 'bulkDelete'
          ? `Delete ${selectedIds.size} selected staff members? This action cannot be undone.`
          : `Delete ${selectedStaff?.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmAction === 'bulkDelete' ? handleBulkDelete : handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
}
