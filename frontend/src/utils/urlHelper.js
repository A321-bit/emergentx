// URL Helper - Datasheet ve dosya URL'lerini doğru domain ile oluşturur
const API_URL = process.env.REACT_APP_BACKEND_URL;

export const getFileUrl = (url) => {
  if (!url) return null;
  
  // Eğer URL zaten /api/uploads ile başlıyorsa, API_URL ekle
  if (url.startsWith('/api/uploads/')) {
    return `${API_URL}${url}`;
  }
  
  // Eğer tam URL ise (http ile başlıyorsa), sadece dosya yolunu al ve yeni domain ile birleştir
  if (url.includes('/api/uploads/')) {
    const path = '/api/uploads/' + url.split('/api/uploads/')[1];
    return `${API_URL}${path}`;
  }
  
  // Diğer durumlar - olduğu gibi döndür
  return url.startsWith('http') ? url : `${API_URL}${url}`;
};

export default getFileUrl;
