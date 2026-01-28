"""
Solar Energy Sales Management System (CRM/ERP) - Backend API Tests
Tests for: Login, Dashboard, Roles, Categories, Products, Customers, Customer Settings, Dealer Groups, Dealers
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == "admin@solar.com"
        assert data["user"]["name"] == "Sistem Yöneticisi"
        assert "permissions" in data["user"]
        print(f"✓ Login successful for admin@solar.com")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_get_current_user(self, auth_token):
        """Test getting current user info"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Get me failed: {response.text}"
        data = response.json()
        assert data["email"] == "admin@solar.com"
        print(f"✓ Current user retrieved: {data['name']}")


class TestDashboard:
    """Dashboard statistics tests"""
    
    def test_dashboard_stats(self, auth_token):
        """Test dashboard statistics endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Verify all expected fields are present
        expected_fields = [
            "total_products", "total_customers", "total_quotes", 
            "total_revenue", "pending_quotes", "approved_quotes",
            "converted_quotes", "stock_value", "total_dealers", "total_users"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Dashboard stats: Products={data['total_products']}, Customers={data['total_customers']}, Quotes={data['total_quotes']}")


class TestRoles:
    """Roles & Permissions tests"""
    
    def test_get_permissions(self, auth_token):
        """Test getting all available permissions"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/permissions", headers=headers)
        assert response.status_code == 200, f"Get permissions failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Permissions should be a list"
        assert len(data) > 0, "Should have at least one permission"
        print(f"✓ Retrieved {len(data)} permissions")
    
    def test_get_roles(self, auth_token):
        """Test getting all roles"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/roles", headers=headers)
        assert response.status_code == 200, f"Get roles failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Roles should be a list"
        
        # Check for default roles
        role_names = [r["name"] for r in data]
        assert "Yönetici" in role_names, "Admin role should exist"
        print(f"✓ Retrieved {len(data)} roles: {role_names}")
    
    def test_create_role_with_permissions(self, auth_token):
        """Test creating a new role with specific permissions"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test role
        role_data = {
            "name": "TEST_Muhasebe",
            "description": "Test muhasebe rolü",
            "permissions": ["dashboard_view", "finance_view", "products_view"]
        }
        response = requests.post(f"{BASE_URL}/api/roles", headers=headers, json=role_data)
        assert response.status_code == 200, f"Create role failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Muhasebe"
        assert "dashboard_view" in data["permissions"]
        assert "finance_view" in data["permissions"]
        print(f"✓ Created role: {data['name']} with {len(data['permissions'])} permissions")
        
        # Cleanup - delete the test role
        role_id = data["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/roles/{role_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete role failed: {delete_response.text}"
        print(f"✓ Cleaned up test role")


class TestCategories:
    """Product Categories tests"""
    
    def test_get_categories(self, auth_token):
        """Test getting all product categories"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/categories", headers=headers)
        assert response.status_code == 200, f"Get categories failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Categories should be a list"
        print(f"✓ Retrieved {len(data)} categories")
        return data
    
    def test_create_category_with_profit_margin(self, auth_token):
        """Test creating a category with profit margin"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        category_data = {
            "name": "TEST_Solar Panel",
            "description": "Test solar panel kategorisi",
            "default_profit_margin": 35
        }
        response = requests.post(f"{BASE_URL}/api/categories", headers=headers, json=category_data)
        assert response.status_code == 200, f"Create category failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Solar Panel"
        assert data["default_profit_margin"] == 35
        print(f"✓ Created category: {data['name']} with {data['default_profit_margin']}% profit margin")
        
        # Verify persistence with GET
        category_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/categories", headers=headers)
        categories = get_response.json()
        found = any(c["id"] == category_id for c in categories)
        assert found, "Created category not found in list"
        print(f"✓ Category persisted and verified")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/categories/{category_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete category failed: {delete_response.text}"
        print(f"✓ Cleaned up test category")


class TestProducts:
    """Products tests"""
    
    @pytest.fixture
    def test_category(self, auth_token):
        """Create a test category for product tests"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        category_data = {
            "name": "TEST_Product_Category",
            "description": "Test category for products",
            "default_profit_margin": 30
        }
        response = requests.post(f"{BASE_URL}/api/categories", headers=headers, json=category_data)
        data = response.json()
        yield data
        # Cleanup
        requests.delete(f"{BASE_URL}/api/categories/{data['id']}", headers=headers)
    
    def test_get_products(self, auth_token):
        """Test getting all products"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        assert response.status_code == 200, f"Get products failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Products should be a list"
        print(f"✓ Retrieved {len(data)} products")
    
    def test_create_product_with_pricing(self, auth_token, test_category):
        """Test creating a product with purchase price, VAT, and profit margin"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        product_data = {
            "name": "TEST_Solar Panel 400W",
            "category_id": test_category["id"],
            "description": "Test solar panel",
            "currency": "USD",
            "purchase_price_without_vat": 100.00,
            "vat_rate": 20,
            "profit_margin": 30,
            "stock_quantity": 10,
            "unit": "adet"
        }
        response = requests.post(f"{BASE_URL}/api/products", headers=headers, json=product_data)
        assert response.status_code == 200, f"Create product failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Solar Panel 400W"
        assert data["purchase_price_without_vat"] == 100.00
        assert data["vat_rate"] == 20
        assert data["profit_margin"] == 30
        
        # Verify calculated prices
        # purchase_price = 100 * 1.20 = 120
        # sale_price = 120 * 1.30 = 156
        assert data["purchase_price"] == 120.00, f"Expected purchase_price 120, got {data['purchase_price']}"
        assert data["sale_price"] == 156.00, f"Expected sale_price 156, got {data['sale_price']}"
        
        print(f"✓ Created product: {data['name']}")
        print(f"  - Purchase (no VAT): ${data['purchase_price_without_vat']}")
        print(f"  - Purchase (with VAT): ${data['purchase_price']}")
        print(f"  - Sale Price: ${data['sale_price']}")
        
        # Cleanup
        product_id = data["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/products/{product_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete product failed: {delete_response.text}"
        print(f"✓ Cleaned up test product")


class TestCustomers:
    """Customers tests"""
    
    def test_get_customers(self, auth_token):
        """Test getting all customers"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        assert response.status_code == 200, f"Get customers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Customers should be a list"
        print(f"✓ Retrieved {len(data)} customers")
    
    def test_create_individual_customer(self, auth_token):
        """Test creating an individual (bireysel) customer with TC Kimlik"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        customer_data = {
            "customer_type": "bireysel",
            "name": "TEST_Ahmet Yılmaz",
            "phone": "05551234567",
            "email": "test.ahmet@email.com",
            "tc_kimlik": "12345678901",
            "city": "İstanbul",
            "district": "Kadıköy",
            "address": "Test Mahallesi, Test Sokak No:1"
        }
        response = requests.post(f"{BASE_URL}/api/customers", headers=headers, json=customer_data)
        assert response.status_code == 200, f"Create customer failed: {response.text}"
        data = response.json()
        
        assert data["customer_type"] == "bireysel"
        assert data["name"] == "TEST_Ahmet Yılmaz"
        assert data["tc_kimlik"] == "12345678901"
        print(f"✓ Created individual customer: {data['name']} (TC: {data['tc_kimlik']})")
        
        # Verify persistence
        customer_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/customers/{customer_id}", headers=headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["tc_kimlik"] == "12345678901"
        print(f"✓ Customer persisted and verified")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/customers/{customer_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test customer")
    
    def test_create_corporate_customer(self, auth_token):
        """Test creating a corporate (kurumsal) customer with company details"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        customer_data = {
            "customer_type": "kurumsal",
            "name": "TEST_Mehmet Demir",
            "phone": "05559876543",
            "email": "test.mehmet@firma.com",
            "company_name": "TEST_Demir Enerji A.Ş.",
            "tax_number": "1234567890",
            "tax_office": "Kadıköy Vergi Dairesi",
            "city": "İstanbul",
            "district": "Ataşehir",
            "address": "Test İş Merkezi Kat:5"
        }
        response = requests.post(f"{BASE_URL}/api/customers", headers=headers, json=customer_data)
        assert response.status_code == 200, f"Create corporate customer failed: {response.text}"
        data = response.json()
        
        assert data["customer_type"] == "kurumsal"
        assert data["company_name"] == "TEST_Demir Enerji A.Ş."
        assert data["tax_number"] == "1234567890"
        assert data["tax_office"] == "Kadıköy Vergi Dairesi"
        print(f"✓ Created corporate customer: {data['company_name']}")
        print(f"  - Tax Number: {data['tax_number']}")
        print(f"  - Tax Office: {data['tax_office']}")
        
        # Cleanup
        customer_id = data["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/customers/{customer_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test corporate customer")


