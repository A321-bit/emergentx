"""
Solar Energy Sales System - PDF Quote Generation Tests
Tests for PDF endpoint /api/quotes/{id}/pdf
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPDFGeneration:
    """PDF Quote Generation endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a quote with items for testing
        quotes_response = self.session.get(f"{BASE_URL}/api/quotes")
        assert quotes_response.status_code == 200
        
        quotes = quotes_response.json()
        # Find a quote with items and total_tl
        self.test_quote = None
        for q in quotes:
            if q.get('items') and len(q.get('items', [])) > 0 and q.get('total_tl'):
                self.test_quote = q
                break
        
        if not self.test_quote:
            pytest.skip("No quote with items found for testing")
    
    def test_pdf_endpoint_returns_200(self):
        """Test that PDF endpoint returns 200 status code"""
        quote_id = self.test_quote['id']
        response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}/pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"SUCCESS: PDF endpoint returned 200 for quote {quote_id}")
    
    def test_pdf_content_type(self):
        """Test that PDF endpoint returns correct content type"""
        quote_id = self.test_quote['id']
        response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}/pdf")
        
        assert response.status_code == 200
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected application/pdf, got {content_type}"
        print(f"SUCCESS: Content-Type is application/pdf")
    
    def test_pdf_content_disposition(self):
        """Test that PDF has correct filename in Content-Disposition header"""
        quote_id = self.test_quote['id']
        quote_number = self.test_quote.get('quote_number', '')
        
        response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}/pdf")
        
        assert response.status_code == 200
        content_disposition = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disposition, f"Expected attachment, got {content_disposition}"
        assert 'Teklif_' in content_disposition, f"Expected Teklif_ in filename, got {content_disposition}"
        print(f"SUCCESS: Content-Disposition header is correct: {content_disposition}")
    
    def test_pdf_is_valid(self):
        """Test that returned content is a valid PDF (starts with %PDF)"""
        quote_id = self.test_quote['id']
        response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}/pdf")
        
        assert response.status_code == 200
        content = response.content
        assert content[:4] == b'%PDF', f"PDF should start with %PDF, got {content[:10]}"
        print(f"SUCCESS: PDF content is valid (starts with %PDF)")
    
    def test_pdf_has_reasonable_size(self):
        """Test that PDF has reasonable size (not empty, not too small)"""
        quote_id = self.test_quote['id']
        response = self.session.get(f"{BASE_URL}/api/quotes/{quote_id}/pdf")
        
        assert response.status_code == 200
        content_length = len(response.content)
        # PDF should be at least 1KB (cover page + content)
        assert content_length > 1024, f"PDF too small: {content_length} bytes"
        print(f"SUCCESS: PDF size is {content_length} bytes")
    
    def test_pdf_endpoint_requires_auth(self):
        """Test that PDF endpoint requires authentication"""
        quote_id = self.test_quote['id']
        
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/quotes/{quote_id}/pdf")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"SUCCESS: PDF endpoint requires authentication (returned {response.status_code})")
    
    def test_pdf_endpoint_404_for_invalid_quote(self):
        """Test that PDF endpoint returns 404 for non-existent quote"""
        fake_quote_id = "non-existent-quote-id-12345"
        response = self.session.get(f"{BASE_URL}/api/quotes/{fake_quote_id}/pdf")
        
        assert response.status_code == 404, f"Expected 404 for invalid quote, got {response.status_code}"
        print(f"SUCCESS: PDF endpoint returns 404 for invalid quote ID")


