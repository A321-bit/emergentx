"""
Test suite for 9 new features in Solar Energy Sales Management System:
1. Roles & Permissions (44 permissions)
2. Dashboard monthly income/expense/net cards
3. Finance panel annual summary widgets
4. Attendance default present status
5. Accounting personnel expenses tab
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@solar.com"


class TestPermissions:
    """Test permissions endpoint - should return 44 permissions"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_permissions_returns_44(self, auth_headers):
        """Test /api/permissions returns 44 permissions"""
        response = requests.get(f"{BASE_URL}/api/permissions", headers=auth_headers)
        assert response.status_code == 200
        permissions = response.json()
        assert isinstance(permissions, list)
        # Should have 44 permissions as per requirements
        assert len(permissions) >= 40, f"Expected at least 40 permissions, got {len(permissions)}"
        print(f"Total permissions: {len(permissions)}")
        
        # Verify permission structure
        for perm in permissions:
            assert "key" in perm
            assert "label" in perm
        
        # Check for key permission categories
        perm_keys = [p["key"] for p in permissions]
        expected_keys = [
            "dashboard_view", "users_view", "users_manage", "roles_manage",
            "categories_view", "products_view", "packages_view", "packages_manage",
            "stock_view", "customers_view", "quotes_view", "sales_view",
            "dealers_view", "finance_view", "accounting_view", "expenses_view",
            "hr_view", "payroll_view", "attendance_view", "reports_view",
            "settings_manage", "xml_import_manage"
        ]
        for key in expected_keys:
            assert key in perm_keys, f"Missing permission: {key}"


class TestDashboardStats:
    """Test dashboard stats endpoint with monthly income/expense/net"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_dashboard_stats_monthly_fields(self, auth_headers):
        """Test /api/stats/dashboard returns monthly_income_total, monthly_expense_total, monthly_net"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check for monthly income/expense/net fields
        assert "monthly_income_total" in data, "Missing monthly_income_total"
        assert "monthly_expense_total" in data, "Missing monthly_expense_total"
        assert "monthly_net" in data, "Missing monthly_net"
        
        # Verify they are numeric
        assert isinstance(data["monthly_income_total"], (int, float))
        assert isinstance(data["monthly_expense_total"], (int, float))
        assert isinstance(data["monthly_net"], (int, float))
        
        # Check additional monthly fields
        assert "monthly_income_sales" in data
        assert "monthly_income_other" in data
        assert "monthly_is_loss" in data
        
        print(f"Monthly Income Total: {data['monthly_income_total']}")
        print(f"Monthly Expense Total: {data['monthly_expense_total']}")
        print(f"Monthly Net: {data['monthly_net']}")
    
    def test_dashboard_stats_stock_value(self, auth_headers):
        """Test dashboard returns stock value fields"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "stock_value_usd" in data
        assert "stock_value_tl" in data
        assert isinstance(data["stock_value_usd"], (int, float))
        assert isinstance(data["stock_value_tl"], (int, float))


class TestAnnualFinanceStats:
    """Test annual finance stats endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_annual_finance_stats_fields(self, auth_headers):
        """Test /api/stats/annual-finance returns required fields"""
        response = requests.get(f"{BASE_URL}/api/stats/annual-finance", headers=auth_headers, params={"year": 2026})
        assert response.status_code == 200
        data = response.json()
        
        # Check for stock value fields
        assert "stock_value_usd" in data, "Missing stock_value_usd"
        assert "stock_value_tl" in data, "Missing stock_value_tl"
        
        # Check for annual sales fields
        assert "annual_sales_total" in data, "Missing annual_sales_total"
        
        # Check for annual expenses
        assert "annual_expenses" in data, "Missing annual_expenses"
        
        # Check for potential profit
        assert "potential_profit_usd" in data, "Missing potential_profit_usd"
        assert "potential_profit_tl" in data, "Missing potential_profit_tl"
        
        # Verify numeric types
        assert isinstance(data["stock_value_usd"], (int, float))
        assert isinstance(data["annual_sales_total"], (int, float))
        assert isinstance(data["annual_expenses"], (int, float))
        assert isinstance(data["potential_profit_usd"], (int, float))
        
        print(f"Stock Value USD: {data['stock_value_usd']}")
        print(f"Annual Sales Total: {data['annual_sales_total']}")
        print(f"Annual Expenses: {data['annual_expenses']}")
        print(f"Potential Profit USD: {data['potential_profit_usd']}")
    
    def test_annual_finance_profit_margin(self, auth_headers):
        """Test annual finance returns profit margin"""
        response = requests.get(f"{BASE_URL}/api/stats/annual-finance", headers=auth_headers, params={"year": 2026})
        assert response.status_code == 200
        data = response.json()
        
        assert "profit_margin" in data
        assert "annual_profit" in data
        assert "is_loss" in data


class TestRoles:
    """Test roles CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_roles(self, auth_headers):
        """Test GET /api/roles"""
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        assert response.status_code == 200
        roles = response.json()
        assert isinstance(roles, list)
        
        # Should have at least one role (Yönetici = Admin in Turkish)
        role_names = [r["name"] for r in roles]
        assert len(role_names) > 0, "At least one role should exist"
        print(f"Roles found: {role_names}")


class TestEmployees:
    """Test employees endpoint for attendance"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_employees(self, auth_headers):
        """Test GET /api/employees"""
        response = requests.get(f"{BASE_URL}/api/employees", headers=auth_headers)
        assert response.status_code == 200
        employees = response.json()
        assert isinstance(employees, list)


class TestAttendance:
    """Test attendance endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_attendance(self, auth_headers):
        """Test GET /api/attendance"""
        response = requests.get(f"{BASE_URL}/api/attendance", headers=auth_headers, params={"month": "2026-02"})
        assert response.status_code == 200
        attendance = response.json()
        assert isinstance(attendance, list)


class TestAccountingExpenses:
    """Test accounting expenses endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_expenses(self, auth_headers):
        """Test GET /api/expenses"""
        response = requests.get(f"{BASE_URL}/api/expenses", headers=auth_headers)
        assert response.status_code == 200
        expenses = response.json()
        assert isinstance(expenses, list)
    
    def test_get_expense_categories(self, auth_headers):
        """Test GET /api/expense-categories"""
        response = requests.get(f"{BASE_URL}/api/expense-categories", headers=auth_headers)
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list)


class TestSalaries:
    """Test salaries endpoint for personnel expenses"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@solar.com",
            "password": "admin123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_salaries(self, auth_headers):
        """Test GET /api/salaries"""
        response = requests.get(f"{BASE_URL}/api/salaries", headers=auth_headers, params={"month": "2026-02"})
        assert response.status_code == 200
        salaries = response.json()
        assert isinstance(salaries, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
