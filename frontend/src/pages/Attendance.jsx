import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { ChevronLeft, ChevronRight, Check, X, Clock, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_OPTIONS = [
  { value: 'present', label: 'Geldi', color: 'bg-green-500', icon: Check },
  { value: 'absent', label: 'Gelmedi', color: 'bg-red-500', icon: X },
  { value: 'half_day', label: 'Yarım Gün', color: 'bg-amber-500', icon: Clock },
  { value: 'leave', label: 'İzin', color: 'bg-blue-500', icon: Calendar },
  { value: 'sick', label: 'Rapor', color: 'bg-purple-500', icon: AlertCircle },
];

const getStatusInfo = (status) => {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
};

const Attendance = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('hr_manage');

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  useEffect(() => {
    fetchData();
  }, [monthStr]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, attRes] = await Promise.all([
        axios.get(`${API_URL}/api/employees`),
        axios.get(`${API_URL}/api/attendance?month=${monthStr}`)
      ]);
      setEmployees(empRes.data);
      setAttendance(attRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    return new Date(currentYear, currentMonth, 1).getDay();
  };

  const getAttendanceForDay = (employeeId, day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = attendance.find(a => a.employee_id === employeeId && a.date === dateStr);
    
    // Varsayılan olarak "geldi" (present) kabul ediyoruz - yalnızca gelmeyenler işaretlenecek
    if (!existing) {
      const date = new Date(currentYear, currentMonth, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Sadece bugün veya geçmiş günler için varsayılan geldi göster
      if (date <= today) {
        return { employee_id: employeeId, date: dateStr, status: 'present', is_default: true };
      }
      return null;
    }
    return existing;
  };

  const handleStatusChange = async (employeeId, day, status) => {
    if (!canManage) return;
    
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    try {
      setSaving(true);
      await axios.post(`${API_URL}/api/attendance`, {
        employee_id: employeeId,
        employee_name: employee.name,
        date: dateStr,
        status: status
      });
      
      // Update local state
      const existingIndex = attendance.findIndex(a => a.employee_id === employeeId && a.date === dateStr);
      if (existingIndex >= 0) {
        const newAttendance = [...attendance];
        newAttendance[existingIndex] = { ...newAttendance[existingIndex], status };
        setAttendance(newAttendance);
      } else {
        setAttendance([...attendance, { employee_id: employeeId, employee_name: employee.name, date: dateStr, status }]);
      }
      
      toast.success('Kaydedildi');
    } catch (error) {
      toast.error('Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getMonthName = () => {
    return currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  };

  const filteredEmployees = selectedEmployee === 'all' 
    ? employees 
    : employees.filter(e => e.id === selectedEmployee);

  // Calculate stats for selected employee(s)
  const calculateStats = (employeeId) => {
    const empAttendance = attendance.filter(a => a.employee_id === employeeId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Ay içindeki geçmiş günleri hesapla
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    let workingDays = 0;
    
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      if (date <= today) {
        workingDays++;
      }
    }
    
    // Kayıtlı devamsızlıkları say
    const recordedAbsent = empAttendance.filter(a => a.status === 'absent').length;
    const recordedHalfDay = empAttendance.filter(a => a.status === 'half_day').length;
    const recordedLeave = empAttendance.filter(a => a.status === 'leave').length;
    const recordedSick = empAttendance.filter(a => a.status === 'sick').length;
    const recordedPresent = empAttendance.filter(a => a.status === 'present').length;
    
    // Kaydı olmayan günler = varsayılan geldi
    const totalRecordedDays = recordedAbsent + recordedHalfDay + recordedLeave + recordedSick + recordedPresent;
    const defaultPresentDays = Math.max(0, workingDays - totalRecordedDays);
    
    return {
      present: recordedPresent + defaultPresentDays,
      absent: recordedAbsent,
      half_day: recordedHalfDay,
      leave: recordedLeave,
      sick: recordedSick,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  const daysInMonth = getDaysInMonth();
  const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="attendance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Puantaj / Devam Takibi</h1>
          <p className="text-muted-foreground mt-1">Personel devam durumlarını yönetin</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="w-48 text-center font-semibold text-lg capitalize">
            {getMonthName()}
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Employee Filter */}
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Personel Seçin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Personel</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {STATUS_OPTIONS.map((status) => (
            <div key={status.value} className="flex items-center gap-1">
              <div className={cn("w-3 h-3 rounded-full", status.color)} />
              <span className="text-xs text-muted-foreground">{status.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid for Each Employee */}
      {filteredEmployees.map((employee) => {
        const stats = calculateStats(employee.id);
        
        return (
          <Card key={employee.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{employee.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{employee.position} • {employee.employee_no}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Geldi: {stats.present}
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    Gelmedi: {stats.absent}
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700">
                    Yarım: {stats.half_day}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    İzin: {stats.leave}
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    Rapor: {stats.sick}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day, i) => (
                  <div 
                    key={day} 
                    className={cn(
                      "text-center text-xs font-medium py-1",
                      i >= 5 ? "text-red-500" : "text-muted-foreground"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: (getFirstDayOfMonth() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-12" />
                ))}
                
                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(currentYear, currentMonth, day);
                  const dayOfWeek = dateObj.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const att = getAttendanceForDay(employee.id, day);
                  const statusInfo = att ? getStatusInfo(att.status) : null;
                  const StatusIcon = statusInfo?.icon;
                  
                  return (
                    <div
                      key={day}
                      className={cn(
                        "relative h-12 border rounded-md flex flex-col items-center justify-center cursor-pointer transition-all hover:border-primary",
                        isWeekend && "bg-slate-50 dark:bg-slate-800/50",
                        att && "border-2",
                        att?.status === 'present' && "border-green-500 bg-green-50 dark:bg-green-900/20",
                        att?.status === 'absent' && "border-red-500 bg-red-50 dark:bg-red-900/20",
                        att?.status === 'half_day' && "border-amber-500 bg-amber-50 dark:bg-amber-900/20",
                        att?.status === 'leave' && "border-blue-500 bg-blue-50 dark:bg-blue-900/20",
                        att?.status === 'sick' && "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                      )}
                    >
                      <span className={cn("text-sm font-medium", isWeekend && "text-red-500")}>
                        {day}
                      </span>
                      {StatusIcon && (
                        <StatusIcon className={cn("h-3 w-3 mt-0.5", 
                          att?.status === 'present' && "text-green-600",
                          att?.status === 'absent' && "text-red-600",
                          att?.status === 'half_day' && "text-amber-600",
                          att?.status === 'leave' && "text-blue-600",
                          att?.status === 'sick' && "text-purple-600"
                        )} />
                      )}
                      
                      {/* Dropdown on click */}
                      {canManage && (
                        <Select
                          value={att?.status || ''}
                          onValueChange={(value) => handleStatusChange(employee.id, day, value)}
                        >
                          <SelectTrigger className="absolute inset-0 opacity-0 cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", status.color)} />
                                  {status.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Henüz personel kaydı yok
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Attendance;