class TestQuoteDataForPDF:
    """Test quote data structure for PDF generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_quote_has_required_fields_for_pdf(self):
        """Test that quotes have all required fields for PDF generation"""
        response = self.session.get(f"{BASE_URL}/api/quotes")
        assert response.status_code == 200
        
        quotes = response.json()
        assert len(quotes) > 0, "No quotes found"
        
        # Find a quote with items
        test_quote = None
        for q in quotes:
            if q.get('items') and len(q.get('items', [])) > 0:
                test_quote = q
                break
        
        if not test_quote:
            pytest.skip("No quote with items found")
        
        # Check required fields
        required_fields = ['id', 'quote_number', 'customer_name', 'items', 'created_at']
        for field in required_fields:
            assert field in test_quote, f"Missing required field: {field}"
        
        print(f"SUCCESS: Quote has all required fields: {required_fields}")
    
    def test_quote_items_have_required_fields(self):
        """Test that quote items have required fields for PDF table"""
        response = self.session.get(f"{BASE_URL}/api/quotes")
        assert response.status_code == 200
        
        quotes = response.json()
        
        # Find a quote with items
        test_quote = None
        for q in quotes:
            if q.get('items') and len(q.get('items', [])) > 0:
                test_quote = q
                break
        
        if not test_quote:
            pytest.skip("No quote with items found")
        
        items = test_quote.get('items', [])
        assert len(items) > 0, "Quote has no items"
        
        # Check item fields
        item_fields = ['product_name', 'quantity', 'unit_price_tl', 'total_price_tl']
        for item in items:
            for field in item_fields:
                assert field in item, f"Item missing field: {field}"
        
        print(f"SUCCESS: Quote items have required fields: {item_fields}")
    
    def test_quote_totals_are_calculated(self):
        """Test that quote totals are properly calculated"""
        response = self.session.get(f"{BASE_URL}/api/quotes")
        assert response.status_code == 200
        
        quotes = response.json()
        
        # Find a quote with total_tl
        test_quote = None
        for q in quotes:
            if q.get('total_tl') and q.get('total_tl') > 0:
                test_quote = q
                break
        
        if not test_quote:
            pytest.skip("No quote with calculated totals found")
        
        # Check total fields
        total_fields = ['subtotal_tl', 'vat_amount_tl', 'total_tl']
        for field in total_fields:
            assert field in test_quote, f"Missing total field: {field}"
            assert test_quote[field] is not None, f"Total field {field} is None"
        
        print(f"SUCCESS: Quote has calculated totals - Total: {test_quote['total_tl']}")


class TestCompanySettingsForPDF:
    """Test company settings used in PDF generation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_company_settings_exist(self):
        """Test that company settings exist"""
        response = self.session.get(f"{BASE_URL}/api/settings/company")
        assert response.status_code == 200, f"Failed to get company settings: {response.text}"
        
        settings = response.json()
        assert settings is not None, "Company settings is None"
        print(f"SUCCESS: Company settings exist")
    
    def test_company_has_logo(self):
        """Test that company has logo configured"""
        response = self.session.get(f"{BASE_URL}/api/settings/company")
        assert response.status_code == 200
        
        settings = response.json()
        logo_url = settings.get('logo_url')
        
        if logo_url:
            print(f"SUCCESS: Company has logo configured: {logo_url}")
        else:
            print(f"INFO: Company logo not configured (optional)")
    
    def test_company_has_quote_cover_image(self):
        """Test that company has quote cover image configured"""
        response = self.session.get(f"{BASE_URL}/api/settings/company")
        assert response.status_code == 200
        
        settings = response.json()
        cover_image = settings.get('quote_cover_image')
        
        if cover_image:
            print(f"SUCCESS: Company has quote cover image: {cover_image}")
        else:
            print(f"INFO: Quote cover image not configured (optional)")
    
    def test_company_has_contact_info(self):
        """Test that company has contact information"""
        response = self.session.get(f"{BASE_URL}/api/settings/company")
        assert response.status_code == 200
        
        settings = response.json()
        
        company_name = settings.get('company_name')
        assert company_name, "Company name is required"
        
        print(f"SUCCESS: Company name: {company_name}")
        print(f"  Phone: {settings.get('phone', 'Not set')}")
        print(f"  Email: {settings.get('email', 'Not set')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