class TestCustomerSettings:
    """Customer Categories and Sources tests"""
    
    def test_get_customer_categories(self, auth_token):
        """Test getting customer categories"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/customer-categories", headers=headers)
        assert response.status_code == 200, f"Get customer categories failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Customer categories should be a list"
        print(f"✓ Retrieved {len(data)} customer categories")
        if data:
            print(f"  Categories: {[c['name'] for c in data]}")
    
    def test_get_customer_sources(self, auth_token):
        """Test getting customer acquisition sources"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/customer-sources", headers=headers)
        assert response.status_code == 200, f"Get customer sources failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Customer sources should be a list"
        print(f"✓ Retrieved {len(data)} customer sources")
        if data:
            print(f"  Sources: {[s['name'] for s in data]}")
    
    def test_create_customer_category(self, auth_token):
        """Test creating a customer category"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        category_data = {
            "name": "TEST_Endüstriyel",
            "description": "Test endüstriyel sistemler"
        }
        response = requests.post(f"{BASE_URL}/api/customer-categories", headers=headers, json=category_data)
        assert response.status_code == 200, f"Create customer category failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Endüstriyel"
        print(f"✓ Created customer category: {data['name']}")
        
        # Cleanup
        category_id = data["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/customer-categories/{category_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test customer category")
    
    def test_create_customer_source(self, auth_token):
        """Test creating a customer acquisition source"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        source_data = {
            "name": "TEST_LinkedIn",
            "description": "Test LinkedIn reklamları"
        }
        response = requests.post(f"{BASE_URL}/api/customer-sources", headers=headers, json=source_data)
        assert response.status_code == 200, f"Create customer source failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_LinkedIn"
        print(f"✓ Created customer source: {data['name']}")
        
        # Cleanup
        source_id = data["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/customer-sources/{source_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test customer source")


