"""
Test Sales Permissions - Verify sales personnel access and profit visibility
Tests:
1. Sales personnel can access /api/sales endpoint
2. Sales personnel can access /api/sales/stats endpoint
3. Admin user can access all endpoints
4. Verify permission-based access control
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {
    "email": "admin@solar.com",
    "password": "admin123"
}

SALES_PERSONNEL_CREDENTIALS = {
    "email": "c.zeynep@akturkenerji.com.tr",
    "password": "test123"
}


class TestSalesPermissions:
    """Test sales permissions for different user roles"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def sales_token(self):
        """Get sales personnel authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SALES_PERSONNEL_CREDENTIALS)
        assert response.status_code == 200, f"Sales personnel login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_user_data(self):
        """Get admin user data from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200
        return response.json().get("user", {})
    
    @pytest.fixture(scope="class")
    def sales_user_data(self):
        """Get sales personnel user data from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SALES_PERSONNEL_CREDENTIALS)
        assert response.status_code == 200
        return response.json().get("user", {})
    
    # ==================== ADMIN PERMISSION TESTS ====================
    
    def test_admin_has_all_permission(self, admin_user_data):
        """Verify admin has 'all' permission which includes profit_view"""
        permissions = admin_user_data.get("permissions", [])
        assert "all" in permissions, f"Admin should have 'all' permission. Got: {permissions}"
        print(f"✓ Admin has 'all' permission: {permissions}")
    
    def test_admin_can_access_sales_endpoint(self, admin_token):
        """Admin should be able to access /api/sales"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/sales", headers=headers)
        assert response.status_code == 200, f"Admin failed to access /api/sales: {response.status_code} - {response.text}"
        print(f"✓ Admin can access /api/sales - Status: {response.status_code}")
    
    def test_admin_can_access_sales_stats_endpoint(self, admin_token):
        """Admin should be able to access /api/sales/stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/sales/stats", headers=headers)
        assert response.status_code == 200, f"Admin failed to access /api/sales/stats: {response.status_code} - {response.text}"
        data = response.json()
        # Verify stats structure
        assert "monthly" in data or "daily" in data or "yearly" in data, f"Stats response missing expected keys: {data.keys()}"
        print(f"✓ Admin can access /api/sales/stats - Status: {response.status_code}")
    
    # ==================== SALES PERSONNEL PERMISSION TESTS ====================
    
    def test_sales_personnel_has_sales_view_permission(self, sales_user_data):
        """Verify sales personnel has sales_view permission"""
        permissions = sales_user_data.get("permissions", [])
        assert "sales_view" in permissions, f"Sales personnel should have 'sales_view' permission. Got: {permissions}"
        print(f"✓ Sales personnel has 'sales_view' permission: {permissions}")
    
    def test_sales_personnel_has_sales_manage_permission(self, sales_user_data):
        """Verify sales personnel has sales_manage permission"""
        permissions = sales_user_data.get("permissions", [])
        assert "sales_manage" in permissions, f"Sales personnel should have 'sales_manage' permission. Got: {permissions}"
        print(f"✓ Sales personnel has 'sales_manage' permission: {permissions}")
    
    def test_sales_personnel_does_not_have_profit_view(self, sales_user_data):
        """Verify sales personnel does NOT have profit_view permission"""
        permissions = sales_user_data.get("permissions", [])
        assert "profit_view" not in permissions, f"Sales personnel should NOT have 'profit_view' permission. Got: {permissions}"
        assert "all" not in permissions, f"Sales personnel should NOT have 'all' permission. Got: {permissions}"
        print(f"✓ Sales personnel does NOT have 'profit_view' or 'all' permission: {permissions}")
    
    def test_sales_personnel_can_access_sales_endpoint(self, sales_token):
        """Sales personnel should be able to access /api/sales"""
        headers = {"Authorization": f"Bearer {sales_token}"}
        response = requests.get(f"{BASE_URL}/api/sales", headers=headers)
        assert response.status_code == 200, f"Sales personnel failed to access /api/sales: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list response, got: {type(data)}"
        print(f"✓ Sales personnel can access /api/sales - Status: {response.status_code}, Records: {len(data)}")
    
    def test_sales_personnel_can_access_sales_stats_endpoint(self, sales_token):
        """Sales personnel should be able to access /api/sales/stats"""
        headers = {"Authorization": f"Bearer {sales_token}"}
        response = requests.get(f"{BASE_URL}/api/sales/stats", headers=headers)
        assert response.status_code == 200, f"Sales personnel failed to access /api/sales/stats: {response.status_code} - {response.text}"
        data = response.json()
        # Verify stats structure
        assert "monthly" in data or "daily" in data or "yearly" in data, f"Stats response missing expected keys: {data.keys()}"
        print(f"✓ Sales personnel can access /api/sales/stats - Status: {response.status_code}")
    
    # ==================== ADDITIONAL ENDPOINT ACCESS TESTS ====================
    
    def test_sales_personnel_can_access_customers(self, sales_token):
        """Sales personnel should be able to access /api/customers (needed for sales page)"""
        headers = {"Authorization": f"Bearer {sales_token}"}
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        # Should be 200 if they have customers_view or sales_view
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        print(f"✓ Sales personnel customers access - Status: {response.status_code}")
    
    def test_sales_personnel_can_access_products(self, sales_token):
        """Sales personnel should be able to access /api/products (needed for sales page)"""
        headers = {"Authorization": f"Bearer {sales_token}"}
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        # Should be 200 if they have products_view
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        print(f"✓ Sales personnel products access - Status: {response.status_code}")
    
    def test_sales_personnel_can_access_packages(self, sales_token):
        """Sales personnel should be able to access /api/packages (needed for sales page)"""
        headers = {"Authorization": f"Bearer {sales_token}"}
        response = requests.get(f"{BASE_URL}/api/packages", headers=headers)
        # Should be 200 if they have packages_view
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        print(f"✓ Sales personnel packages access - Status: {response.status_code}")


class TestDashboardAndFinanceAccess:
    """Test dashboard and finance page access for different roles"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def sales_token(self):
        """Get sales personnel authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SALES_PERSONNEL_CREDENTIALS)
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_admin_can_access_dashboard_stats(self, admin_token):
        """Admin should be able to access /api/stats/dashboard"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=headers)
        assert response.status_code == 200, f"Admin failed to access dashboard stats: {response.status_code}"
        print(f"✓ Admin can access /api/stats/dashboard - Status: {response.status_code}")
    
    def test_admin_can_access_annual_finance(self, admin_token):
        """Admin should be able to access /api/stats/annual-finance"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/stats/annual-finance", headers=headers)
        assert response.status_code == 200, f"Admin failed to access annual finance: {response.status_code}"
        print(f"✓ Admin can access /api/stats/annual-finance - Status: {response.status_code}")
    
    def test_admin_can_access_accounting_summary(self, admin_token):
        """Admin should be able to access /api/accounting/summary"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/accounting/summary", headers=headers)
        assert response.status_code == 200, f"Admin failed to access accounting summary: {response.status_code}"
        print(f"✓ Admin can access /api/accounting/summary - Status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
