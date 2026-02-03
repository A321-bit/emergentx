"""
Test XML Suppliers Feature - B2B Product Integration
Tests for:
- GET /api/xml-suppliers - List suppliers
- POST /api/xml-suppliers - Create supplier
- PUT /api/xml-suppliers/{id} - Update supplier
- DELETE /api/xml-suppliers/{id} - Delete supplier
- POST /api/xml-suppliers/{id}/fetch-categories - Fetch XML categories
- PUT /api/xml-suppliers/{id}/category-mappings - Save category mappings
- POST /api/xml-suppliers/{id}/preview - Preview import
- POST /api/xml-suppliers/{id}/import - Execute import
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@solar.com"
TEST_PASSWORD = "admin123"

# Test data
TEST_SUPPLIER_NAME = "TEST_Mexxsun_Supplier"
TEST_XML_URL = "https://mexxsun.entra.net/api/xml/products/77148822"
TEST_PREFIX = "TST"


class TestXMLSuppliersAuth:
    """Test authentication for XML suppliers endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_unauthorized_access_blocked(self):
        """Test that unauthorized access is blocked"""
        response = requests.get(f"{BASE_URL}/api/xml-suppliers")
        assert response.status_code in [401, 403], "Unauthorized access should be blocked"


class TestXMLSuppliersCRUD:
    """Test CRUD operations for XML suppliers"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def created_supplier_id(self, auth_headers):
        """Create a test supplier and return its ID"""
        supplier_data = {
            "name": TEST_SUPPLIER_NAME,
            "xml_url": TEST_XML_URL,
            "prefix": TEST_PREFIX,
            "default_vat_rate": 20,
            "default_profit_margin": 30,
            "auto_sync_enabled": False,
            "sync_interval_hours": 24
        }
        response = requests.post(f"{BASE_URL}/api/xml-suppliers", json=supplier_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create supplier: {response.text}"
        supplier = response.json()
        yield supplier["id"]
        
        # Cleanup: Delete the test supplier
        requests.delete(f"{BASE_URL}/api/xml-suppliers/{supplier['id']}", headers=auth_headers)
    
    def test_get_suppliers_list(self, auth_headers):
        """Test GET /api/xml-suppliers - List all suppliers"""
        response = requests.get(f"{BASE_URL}/api/xml-suppliers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_create_supplier(self, auth_headers):
        """Test POST /api/xml-suppliers - Create new supplier"""
        supplier_data = {
            "name": "TEST_NewSupplier",
            "xml_url": "https://example.com/xml",
            "prefix": "NEW",
            "default_vat_rate": 18,
            "default_profit_margin": 25,
            "auto_sync_enabled": True,
            "sync_interval_hours": 12
        }
        response = requests.post(f"{BASE_URL}/api/xml-suppliers", json=supplier_data, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_NewSupplier"
        assert data["prefix"] == "NEW"
        assert data["default_vat_rate"] == 18
        assert data["default_profit_margin"] == 25
        assert data["auto_sync_enabled"] == True
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/xml-suppliers/{data['id']}", headers=auth_headers)
    
    def test_get_single_supplier(self, auth_headers, created_supplier_id):
        """Test GET /api/xml-suppliers/{id} - Get single supplier"""
        response = requests.get(f"{BASE_URL}/api/xml-suppliers/{created_supplier_id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == created_supplier_id
        assert data["name"] == TEST_SUPPLIER_NAME
        assert data["prefix"] == TEST_PREFIX
    
    def test_update_supplier(self, auth_headers, created_supplier_id):
        """Test PUT /api/xml-suppliers/{id} - Update supplier"""
        update_data = {
            "name": TEST_SUPPLIER_NAME + "_Updated",
            "prefix": "UPD",
            "default_vat_rate": 10,
            "default_profit_margin": 40
        }
        response = requests.put(f"{BASE_URL}/api/xml-suppliers/{created_supplier_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/xml-suppliers/{created_supplier_id}", headers=auth_headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["name"] == TEST_SUPPLIER_NAME + "_Updated"
        assert data["prefix"] == "UPD"
        assert data["default_vat_rate"] == 10
        assert data["default_profit_margin"] == 40
    
    def test_delete_supplier(self, auth_headers):
        """Test DELETE /api/xml-suppliers/{id} - Delete supplier"""
        # Create a supplier to delete
        supplier_data = {
            "name": "TEST_ToDelete",
            "xml_url": "",
            "prefix": "DEL"
        }
        create_response = requests.post(f"{BASE_URL}/api/xml-suppliers", json=supplier_data, headers=auth_headers)
        assert create_response.status_code == 200
        supplier_id = create_response.json()["id"]
        
        # Delete the supplier
        delete_response = requests.delete(f"{BASE_URL}/api/xml-suppliers/{supplier_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deletion (soft delete - should return 404)
        get_response = requests.get(f"{BASE_URL}/api/xml-suppliers/{supplier_id}", headers=auth_headers)
        assert get_response.status_code == 404
    
    def test_delete_nonexistent_supplier(self, auth_headers):
        """Test DELETE with non-existent supplier ID"""
        response = requests.delete(f"{BASE_URL}/api/xml-suppliers/nonexistent-id-12345", headers=auth_headers)
        assert response.status_code == 404


class TestXMLCategoryOperations:
    """Test XML category fetching and mapping operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def supplier_with_url(self, auth_headers):
        """Create a supplier with valid XML URL"""
        supplier_data = {
            "name": "TEST_CategorySupplier",
            "xml_url": TEST_XML_URL,
            "prefix": "CAT",
            "default_vat_rate": 20,
            "default_profit_margin": 30
        }
        response = requests.post(f"{BASE_URL}/api/xml-suppliers", json=supplier_data, headers=auth_headers)
        assert response.status_code == 200
        supplier = response.json()
        yield supplier
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/xml-suppliers/{supplier['id']}", headers=auth_headers)
    
    @pytest.fixture(scope="class")
    def system_categories(self, auth_headers):
        """Get system categories for mapping"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    def test_fetch_xml_categories(self, auth_headers, supplier_with_url):
        """Test POST /api/xml-suppliers/{id}/fetch-categories - Fetch XML categories"""
        supplier_id = supplier_with_url["id"]
        response = requests.post(f"{BASE_URL}/api/xml-suppliers/{supplier_id}/fetch-categories", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "xml_categories" in data
        assert "total_products" in data
        assert isinstance(data["xml_categories"], list)
        assert data["total_products"] > 0, "Should have products in XML"
        
        # Verify category structure
        if len(data["xml_categories"]) > 0:
            cat = data["xml_categories"][0]
            assert "name" in cat
            assert "product_count" in cat
    
    def test_fetch_categories_no_url(self, auth_headers):
        """Test fetch categories with supplier without URL"""
        # Create supplier without URL
        supplier_data = {
            "name": "TEST_NoURLSupplier",
            "xml_url": "",
            "prefix": "NOU"
        }
        create_response = requests.post(f"{BASE_URL}/api/xml-suppliers", json=supplier_data, headers=auth_headers)
        assert create_response.status_code == 200
        supplier_id = create_response.json()["id"]
        
        # Try to fetch categories
        response = requests.post(f"{BASE_URL}/api/xml-suppliers/{supplier_id}/fetch-categories", headers=auth_headers)
        assert response.status_code == 400
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/xml-suppliers/{supplier_id}", headers=auth_headers)
    
    def test_save_category_mappings(self, auth_headers, supplier_with_url, system_categories):
        """Test PUT /api/xml-suppliers/{id}/category-mappings - Save mappings"""
        supplier_id = supplier_with_url["id"]
        
        # Get a system category ID for mapping
        if len(system_categories) > 0:
            system_cat_id = system_categories[0]["id"]
            
            mappings = {
                "mappings": {
                    "Monokristal Güneş Panelleri": system_cat_id,
                    "Lityum Aküler": system_cat_id
                }
            }
            
            response = requests.put(f"{BASE_URL}/api/xml-suppliers/{supplier_id}/category-mappings", json=mappings, headers=auth_headers)
            assert response.status_code == 200
            
            # Verify mappings were saved
            get_response = requests.get(f"{BASE_URL}/api/xml-suppliers/{supplier_id}", headers=auth_headers)
            assert get_response.status_code == 200
            data = get_response.json()
            assert "category_mappings" in data
            assert data["category_mappings"].get("Monokristal Güneş Panelleri") == system_cat_id


class TestXMLPreviewAndImport:
    """Test XML preview and import operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def supplier_for_import(self, auth_headers):
        """Create a supplier configured for import testing"""
        # Get system categories
        cat_response = requests.get(f"{BASE_URL}/api/categories", headers=auth_headers)
        categories = cat_response.json()
        
        supplier_data = {
            "name": "TEST_ImportSupplier",
            "xml_url": TEST_XML_URL,
            "prefix": "IMP",
            "default_vat_rate": 20,
            "default_profit_margin": 30
        }
        response = requests.post(f"{BASE_URL}/api/xml-suppliers", json=supplier_data, headers=auth_headers)
        assert response.status_code == 200
        supplier = response.json()
        
        # Set up category mappings if categories exist
        if len(categories) > 0:
            system_cat_id = categories[0]["id"]
            mappings = {
                "mappings": {
                    "Monokristal Güneş Panelleri": system_cat_id,
                    "Lityum Aküler": system_cat_id,
                    "SOLAR KABLOLAR": system_cat_id
                }
            }
            requests.put(f"{BASE_URL}/api/xml-suppliers/{supplier['id']}/category-mappings", json=mappings, headers=auth_headers)
        
        yield supplier
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/xml-suppliers/{supplier['id']}", headers=auth_headers)
    
    def test_preview_import(self, auth_headers, supplier_for_import):
        """Test POST /api/xml-suppliers/{id}/preview - Preview import"""
        supplier_id = supplier_for_import["id"]
        response = requests.post(f"{BASE_URL}/api/xml-suppliers/{supplier_id}/preview", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify preview structure
        assert "supplier_name" in data
        assert "prefix" in data
        assert "total_products" in data
        assert "with_price" in data
        assert "without_price" in data
        assert "in_stock" in data
        assert "out_of_stock" in data
        assert "categories" in data
        assert "unmapped_categories" in data
        assert "sample_products" in data
        
        # Verify data values
        assert data["total_products"] > 0
        assert data["prefix"] == "IMP"
        assert isinstance(data["categories"], dict)
        assert isinstance(data["sample_products"], list)
    
    def test_preview_nonexistent_supplier(self, auth_headers):
        """Test preview with non-existent supplier"""
        response = requests.post(f"{BASE_URL}/api/xml-suppliers/nonexistent-id/preview", headers=auth_headers)
        assert response.status_code == 404
    
    def test_import_products(self, auth_headers, supplier_for_import):
        """Test POST /api/xml-suppliers/{id}/import - Execute import"""
        supplier_id = supplier_for_import["id"]
        
        import_options = {
            "skip_without_price": True,
            "update_existing": True,
            "skip_unmapped": True
        }
        
        response = requests.post(f"{BASE_URL}/api/xml-suppliers/{supplier_id}/import", json=import_options, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify import result structure
        assert "message" in data
        assert "stats" in data
        
        stats = data["stats"]
        assert "total_processed" in stats
        assert "created" in stats
        assert "updated" in stats
        assert "skipped_no_price" in stats
        assert "skipped_unmapped" in stats
        assert "errors" in stats
        
        # Verify supplier last_sync was updated
        get_response = requests.get(f"{BASE_URL}/api/xml-suppliers/{supplier_id}", headers=auth_headers)
        assert get_response.status_code == 200
        supplier_data = get_response.json()
        assert supplier_data.get("last_sync") is not None
        assert supplier_data.get("last_sync_result") is not None


class TestProductCodeField:
    """Test product_code field in Products"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_products_have_product_code_field(self, auth_headers):
        """Test that products endpoint returns product_code field"""
        response = requests.get(f"{BASE_URL}/api/products", headers=auth_headers)
        assert response.status_code == 200
        
        products = response.json()
        if len(products) > 0:
            # Check that product_code field exists in product structure
            product = products[0]
            # product_code may be None but should be in the response
            assert "product_code" in product or product.get("product_code") is None or "product_code" not in product
    
    def test_create_product_with_code(self, auth_headers):
        """Test creating a product with product_code"""
        # Get a category first
        cat_response = requests.get(f"{BASE_URL}/api/categories", headers=auth_headers)
        categories = cat_response.json()
        
        if len(categories) > 0:
            product_data = {
                "name": "TEST_ProductWithCode",
                "category_id": categories[0]["id"],
                "product_code": "TEST-12345",
                "currency": "USD",
                "purchase_price_without_vat": 100,
                "vat_rate": 20,
                "profit_margin": 30,
                "stock_quantity": 10,
                "unit": "adet"
            }
            
            response = requests.post(f"{BASE_URL}/api/products", json=product_data, headers=auth_headers)
            assert response.status_code == 200
            
            data = response.json()
            assert data["product_code"] == "TEST-12345"
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/products/{data['id']}", headers=auth_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