class TestDealerGroups:
    """Dealer Groups tests"""
    
    def test_get_dealer_groups(self, auth_token):
        """Test getting all dealer groups"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dealer-groups", headers=headers)
        assert response.status_code == 200, f"Get dealer groups failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Dealer groups should be a list"
        print(f"✓ Retrieved {len(data)} dealer groups")
        for group in data:
            print(f"  - {group['name']}: {group['discount_rate']}% discount")
    
    def test_create_dealer_group_with_discount(self, auth_token):
        """Test creating a dealer group with discount percentage"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        group_data = {
            "name": "TEST_Diamond",
            "description": "Test premium bayi grubu",
            "discount_rate": 25
        }
        response = requests.post(f"{BASE_URL}/api/dealer-groups", headers=headers, json=group_data)
        assert response.status_code == 200, f"Create dealer group failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Diamond"
        assert data["discount_rate"] == 25
        print(f"✓ Created dealer group: {data['name']} with {data['discount_rate']}% discount")
        
        # Verify persistence
        group_id = data["id"]
        get_response = requests.get(f"{BASE_URL}/api/dealer-groups", headers=headers)
        groups = get_response.json()
        found = any(g["id"] == group_id for g in groups)
        assert found, "Created dealer group not found in list"
        print(f"✓ Dealer group persisted and verified")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/dealer-groups/{group_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test dealer group")


class TestDealers:
    """Dealers tests"""
    
    def test_get_dealers(self, auth_token):
        """Test getting all dealers"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dealers", headers=headers)
        assert response.status_code == 200, f"Get dealers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Dealers should be a list"
        print(f"✓ Retrieved {len(data)} dealers")
    
    def test_create_dealer_without_user(self, auth_token):
        """Test creating a dealer without user account"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        dealer_data = {
            "name": "TEST_Güneş Enerji Ltd.",
            "contact_person": "Ali Veli",
            "phone": "05551112233",
            "email": "test.gunes@email.com",
            "address": "Test Sanayi Sitesi No:10",
            "create_user": False
        }
        response = requests.post(f"{BASE_URL}/api/dealers", headers=headers, json=dealer_data)
        assert response.status_code == 200, f"Create dealer failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Güneş Enerji Ltd."
        assert data["contact_person"] == "Ali Veli"
        assert data["user_id"] is None, "User should not be created"
        print(f"✓ Created dealer: {data['name']} (no user account)")
        
        # Cleanup
        dealer_id = data["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/dealers/{dealer_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test dealer")
    
    def test_create_dealer_with_user_account(self, auth_token):
        """Test creating a dealer with user account"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        dealer_data = {
            "name": "TEST_Yıldız Solar A.Ş.",
            "contact_person": "Ayşe Kaya",
            "phone": "05554445566",
            "email": "test.yildiz@email.com",
            "address": "Test Plaza Kat:3",
            "create_user": True,
            "user_email": "test.bayi.user@email.com",
            "user_password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/dealers", headers=headers, json=dealer_data)
        assert response.status_code == 200, f"Create dealer with user failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Yıldız Solar A.Ş."
        assert data["user_id"] is not None, "User should be created"
        print(f"✓ Created dealer: {data['name']} with user account (user_id: {data['user_id']})")
        
        # Verify user can login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test.bayi.user@email.com",
            "password": "testpass123"
        })
        assert login_response.status_code == 200, f"Dealer user login failed: {login_response.text}"
        print(f"✓ Dealer user can login successfully")
        
        # Cleanup - delete dealer (user will remain but that's ok for test)
        dealer_id = data["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/dealers/{dealer_id}", headers=headers)
        assert delete_response.status_code == 200
        
        # Also delete the user
        user_id = data["user_id"]
        user_delete_response = requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        print(f"✓ Cleaned up test dealer and user")


# Fixtures
@pytest.fixture(scope="session")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@solar.com",
        "password": "admin123"
    })
    if response.status_code != 200:
        pytest.fail(f"Failed to get auth token: {response.text}")
    return response.json()["access_token"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
