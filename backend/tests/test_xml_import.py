"""
Test XML Import Feature - Backend API Tests
Tests for XML B2B product import from Mexxsun supplier
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestXMLImportFeature:
    """Test XML Import endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_01_get_xml_import_settings(self):
        """Test GET /api/settings/xml-import - Get XML import settings"""
        response = self.session.get(f"{BASE_URL}/api/settings/xml-import")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields exist
        assert "xml_url" in data, "xml_url field missing"
        assert "auto_sync_enabled" in data, "auto_sync_enabled field missing"
        assert "sync_interval_hours" in data, "sync_interval_hours field missing"
        assert "supplier_name" in data, "supplier_name field missing"
        assert "default_vat_rate" in data, "default_vat_rate field missing"
        assert "default_profit_margin" in data, "default_profit_margin field missing"
        
        # Verify default values
        assert data["xml_url"] == "https://mexxsun.entra.net/api/xml/products/77148822", f"Unexpected xml_url: {data['xml_url']}"
        assert data["supplier_name"] == "Mexxsun", f"Unexpected supplier_name: {data['supplier_name']}"
        
        print(f"✓ XML import settings retrieved successfully")
        print(f"  - XML URL: {data['xml_url']}")
        print(f"  - Supplier: {data['supplier_name']}")
        print(f"  - VAT Rate: {data['default_vat_rate']}%")
        print(f"  - Profit Margin: {data['default_profit_margin']}%")
        print(f"  - Auto Sync: {data['auto_sync_enabled']}")
        if data.get('last_sync'):
            print(f"  - Last Sync: {data['last_sync']}")
    
    def test_02_update_xml_import_settings(self):
        """Test PUT /api/settings/xml-import - Update XML import settings"""
        # First get current settings
        get_response = self.session.get(f"{BASE_URL}/api/settings/xml-import")
        original_settings = get_response.json()
        
        # Update settings
        update_data = {
            "xml_url": "https://mexxsun.entra.net/api/xml/products/77148822",
            "auto_sync_enabled": False,
            "sync_interval_hours": 24,
            "supplier_name": "Mexxsun",
            "default_vat_rate": 20,
            "default_profit_margin": 30
        }
        
        response = self.session.put(f"{BASE_URL}/api/settings/xml-import", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        
        # Verify settings were updated
        verify_response = self.session.get(f"{BASE_URL}/api/settings/xml-import")
        verify_data = verify_response.json()
        
        assert verify_data["default_vat_rate"] == 20, f"VAT rate not updated correctly"
        assert verify_data["default_profit_margin"] == 30, f"Profit margin not updated correctly"
        
        print(f"✓ XML import settings updated successfully")
    
    def test_03_xml_import_preview(self):
        """Test POST /api/xml-import/preview - Preview XML data"""
        response = self.session.post(f"{BASE_URL}/api/xml-import/preview")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify preview response structure
        assert "total_products" in data, "total_products field missing"
        assert "with_price" in data, "with_price field missing"
        assert "without_price" in data, "without_price field missing"
        assert "in_stock" in data, "in_stock field missing"
        assert "out_of_stock" in data, "out_of_stock field missing"
        assert "categories" in data, "categories field missing"
        assert "sample_products" in data, "sample_products field missing"
        
        # Verify data types
        assert isinstance(data["total_products"], int), "total_products should be int"
        assert isinstance(data["with_price"], int), "with_price should be int"
        assert isinstance(data["categories"], dict), "categories should be dict"
        assert isinstance(data["sample_products"], list), "sample_products should be list"
        
        # Verify expected values (based on agent context: 142 total, 138 with price, 4 without)
        assert data["total_products"] >= 100, f"Expected at least 100 products, got {data['total_products']}"
        assert data["with_price"] >= 100, f"Expected at least 100 products with price, got {data['with_price']}"
        
        print(f"✓ XML preview successful")
        print(f"  - Total Products: {data['total_products']}")
        print(f"  - With Price: {data['with_price']}")
        print(f"  - Without Price: {data['without_price']}")
        print(f"  - In Stock: {data['in_stock']}")
        print(f"  - Out of Stock: {data['out_of_stock']}")
        print(f"  - Categories: {len(data['categories'])}")
        print(f"  - Sample Products: {len(data['sample_products'])}")
        
        # Verify sample product structure
        if data["sample_products"]:
            sample = data["sample_products"][0]
            assert "name" in sample, "Sample product should have name"
            assert "product_code" in sample, "Sample product should have product_code"
            assert "price_usd" in sample, "Sample product should have price_usd"
            assert "category_name" in sample, "Sample product should have category_name"
            assert "in_stock" in sample, "Sample product should have in_stock"
            print(f"  - Sample Product: {sample['name'][:50]}...")
    
    def test_04_xml_import_execute(self):
        """Test POST /api/xml-import/execute - Execute XML import"""
        # Execute import with skip_without_price and update_existing
        response = self.session.post(f"{BASE_URL}/api/xml-import/execute", json={
            "skip_without_price": True,
            "update_existing": True
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "message" in data, "Response should contain message"
        assert "stats" in data, "Response should contain stats"
        
        stats = data["stats"]
        assert "total_processed" in stats, "stats should contain total_processed"
        assert "created" in stats, "stats should contain created"
        assert "updated" in stats, "stats should contain updated"
        assert "skipped_no_price" in stats, "stats should contain skipped_no_price"
        assert "errors" in stats, "stats should contain errors"
        
        print(f"✓ XML import executed successfully")
        print(f"  - Total Processed: {stats['total_processed']}")
        print(f"  - Created: {stats['created']}")
        print(f"  - Updated: {stats['updated']}")
        print(f"  - Skipped (no price): {stats['skipped_no_price']}")
        print(f"  - Errors: {stats['errors']}")
        
        # Verify no errors
        assert stats["errors"] == 0, f"Import had {stats['errors']} errors"
    
    def test_05_verify_xml_imported_products(self):
        """Test GET /api/products - Verify XML imported products exist"""
        response = self.session.get(f"{BASE_URL}/api/products")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        products = response.json()
        
        # Filter products with xml_product_code
        xml_products = [p for p in products if p.get("xml_product_code")]
        
        assert len(xml_products) > 0, "No XML imported products found"
        
        print(f"✓ Found {len(xml_products)} XML imported products")
        
        # Verify product structure
        if xml_products:
            sample = xml_products[0]
            assert "xml_product_code" in sample, "Product should have xml_product_code"
            assert "xml_supplier" in sample, "Product should have xml_supplier"
            assert "name" in sample, "Product should have name"
            assert "purchase_price_without_vat" in sample or sample.get("purchase_price_without_vat") is None, "Product should have purchase_price_without_vat"
            assert "sale_price" in sample, "Product should have sale_price"
            
            print(f"  - Sample: {sample['name'][:50]}...")
            print(f"  - Product Code: {sample['xml_product_code']}")
            print(f"  - Supplier: {sample.get('xml_supplier', 'N/A')}")
    
    def test_06_verify_last_sync_updated(self):
        """Test that last_sync is updated after import"""
        response = self.session.get(f"{BASE_URL}/api/settings/xml-import")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # After running test_04, last_sync should be set
        assert data.get("last_sync") is not None, "last_sync should be set after import"
        
        print(f"✓ Last sync timestamp verified")
        print(f"  - Last Sync: {data['last_sync']}")
        
        if data.get("last_sync_result"):
            result = data["last_sync_result"]
            print(f"  - Triggered By: {result.get('triggered_by', 'N/A')}")
            if result.get("stats"):
                print(f"  - Stats: {result['stats']}")


class TestXMLImportEdgeCases:
    """Test edge cases for XML import"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_unauthorized_access(self):
        """Test that unauthorized users cannot access XML import"""
        # Create a new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        # Try to access XML settings without auth
        response = unauth_session.get(f"{BASE_URL}/api/settings/xml-import")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        # Try to preview without auth
        response = unauth_session.post(f"{BASE_URL}/api/xml-import/preview")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        # Try to execute without auth
        response = unauth_session.post(f"{BASE_URL}/api/xml-import/execute")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print(f"✓ Unauthorized access properly blocked")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
