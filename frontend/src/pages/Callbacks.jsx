import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Phone, CheckCircle, XCircle, Clock, User, Calendar, FileText,
  PhoneOff, PhoneMissed, PhoneCall, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Arama sonuç seçenekleri
const CALL_RESULTS = [
  { value: 'gorusme_saglandi', label: 'Görüşme Sağlandı', icon: PhoneCall, color: 'bg-green-500' },
  { value: 'ulasilamadi', label: 'Ulaşılamadı', icon: PhoneOff, color: 'bg-red-500' },
  { value: 'mesgul', label: 'Meşgul', icon: PhoneMissed, color: 'bg-orange-500' },
];

const Callbacks = () => {
  const { user } = useAuth();
  const [upcomingCalls, setUpcomingCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [callResult, setCallResult] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const canManage = user?.permissions?.includes('all') || user?.permissions?.includes('quotes_manage');

  useEffect(() => {
    fetchUpcomingCalls();
  }, []);

  const fetchUpcomingCalls = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/quotes/all-upcoming-calls`);
      setUpcomingCalls(response.data || []);
    } catch (error) {
      toast.error('Aranacaklar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const openCompleteModal = (call) => {
    setSelectedCall(call);
    setCallResult('');
    setResultNotes('');
    setCompleteModalOpen(true);
  };

  const handleCompleteCall = async () => {
    if (!callResult) {
      toast.error('Lütfen arama sonucunu seçin');
      return;
    }

    try {
      const resultLabel = CALL_RESULTS.find(r => r.value === callResult)?.label || callResult;
      const fullNotes = resultNotes ? `${resultLabel}: ${resultNotes}` : resultLabel;
      
      await axios.put(`${API_URL}/api/quotes/${selectedCall.quote_id}/call-logs/${selectedCall.call_id}/complete`, {
        result_notes: fullNotes,
        result_status: callResult
      });
      
      toast.success('Arama tamamlandı');
      setCompleteModalOpen(false);
      fetchUpcomingCalls();
    } catch (error) {
      toast.error('İşlem başarısız');
    }
  };

  const formatDateTR = (dateStr) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  };

  const isCallDue = (date, time) => {
    const now = new Date();
    const callDateTime = new Date(`${date}T${time}:00`);
    return callDateTime <= now;
  };

  const filteredCalls = upcomingCalls.filter(call => {
    if (filterDate) {
      return call.scheduled_date === filterDate;
    }
    return true;
  });

  // Bugün, yarın ve gecikmiş olanları ayır
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  const overdueCalls = filteredCalls.filter(c => c.scheduled_date < today);
  const todayCalls = filteredCalls.filter(c => c.scheduled_date === today);
  const tomorrowCalls = filteredCalls.filter(c => c.scheduled_date === tomorrow);
  const futureCalls = filteredCalls.filter(c => c.scheduled_date > tomorrow);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-10 w-10" />
      </div>
    );
  }

  const renderCallsTable = (calls, title, titleColor, showCompleteButton = true) => {
    if (calls.length === 0) return null;
    
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className={cn("text-lg flex items-center gap-2", titleColor)}>
            {title === 'Gecikmiş' && <AlertCircle className="h-5 w-5" />}
            {title === 'Bugün' && <Clock className="h-5 w-5" />}
            {title === 'Yarın' && <Calendar className="h-5 w-5" />}
            {title === 'İleriki Tarihler' && <Calendar className="h-5 w-5" />}
            {title} ({calls.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Tarih</TableHead>
                <TableHead className="w-20">Saat</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Teklif No</TableHead>
                <TableHead>Sorumlu</TableHead>
                <TableHead>Not</TableHead>
                {showCompleteButton && <TableHead className="text-right w-36">İşlem</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => {
                const isDue = isCallDue(call.scheduled_date, call.scheduled_time);
                const isOverdue = call.scheduled_date < today;
                
                return (
                  <TableRow key={call.call_id} className={cn(isOverdue && "bg-red-50 dark:bg-red-950/20")}>
                    <TableCell className={cn("font-medium", isOverdue && "text-red-600")}>
                      {formatDateTR(call.scheduled_date)}
                    </TableCell>
                    <TableCell className={cn(isOverdue && "text-red-600")}>
                      {call.scheduled_time}
                    </TableCell>
                    <TableCell className="font-medium">{call.customer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{call.quote_number}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {call.responsible}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate" title={call.notes}>
                      {call.notes || '-'}
                    </TableCell>
                    {showCompleteButton && (
                      <TableCell className="text-right">
                        {isDue && canManage ? (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openCompleteModal(call)}
                          >
                            <Phone className="h-4 w-4 mr-1" />
                            Arandı
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            Bekliyor
                          </Badge>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="callbacks-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Phone className="h-8 w-8 text-green-600" />
            Aranacaklar
          </h1>
          <p className="text-muted-foreground mt-1">
            {upcomingCalls.length} bekleyen arama
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Tarih Filtresi:</Label>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-40"
          />
          {filterDate && (
            <Button variant="ghost" size="sm" onClick={() => setFilterDate('')}>
              Temizle
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn(overdueCalls.length > 0 && "border-red-300 bg-red-50/50 dark:bg-red-950/20")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500 bg-opacity-20">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{overdueCalls.length}</p>
              <p className="text-sm text-muted-foreground">Gecikmiş</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(todayCalls.length > 0 && "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500 bg-opacity-20">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{todayCalls.length}</p>
              <p className="text-sm text-muted-foreground">Bugün</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 bg-opacity-20">
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tomorrowCalls.length}</p>
              <p className="text-sm text-muted-foreground">Yarın</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-500 bg-opacity-20">
              <Calendar className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{futureCalls.length}</p>
              <p className="text-sm text-muted-foreground">İleri Tarih</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No calls message */}
      {upcomingCalls.length === 0 && (
        <Card className="p-8 text-center">
          <Phone className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-lg text-muted-foreground">Bekleyen arama bulunmuyor</p>
          <p className="text-sm text-muted-foreground mt-1">
            Teklifler sayfasından arama planlayabilirsiniz
          </p>
        </Card>
      )}

      {/* Call Tables by Category */}
      {renderCallsTable(overdueCalls, 'Gecikmiş', 'text-red-600')}
      {renderCallsTable(todayCalls, 'Bugün', 'text-blue-600')}
      {renderCallsTable(tomorrowCalls, 'Yarın', 'text-amber-600')}
      {renderCallsTable(futureCalls, 'İleriki Tarihler', 'text-gray-600', false)}

      {/* Complete Call Modal */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              Arama Sonucu
            </DialogTitle>
          </DialogHeader>
          
          {selectedCall && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <p className="font-medium">{selectedCall.customer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCall.quote_number} • {formatDateTR(selectedCall.scheduled_date)} {selectedCall.scheduled_time}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Arama Sonucu *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {CALL_RESULTS.map((result) => {
                    const Icon = result.icon;
                    const isSelected = callResult === result.value;
                    return (
                      <Button
                        key={result.value}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "flex flex-col h-auto py-3 gap-1",
                          isSelected && result.color
                        )}
                        onClick={() => setCallResult(result.value)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{result.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Not (Opsiyonel)</Label>
                <Textarea
                  placeholder="Görüşme detayları, yapılacaklar..."
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModalOpen(false)}>İptal</Button>
            <Button onClick={handleCompleteCall} className="bg-green-600 hover:bg-green-700">
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Callbacks;
