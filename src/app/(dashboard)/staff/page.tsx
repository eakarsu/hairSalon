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
  Avatar,
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
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add,
  Edit,
  Schedule,
  Person,
  CalendarMonth,
} from '@mui/icons-material';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  preferredLanguage: string;
  appointmentsToday: number;
  appointmentsWeek: number;
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

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'TECHNICIAN',
    preferredLanguage: 'en',
    active: true,
  });

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
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setSelectedStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'TECHNICIAN',
      preferredLanguage: 'en',
      active: true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save');

      setDialogOpen(false);
      fetchStaff();
    } catch (error) {
      console.error('Failed to save staff:', error);
    } finally {
      setSaving(false);
    }
  };

  // Mock data
  const mockStaff: StaffMember[] = staff.length > 0 ? staff : [
    { id: '1', name: 'Linda Nguyen', email: 'linda@elegantnails.com', phone: '(408) 555-0100', role: 'OWNER', active: true, preferredLanguage: 'vi', appointmentsToday: 0, appointmentsWeek: 0 },
    { id: '2', name: 'Maria Garcia', email: 'maria@elegantnails.com', phone: '(408) 555-0101', role: 'MANAGER', active: true, preferredLanguage: 'es', appointmentsToday: 0, appointmentsWeek: 0 },
    { id: '3', name: 'Kim Tran', email: 'kim@elegantnails.com', phone: '(408) 555-0102', role: 'TECHNICIAN', active: true, preferredLanguage: 'vi', appointmentsToday: 5, appointmentsWeek: 28 },
    { id: '4', name: 'Jenny Le', email: 'jenny@elegantnails.com', phone: '(408) 555-0103', role: 'TECHNICIAN', active: true, preferredLanguage: 'vi', appointmentsToday: 4, appointmentsWeek: 25 },
    { id: '5', name: 'David Chen', email: 'david@elegantnails.com', phone: '(408) 555-0104', role: 'TECHNICIAN', active: true, preferredLanguage: 'zh', appointmentsToday: 6, appointmentsWeek: 32 },
    { id: '6', name: 'Sarah Kim', email: 'sarah@elegantnails.com', phone: '(408) 555-0105', role: 'TECHNICIAN', active: true, preferredLanguage: 'ko', appointmentsToday: 3, appointmentsWeek: 20 },
    { id: '7', name: 'Emily Wilson', email: 'emily@elegantnails.com', phone: '(408) 555-0106', role: 'FRONTDESK', active: true, preferredLanguage: 'en', appointmentsToday: 0, appointmentsWeek: 0 },
  ];

  const mockSchedule: ScheduleEntry[] = [
    { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '19:00', isWorking: true },
    { id: '2', dayOfWeek: 2, startTime: '09:00', endTime: '19:00', isWorking: true },
    { id: '3', dayOfWeek: 3, startTime: '09:00', endTime: '19:00', isWorking: true },
    { id: '4', dayOfWeek: 4, startTime: '09:00', endTime: '19:00', isWorking: true },
    { id: '5', dayOfWeek: 5, startTime: '09:00', endTime: '19:00', isWorking: true },
    { id: '6', dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isWorking: true },
    { id: '7', dayOfWeek: 0, startTime: '10:00', endTime: '17:00', isWorking: false },
  ];

  const technicians = mockStaff.filter(s => s.role === 'TECHNICIAN');
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
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenDialog}>
          Add Staff
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Person color="primary" />
                <Typography variant="body2" color="text.secondary">Total Staff</Typography>
              </Box>
              <Typography variant="h4">{mockStaff.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Person color="success" />
                <Typography variant="body2" color="text.secondary">Technicians</Typography>
              </Box>
              <Typography variant="h4">{technicians.length}</Typography>
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

      <Paper sx={{ p: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
            <Tab label="All Staff" />
            <Tab label="Technicians" />
            <Tab label="Weekly Schedule" />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : selectedTab === 2 ? (
          /* Weekly Schedule View */
          <Box>
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
          </Box>
        ) : (
          /* Staff List View */
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Today</TableCell>
                  <TableCell>This Week</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(selectedTab === 1 ? technicians : mockStaff).map((member) => (
                  <TableRow key={member.id} hover>
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
                        label={member.role}
                        size="small"
                        color={roleColors[member.role]}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{member.phone || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {member.role === 'TECHNICIAN' ? member.appointmentsToday : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {member.role === 'TECHNICIAN' ? member.appointmentsWeek : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={member.active ? 'Active' : 'Inactive'}
                        size="small"
                        color={member.active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedStaff(member);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      {member.role === 'TECHNICIAN' && (
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedStaff(member);
                            setSchedule(mockSchedule);
                            setScheduleDialogOpen(true);
                          }}
                        >
                          <Schedule />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
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
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="OWNER">Owner</MenuItem>
                <MenuItem value="MANAGER">Manager</MenuItem>
                <MenuItem value="TECHNICIAN">Technician</MenuItem>
                <MenuItem value="FRONTDESK">Front Desk</MenuItem>
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
            {saving ? 'Saving...' : selectedStaff ? 'Save Changes' : 'Add Staff'}
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
    </Box>
  );
}
