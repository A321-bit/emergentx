import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount, currency = "TRY") => {
  const symbols = {
    TRY: "₺",
    USD: "$",
    EUR: "€"
  };
  
  const formatter = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${symbols[currency] || "₺"}${formatter.format(amount)}`;
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
};

export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export const getStatusLabel = (status) => {
  const labels = {
    teklif_gonderildi: "Teklif Gönderildi",
    onaylandi: "Onaylandı",
    satisa_dondu: "Satışa Döndü",
    iptal: "İptal"
  };
  return labels[status] || status;
};

export const getStatusClass = (status) => {
  const classes = {
    teklif_gonderildi: "pending",
    onaylandi: "approved",
    satisa_dondu: "converted",
    iptal: "cancelled"
  };
  return classes[status] || "pending";
};

export const getRoleLabel = (role) => {
  const labels = {
    admin: "Yönetici",
    personel: "Personel",
    bayi: "Bayi"
  };
  return labels[role] || role;
};

export const getCategoryLabel = (category) => {
  const labels = {
    panel: "Panel",
    inverter: "İnverter",
    batarya: "Batarya",
    aksesuar: "Aksesuar"
  };
  return labels[category] || category;
};

export const getCustomerTypeLabel = (type) => {
  const labels = {
    villa: "Villa",
    isletme: "İşletme",
    fabrika: "Fabrika"
  };
  return labels[type] || type;
};
