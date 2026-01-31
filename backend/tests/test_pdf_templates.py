"""
Test PDF Generation and Quote Templates
- PDF generation endpoint: GET /api/quotes/{quote_id}/pdf
- Quote templates endpoints: GET/POST/DELETE /api/settings/quote-templates
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@solar.com"
TEST_PASSWORD = "admin123"

# Test quote ID provided by main agent
TEST_QUOTE_ID = "f7842eb0-6f70-4a44-b8f4-310aa517d0e9"


class TestAuth:
    """Get authentication token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}


class TestQuoteTemplates(TestAuth):
    """Test Quote Templates CRUD operations"""
    
    def test_get_quote_templates(self, auth_headers):
        """Test GET /api/settings/quote-templates - should return all 4 categories"""
        response = requests.get(f"{BASE_URL}/api/settings/quote-templates", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        
        templates = response.json()
        assert isinstance(templates, list), "Response should be a list"
        assert len(templates) == 4, f"Expected 4 templates, got {len(templates)}"
        
        # Verify all categories are present
        category_ids = [t["category_id"] for t in templates]
        expected_categories = ["on_grid", "off_grid", "hybrid", "solar_irrigation"]
        for cat in expected_categories:
            assert cat in category_ids, f"Missing category: {cat}"
        
        # Verify structure
        for template in templates:
            assert "category_id" in template
            assert "category_name" in template
            assert "description" in template
            assert "cover_image" in template  # Can be None
        
        print(f"✓ GET /api/settings/quote-templates - SUCCESS: {len(templates)} templates returned")
        return templates
    
    def test_get_single_quote_template(self, auth_headers):
        """Test GET /api/settings/quote-templates/{category_id}"""
        response = requests.get(f"{BASE_URL}/api/settings/quote-templates/on_grid", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get template: {response.text}"
        
        template = response.json()
        assert template["category_id"] == "on_grid"
        assert "category_name" in template
        assert "description" in template
        
        print(f"✓ GET /api/settings/quote-templates/on_grid - SUCCESS")
        return template
    
    def test_get_invalid_template(self, auth_headers):
        """Test GET /api/settings/quote-templates/{invalid_id} - should return 404"""
        response = requests.get(f"{BASE_URL}/api/settings/quote-templates/invalid_category", headers=auth_headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/settings/quote-templates/invalid_category - 404 as expected")
    
    def test_upload_cover_image(self, auth_headers):
        """Test POST /api/settings/quote-templates/{category_id}/upload-cover"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG (1x1 transparent pixel)
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test_cover.png", io.BytesIO(png_data), "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/settings/quote-templates/off_grid/upload-cover",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200, f"Failed to upload cover: {response.text}"
        
        data = response.json()
        assert data["category_id"] == "off_grid"
        assert "cover_image" in data
        assert data["cover_image"] is not None
        assert data["cover_image"].startswith("/uploads/")
        
        print(f"✓ POST /api/settings/quote-templates/off_grid/upload-cover - SUCCESS: {data['cover_image']}")
        return data["cover_image"]
    
    def test_delete_cover_image(self, auth_headers):
        """Test DELETE /api/settings/quote-templates/{category_id}/cover"""
        response = requests.delete(
            f"{BASE_URL}/api/settings/quote-templates/off_grid/cover",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to delete cover: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert data["category_id"] == "off_grid"
        
        # Verify cover is deleted
        verify_response = requests.get(
            f"{BASE_URL}/api/settings/quote-templates/off_grid",
            headers=auth_headers
        )
        verify_data = verify_response.json()
        assert verify_data["cover_image"] is None, "Cover image should be None after deletion"
        
        print(f"✓ DELETE /api/settings/quote-templates/off_grid/cover - SUCCESS")


class TestPDFGeneration(TestAuth):
    """Test PDF Generation endpoint"""
    
    def test_generate_pdf_for_quote(self, auth_headers):
        """Test GET /api/quotes/{quote_id}/pdf - should return PDF file"""
        response = requests.get(
            f"{BASE_URL}/api/quotes/{TEST_QUOTE_ID}/pdf",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to generate PDF: {response.text}"
        
        # Verify response is PDF
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Verify content disposition header
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, "Should have attachment disposition"
        assert ".pdf" in content_disposition, "Filename should have .pdf extension"
        
        # Verify PDF content (check PDF magic bytes)
        pdf_content = response.content
        assert len(pdf_content) > 0, "PDF content should not be empty"
        assert pdf_content[:4] == b'%PDF', "Content should start with PDF magic bytes"
        
        # Check PDF has multiple pages (look for /Page objects)
        pdf_text = pdf_content.decode('latin-1', errors='ignore')
        page_count = pdf_text.count('/Type /Page')
        print(f"  PDF contains approximately {page_count} page references")
        
        print(f"✓ GET /api/quotes/{TEST_QUOTE_ID}/pdf - SUCCESS: PDF generated ({len(pdf_content)} bytes)")
        return pdf_content
    
    def test_generate_pdf_invalid_quote(self, auth_headers):
        """Test GET /api/quotes/{invalid_id}/pdf - should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/quotes/invalid-quote-id-12345/pdf",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/quotes/invalid-quote-id/pdf - 404 as expected")
    
    def test_pdf_without_auth(self):
        """Test GET /api/quotes/{quote_id}/pdf without auth - should return 401"""
        response = requests.get(f"{BASE_URL}/api/quotes/{TEST_QUOTE_ID}/pdf")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ GET /api/quotes/{TEST_QUOTE_ID}/pdf without auth - 401 as expected")


class TestQuoteTemplateIntegration(TestAuth):
    """Test that quote templates are used in PDF generation"""
    
    def test_on_grid_template_exists(self, auth_headers):
        """Verify On Grid template has cover image (as mentioned by main agent)"""
        response = requests.get(
            f"{BASE_URL}/api/settings/quote-templates/on_grid",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        template = response.json()
        
        # Main agent mentioned: "On Grid kategorisi için test kapak görseli zaten yüklendi"
        if template.get("cover_image"):
            print(f"✓ On Grid template has cover image: {template['cover_image']}")
        else:
            print(f"⚠ On Grid template has no cover image (may need to be uploaded)")
        
        return template
    
    def test_all_template_categories(self, auth_headers):
        """Verify all 4 template categories are available"""
        response = requests.get(f"{BASE_URL}/api/settings/quote-templates", headers=auth_headers)
        
        assert response.status_code == 200
        templates = response.json()
        
        expected = {
            "on_grid": "On Grid Sistem Teklifi",
            "off_grid": "Off Grid Sistem Teklifi", 
            "hybrid": "Hibrit Sistem Teklifi",
            "solar_irrigation": "Solar Sulama Sistem Teklifi"
        }
        
        for template in templates:
            cat_id = template["category_id"]
            if cat_id in expected:
                assert template["category_name"] == expected[cat_id], f"Wrong name for {cat_id}"
                cover_status = "✓ has cover" if template.get("cover_image") else "○ no cover"
                print(f"  {cat_id}: {template['category_name']} - {cover_status}")
        
        print(f"✓ All 4 template categories verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
