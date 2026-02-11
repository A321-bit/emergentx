import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Building2, CreditCard, Landmark, Plus, Edit, Trash2, 
  Wallet, TrendingUp, TrendingDown, AlertTriangle, Calendar,
  DollarSign, Euro, Coins, Banknote, RefreshCw, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Textarea } from '../components/ui/textarea';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Banks = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [loans, setLoans] = useState([]);
  
  // Modal states
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form data
  const [bankForm, setBankForm] = useState({
    bank_name: '', account_name: '', account_type: 'vadesiz', balance: '', currency: 'TRY', iban: '', notes: ''
  });
  const [cardForm, setCardForm] = useState({
    card_name: '', bank_name: '', total_limit: '', current_debt: '', statement_date: '', due_date: '', notes: ''
  });
  const [loanForm, setLoanForm] = useState({
    loan_name: '', bank_name: '', total_amount: '', remaining_amount: '', monthly_payment: '',
    total_installments: '', paid_installments: '0', interest_rate: '', start_date: '', payment_day: '', notes: ''
  });

  const formatCurrency = (amount, currency = 'TRY') => {
    if (currency === 'XAU') return `${amount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} gr`;
    const symbols = { TRY: '₺', USD: '$', EUR: '€' };
    return `${symbols[currency] || '₺'}${amount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, accountsRes, cardsRes, loansRes] = await Promise.all([
        axios.get(`${API_URL}/api/financial-summary`),
        axios.get(`${API_URL}/api/bank-accounts`),
        axios.get(`${API_URL}/api/credit-cards`),
        axios.get(`${API_URL}/api/loans`)
      ]);
      setSummary(summaryRes.data);
      setBankAccounts(accountsRes.data);
      setCreditCards(cardsRes.data);
      setLoans(loansRes.data);
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Bank Account handlers
  const handleSaveBankAccount = async () => {
    try {
      const data = { ...bankForm, balance: parseFloat(bankForm.balance) || 0 };
      if (editingItem) {
        await axios.put(`${API_URL}/api/bank-accounts/${editingItem.id}`, data);
        toast.success('Hesap güncellendi');
      } else {
        await axios.post(`${API_URL}/api/bank-accounts`, data);
        toast.success('Hesap eklendi');
      }
      setIsBankModalOpen(false);
      setEditingItem(null);
      setBankForm({ bank_name: '', account_name: '', account_type: 'vadesiz', balance: '', currency: 'TRY', iban: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Kaydetme hatası');
    }
  };

  const handleEditBank = (account) => {
    setEditingItem(account);
    setBankForm({
      bank_name: account.bank_name || '',
      account_name: account.account_name || '',
      account_type: account.account_type || 'vadesiz',
      balance: account.balance?.toString() || '',
      currency: account.currency || 'TRY',
      iban: account.iban || '',
      notes: account.notes || ''
    });
    setIsBankModalOpen(true);
  };

  const handleDeleteBank = async (id) => {
    if (!window.confirm('Bu hesabı silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/bank-accounts/${id}`);
      toast.success('Hesap silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme hatası');
    }
  };

  // Credit Card handlers
  const handleSaveCreditCard = async () => {
    try {
      const data = {
        ...cardForm,
        total_limit: parseFloat(cardForm.total_limit) || 0,
        current_debt: parseFloat(cardForm.current_debt) || 0,
        statement_date: parseInt(cardForm.statement_date) || 1,
        due_date: parseInt(cardForm.due_date) || 1
      };
      if (editingItem) {
        await axios.put(`${API_URL}/api/credit-cards/${editingItem.id}`, data);
        toast.success('Kart güncellendi');
      } else {
        await axios.post(`${API_URL}/api/credit-cards`, data);
        toast.success('Kart eklendi');
      }
      setIsCardModalOpen(false);
      setEditingItem(null);
      setCardForm({ card_name: '', bank_name: '', total_limit: '', current_debt: '', statement_date: '', due_date: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Kaydetme hatası');
    }
  };

  const handleEditCard = (card) => {
    setEditingItem(card);
    setCardForm({
      card_name: card.card_name || '',
      bank_name: card.bank_name || '',
      total_limit: card.total_limit?.toString() || '',
      current_debt: card.current_debt?.toString() || '',
      statement_date: card.statement_date?.toString() || '',
      due_date: card.due_date?.toString() || '',
      notes: card.notes || ''
    });
    setIsCardModalOpen(true);
  };

  const handleDeleteCard = async (id) => {
    if (!window.confirm('Bu kartı silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/credit-cards/${id}`);
      toast.success('Kart silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme hatası');
    }
  };

  // Loan handlers
  const handleSaveLoan = async () => {
    try {
      const data = {
        ...loanForm,
        total_amount: parseFloat(loanForm.total_amount) || 0,
        remaining_amount: parseFloat(loanForm.remaining_amount) || 0,
        monthly_payment: parseFloat(loanForm.monthly_payment) || 0,
        total_installments: parseInt(loanForm.total_installments) || 0,
        paid_installments: parseInt(loanForm.paid_installments) || 0,
        interest_rate: parseFloat(loanForm.interest_rate) || null,
        payment_day: parseInt(loanForm.payment_day) || 1
      };
      if (editingItem) {
        await axios.put(`${API_URL}/api/loans/${editingItem.id}`, data);
        toast.success('Kredi güncellendi');
      } else {
        await axios.post(`${API_URL}/api/loans`, data);
        toast.success('Kredi eklendi');
      }
      setIsLoanModalOpen(false);
      setEditingItem(null);
      setLoanForm({ loan_name: '', bank_name: '', total_amount: '', remaining_amount: '', monthly_payment: '', total_installments: '', paid_installments: '0', interest_rate: '', start_date: '', payment_day: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Kaydetme hatası');
    }
  };

  const handleEditLoan = (loan) => {
    setEditingItem(loan);
    setLoanForm({
      loan_name: loan.loan_name || '',
      bank_name: loan.bank_name || '',
      total_amount: loan.total_amount?.toString() || '',
      remaining_amount: loan.remaining_amount?.toString() || '',
      monthly_payment: loan.monthly_payment?.toString() || '',
      total_installments: loan.total_installments?.toString() || '',
      paid_installments: loan.paid_installments?.toString() || '0',
      interest_rate: loan.interest_rate?.toString() || '',
      start_date: loan.start_date || '',
      payment_day: loan.payment_day?.toString() || '',
      notes: loan.notes || ''
    });
    setIsLoanModalOpen(true);
  };

  const handleDeleteLoan = async (id) => {
    if (!window.confirm('Bu krediyi silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/loans/${id}`);
      toast.success('Kredi silindi');
      fetchData();
    } catch (error) {
      toast.error('Silme hatası');
    }
  };

  const handlePayInstallment = async (loanId) => {
    if (!window.confirm('Bu taksiti ödendi olarak işaretlemek istiyor musunuz?')) return;
    try {
      await axios.put(`${API_URL}/api/loans/${loanId}/pay-installment`);
      toast.success('Taksit ödendi olarak işaretlendi');
      fetchData();
    } catch (error) {
      toast.error('İşlem hatası');
    }
  };

  const getCurrencyIcon = (currency) => {
    switch(currency) {
      case 'USD': return <DollarSign className="h-4 w-4" />;
      case 'EUR': return <Euro className="h-4 w-4" />;
      case 'XAU': return <Coins className="h-4 w-4" />;
      default: return <Banknote className="h-4 w-4" />;
    }
  };

  const getAccountTypeLabel = (type) => {
    const types = { vadesiz: 'Vadesiz', vadeli: 'Vadeli', altin: 'Altın Hesabı', doviz: 'Döviz Hesabı' };
    return types[type] || type;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="spinner h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="banks-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bankalar & Finansal Durum</h1>
          <p className="text-muted-foreground">Banka hesapları, kredi kartları ve kredilerinizi yönetin</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Yenile
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${summary?.net_worth >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'} text-white border-0`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">Net Varlık</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.net_worth)}</p>
                <p className="text-xs text-green-200 mt-1">Varlık - Borç</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                {summary?.net_worth >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Toplam Varlık</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.total_assets_try)}</p>
                <p className="text-xs text-blue-200 mt-1">{bankAccounts.length} hesap</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs">Kredi Kartı Borcu</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.total_card_debt)}</p>
                <p className="text-xs text-orange-200 mt-1">Limit: {formatCurrency(summary?.total_card_limit)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs">Kredi Borcu</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.total_loan_debt)}</p>
                <p className="text-xs text-purple-200 mt-1">Aylık: {formatCurrency(summary?.monthly_loan_payments)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Landmark className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings & Upcoming Payments */}
      {(summary?.warnings?.length > 0 || summary?.upcoming_payments?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {summary?.warnings?.length > 0 && (
            <Card className="border-orange-300 bg-orange-50 dark:bg-orange-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" /> Uyarılar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant={w.severity === 'high' ? 'destructive' : 'secondary'}>{w.severity === 'high' ? 'Kritik' : 'Orta'}</Badge>
                      <span>{w.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {summary?.upcoming_payments?.length > 0 && (
            <Card className="border-blue-300 bg-blue-50 dark:bg-blue-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Calendar className="h-4 w-4" /> Yaklaşan Ödemeler (7 gün)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.upcoming_payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {p.type === 'credit_card' ? <CreditCard className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                        <span>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(p.amount)}</span>
                        <Badge variant="outline">{p.days_until === 0 ? 'Bugün' : `${p.days_until} gün`}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs for Bank Accounts, Credit Cards, Loans */}
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Banka Hesapları
          </TabsTrigger>
          <TabsTrigger value="cards" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Kredi Kartları
          </TabsTrigger>
          <TabsTrigger value="loans" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" /> Krediler
          </TabsTrigger>
        </TabsList>

        {/* Bank Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Banka Hesapları</CardTitle>
                <CardDescription>Tüm banka hesaplarınızı yönetin</CardDescription>
              </div>
              <Button onClick={() => { setEditingItem(null); setBankForm({ bank_name: '', account_name: '', account_type: 'vadesiz', balance: '', currency: 'TRY', iban: '', notes: '' }); setIsBankModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Yeni Hesap
              </Button>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz banka hesabı eklenmemiş</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bankAccounts.map(account => (
                    <Card key={account.id} className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getCurrencyIcon(account.currency)}
                            <div>
                              <p className="font-medium">{account.bank_name}</p>
                              <p className="text-xs text-muted-foreground">{account.account_name}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{getAccountTypeLabel(account.account_type)}</Badge>
                        </div>
                        <div className="mt-4">
                          <p className="text-2xl font-bold">{formatCurrency(account.balance, account.currency)}</p>
                          {account.iban && <p className="text-xs text-muted-foreground mt-1">{account.iban}</p>}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" onClick={() => handleEditBank(account)}>
                            <Edit className="h-3 w-3 mr-1" /> Düzenle
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteBank(account.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit Cards Tab */}
        <TabsContent value="cards">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Kredi Kartları</CardTitle>
                <CardDescription>Kredi kartlarınızı ve borçlarınızı takip edin</CardDescription>
              </div>
              <Button onClick={() => { setEditingItem(null); setCardForm({ card_name: '', bank_name: '', total_limit: '', current_debt: '', statement_date: '', due_date: '', notes: '' }); setIsCardModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Yeni Kart
              </Button>
            </CardHeader>
            <CardContent>
              {creditCards.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz kredi kartı eklenmemiş</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {creditCards.map(card => (
                    <Card key={card.id} className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{card.card_name}</p>
                            <p className="text-xs text-muted-foreground">{card.bank_name}</p>
                          </div>
                          <Badge variant={card.usage_percent >= 80 ? 'destructive' : card.usage_percent >= 50 ? 'secondary' : 'outline'}>
                            %{card.usage_percent} kullanım
                          </Badge>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Borç:</span>
                            <span className="font-bold text-red-600">{formatCurrency(card.current_debt)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Limit:</span>
                            <span>{formatCurrency(card.total_limit)}</span>
                          </div>
                          <Progress value={card.usage_percent} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Hesap Kesim: {card.statement_date}. gün</span>
                            <span>Son Ödeme: {card.due_date}. gün</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" onClick={() => handleEditCard(card)}>
                            <Edit className="h-3 w-3 mr-1" /> Düzenle
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteCard(card.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Krediler</CardTitle>
                <CardDescription>Çektiğiniz kredileri ve taksitleri takip edin</CardDescription>
              </div>
              <Button onClick={() => { setEditingItem(null); setLoanForm({ loan_name: '', bank_name: '', total_amount: '', remaining_amount: '', monthly_payment: '', total_installments: '', paid_installments: '0', interest_rate: '', start_date: '', payment_day: '', notes: '' }); setIsLoanModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Yeni Kredi
              </Button>
            </CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Henüz kredi eklenmemiş</p>
              ) : (
                <div className="space-y-4">
                  {loans.map(loan => (
                    <Card key={loan.id} className="border shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Landmark className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">{loan.loan_name}</p>
                                <p className="text-xs text-muted-foreground">{loan.bank_name}</p>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                            <div>
                              <p className="text-xs text-muted-foreground">Kalan Borç</p>
                              <p className="font-bold text-red-600">{formatCurrency(loan.remaining_amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Aylık Taksit</p>
                              <p className="font-bold">{formatCurrency(loan.monthly_payment)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Taksit</p>
                              <p className="font-bold">{loan.paid_installments}/{loan.total_installments}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Ödeme Günü</p>
                              <p className="font-bold">{loan.payment_day}. gün</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handlePayInstallment(loan.id)}>
                              <Check className="h-3 w-3 mr-1" /> Taksit Öde
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditLoan(loan)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteLoan(loan.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Progress value={(loan.paid_installments / loan.total_installments) * 100} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {loan.remaining_installments} taksit kaldı
                            {loan.interest_rate && ` • Faiz: %${loan.interest_rate}`}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bank Account Modal */}
      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Hesabı Düzenle' : 'Yeni Banka Hesabı'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Banka Adı</Label>
                <Input value={bankForm.bank_name} onChange={e => setBankForm({...bankForm, bank_name: e.target.value})} placeholder="Örn: Ziraat Bankası" />
              </div>
              <div>
                <Label>Hesap Adı</Label>
                <Input value={bankForm.account_name} onChange={e => setBankForm({...bankForm, account_name: e.target.value})} placeholder="Örn: Ana Hesap" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hesap Türü</Label>
                <Select value={bankForm.account_type} onValueChange={v => setBankForm({...bankForm, account_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vadesiz">Vadesiz</SelectItem>
                    <SelectItem value="vadeli">Vadeli</SelectItem>
                    <SelectItem value="altin">Altın Hesabı</SelectItem>
                    <SelectItem value="doviz">Döviz Hesabı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Para Birimi</Label>
                <Select value={bankForm.currency} onValueChange={v => setBankForm({...bankForm, currency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="XAU">Altın (gr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Bakiye</Label>
              <Input type="number" value={bankForm.balance} onChange={e => setBankForm({...bankForm, balance: e.target.value})} placeholder="0.00" />
            </div>
            <div>
              <Label>IBAN (Opsiyonel)</Label>
              <Input value={bankForm.iban} onChange={e => setBankForm({...bankForm, iban: e.target.value})} placeholder="TR..." />
            </div>
            <div>
              <Label>Not (Opsiyonel)</Label>
              <Textarea value={bankForm.notes} onChange={e => setBankForm({...bankForm, notes: e.target.value})} placeholder="Ek bilgiler..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBankModalOpen(false)}>İptal</Button>
            <Button onClick={handleSaveBankAccount}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Card Modal */}
      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Kartı Düzenle' : 'Yeni Kredi Kartı'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kart Adı</Label>
                <Input value={cardForm.card_name} onChange={e => setCardForm({...cardForm, card_name: e.target.value})} placeholder="Örn: Maximum Kart" />
              </div>
              <div>
                <Label>Banka Adı</Label>
                <Input value={cardForm.bank_name} onChange={e => setCardForm({...cardForm, bank_name: e.target.value})} placeholder="Örn: İş Bankası" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Toplam Limit (₺)</Label>
                <Input type="number" value={cardForm.total_limit} onChange={e => setCardForm({...cardForm, total_limit: e.target.value})} placeholder="50000" />
              </div>
              <div>
                <Label>Güncel Borç (₺)</Label>
                <Input type="number" value={cardForm.current_debt} onChange={e => setCardForm({...cardForm, current_debt: e.target.value})} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hesap Kesim Günü</Label>
                <Input type="number" min="1" max="31" value={cardForm.statement_date} onChange={e => setCardForm({...cardForm, statement_date: e.target.value})} placeholder="15" />
              </div>
              <div>
                <Label>Son Ödeme Günü</Label>
                <Input type="number" min="1" max="31" value={cardForm.due_date} onChange={e => setCardForm({...cardForm, due_date: e.target.value})} placeholder="25" />
              </div>
            </div>
            <div>
              <Label>Not (Opsiyonel)</Label>
              <Textarea value={cardForm.notes} onChange={e => setCardForm({...cardForm, notes: e.target.value})} placeholder="Ek bilgiler..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCardModalOpen(false)}>İptal</Button>
            <Button onClick={handleSaveCreditCard}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Modal */}
      <Dialog open={isLoanModalOpen} onOpenChange={setIsLoanModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Krediyi Düzenle' : 'Yeni Kredi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kredi Adı</Label>
                <Input value={loanForm.loan_name} onChange={e => setLoanForm({...loanForm, loan_name: e.target.value})} placeholder="Örn: Konut Kredisi" />
              </div>
              <div>
                <Label>Banka Adı</Label>
                <Input value={loanForm.bank_name} onChange={e => setLoanForm({...loanForm, bank_name: e.target.value})} placeholder="Örn: Garanti" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Toplam Kredi Tutarı (₺)</Label>
                <Input type="number" value={loanForm.total_amount} onChange={e => setLoanForm({...loanForm, total_amount: e.target.value})} placeholder="500000" />
              </div>
              <div>
                <Label>Kalan Borç (₺)</Label>
                <Input type="number" value={loanForm.remaining_amount} onChange={e => setLoanForm({...loanForm, remaining_amount: e.target.value})} placeholder="450000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Aylık Taksit (₺)</Label>
                <Input type="number" value={loanForm.monthly_payment} onChange={e => setLoanForm({...loanForm, monthly_payment: e.target.value})} placeholder="15000" />
              </div>
              <div>
                <Label>Faiz Oranı (%) - Opsiyonel</Label>
                <Input type="number" step="0.01" value={loanForm.interest_rate} onChange={e => setLoanForm({...loanForm, interest_rate: e.target.value})} placeholder="2.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Toplam Taksit Sayısı</Label>
                <Input type="number" value={loanForm.total_installments} onChange={e => setLoanForm({...loanForm, total_installments: e.target.value})} placeholder="36" />
              </div>
              <div>
                <Label>Ödenen Taksit Sayısı</Label>
                <Input type="number" value={loanForm.paid_installments} onChange={e => setLoanForm({...loanForm, paid_installments: e.target.value})} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Başlangıç Tarihi</Label>
                <Input type="date" value={loanForm.start_date} onChange={e => setLoanForm({...loanForm, start_date: e.target.value})} />
              </div>
              <div>
                <Label>Ödeme Günü (1-31)</Label>
                <Input type="number" min="1" max="31" value={loanForm.payment_day} onChange={e => setLoanForm({...loanForm, payment_day: e.target.value})} placeholder="15" />
              </div>
            </div>
            <div>
              <Label>Not (Opsiyonel)</Label>
              <Textarea value={loanForm.notes} onChange={e => setLoanForm({...loanForm, notes: e.target.value})} placeholder="Ek bilgiler..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLoanModalOpen(false)}>İptal</Button>
            <Button onClick={handleSaveLoan}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Banks;
