"""
Test Suite for Accounting, Finance, and Reports Features
Tests:
1. Muhasebe Kontrol Panelinde Net Kar hesaplama: Net Kar = Brüt Kar - Toplam Giderler
2. Bütçe hesaplama: Bütçe Tutarı - Ödenmiş Giderler
3. Finans panelinde Brüt Kar Marjı kartı
4. Finans panelinde Yıllık Net Kar hesaplama
5. Finans panelinde Yıllık Gider Dağılımı (Değişken/Personel/Sabit)
6. Raporlar sayfasında Teklif Analizi sekmesi
7. Teklif Analizi - Kullanıcı bazlı teklif sayıları
8. Teklif Analizi - Potansiyel dağılımı (Yüksek/Düşük)
9. Teklif Analizi - İl bazlı teklif dağılımı
10. Giderler tablosunda düzenleme butonu (PUT /api/expenses/{expense_id})
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAccountingFinanceReports:
    """Test suite for Accounting, Finance, and Reports features"""
    
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
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        self.session.close()
    
    # ==================== ACCOUNTING SUMMARY TESTS ====================
    
    def test_accounting_summary_endpoint_returns_200(self):
        """Test GET /api/accounting/summary returns 200"""
        response = self.session.get(f"{BASE_URL}/api/accounting/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ GET /api/accounting/summary returns 200")
    
    def test_accounting_summary_has_net_profit_field(self):
        """Test accounting summary contains net_profit field"""
        response = self.session.get(f"{BASE_URL}/api/accounting/summary")
        data = response.json()
        
        assert "net_profit" in data, "net_profit field missing from response"
        assert "gross_profit" in data, "gross_profit field missing from response"
        assert "grand_total_expenses" in data, "grand_total_expenses field missing from response"
        print(f"✓ net_profit: {data['net_profit']}, gross_profit: {data['gross_profit']}, grand_total_expenses: {data['grand_total_expenses']}")
    
    def test_net_profit_calculation_formula(self):
        """Test Net Kar = Brüt Kar - Toplam Giderler"""
        response = self.session.get(f"{BASE_URL}/api/accounting/summary")
        data = response.json()
        
        gross_profit = data.get("gross_profit", 0)
        grand_total_expenses = data.get("grand_total_expenses", 0)
        net_profit = data.get("net_profit", 0)
        
        # Net Kar = Brüt Kar - Toplam Giderler
        expected_net_profit = gross_profit - grand_total_expenses
        
        # Allow small floating point differences
        assert abs(net_profit - expected_net_profit) < 0.01, \
            f"Net profit calculation wrong. Expected {expected_net_profit}, got {net_profit}"
        print(f"✓ Net Kar formula verified: {gross_profit} - {grand_total_expenses} = {net_profit}")
    
    def test_accounting_summary_has_budget_status(self):
        """Test accounting summary contains budget_status field"""
        response = self.session.get(f"{BASE_URL}/api/accounting/summary")
        data = response.json()
        
        # budget_status can be null if no budget is set
        assert "budget_status" in data, "budget_status field missing from response"
        print(f"✓ budget_status field present: {data['budget_status']}")
    
    def test_budget_remaining_calculation(self):
        """Test Bütçe Kalan = Bütçe Tutarı - Ödenmiş Giderler"""
        response = self.session.get(f"{BASE_URL}/api/accounting/summary")
        data = response.json()
        
        budget_status = data.get("budget_status")
        if budget_status:
            total_budget = budget_status.get("total_budget", 0)
            spent = budget_status.get("spent", 0)  # Ödenmiş giderler
            remaining = budget_status.get("remaining", 0)
            
            # Bütçe Kalan = Bütçe Tutarı - Ödenmiş Giderler
            expected_remaining = total_budget - spent
            
            assert abs(remaining - expected_remaining) < 0.01, \
                f"Budget remaining calculation wrong. Expected {expected_remaining}, got {remaining}"
            print(f"✓ Budget formula verified: {total_budget} - {spent} = {remaining}")
        else:
            print("✓ No budget set for this period (budget_status is null)")
    
    def test_accounting_summary_has_expense_breakdown(self):
        """Test accounting summary has expense breakdown fields"""
        response = self.session.get(f"{BASE_URL}/api/accounting/summary")
        data = response.json()
        
        # Check for expense breakdown fields
        assert "total_expenses" in data, "total_expenses field missing"
        assert "personnel_salary" in data, "personnel_salary field missing"
        assert "recurring_expenses" in data, "recurring_expenses field missing"
        assert "grand_paid_expenses" in data, "grand_paid_expenses field missing"
        
        print(f"✓ Expense breakdown: total={data['total_expenses']}, personnel={data['personnel_salary']}, recurring={data['recurring_expenses']}")
    
    # ==================== ANNUAL FINANCE TESTS ====================
    
    def test_annual_finance_endpoint_returns_200(self):
        """Test GET /api/stats/annual-finance returns 200"""
        response = self.session.get(f"{BASE_URL}/api/stats/annual-finance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ GET /api/stats/annual-finance returns 200")
    
    def test_annual_finance_has_gross_profit_margin(self):
        """Test annual finance contains Brüt Kar Marjı fields"""
        response = self.session.get(f"{BASE_URL}/api/stats/annual-finance")
        data = response.json()
        
        assert "annual_gross_profit" in data, "annual_gross_profit field missing"
        assert "annual_gross_profit_margin" in data, "annual_gross_profit_margin field missing"
        
        print(f"✓ Brüt Kar Marjı: {data['annual_gross_profit']} (Marj: %{data['annual_gross_profit_margin']})")
    
    def test_annual_finance_has_net_profit(self):
        """Test annual finance contains Yıllık Net Kar fields"""
        response = self.session.get(f"{BASE_URL}/api/stats/annual-finance")
        data = response.json()
        
        assert "annual_profit" in data, "annual_profit field missing"
        assert "profit_margin" in data, "profit_margin field missing"
        assert "is_loss" in data, "is_loss field missing"
        
        print(f"✓ Yıllık Net Kar: {data['annual_profit']} (Marj: %{data['profit_margin']}, Zarar: {data['is_loss']})")
    
    def test_annual_finance_has_expense_distribution(self):
        """Test annual finance contains Yıllık Gider Dağılımı (Değişken/Personel/Sabit)"""
        response = self.session.get(f"{BASE_URL}/api/stats/annual-finance")
        data = response.json()
        
        assert "annual_expenses_variable" in data, "annual_expenses_variable field missing"
        assert "annual_personnel_expenses" in data, "annual_personnel_expenses field missing"
        assert "annual_recurring_expenses" in data, "annual_recurring_expenses field missing"
        assert "annual_expenses" in data, "annual_expenses (total) field missing"
        
        print(f"✓ Yıllık Gider Dağılımı: Değişken={data['annual_expenses_variable']}, Personel={data['annual_personnel_expenses']}, Sabit={data['annual_recurring_expenses']}")
    
    def test_annual_net_profit_calculation(self):
        """Test Yıllık Net Kar = Brüt Kar - Toplam Giderler"""
        response = self.session.get(f"{BASE_URL}/api/stats/annual-finance")
        data = response.json()
        
        annual_gross_profit = data.get("annual_gross_profit", 0)
        annual_expenses = data.get("annual_expenses", 0)
        annual_profit = data.get("annual_profit", 0)
        
        # Yıllık Net Kar = Brüt Kar - Toplam Giderler
        expected_profit = annual_gross_profit - annual_expenses
        
        assert abs(annual_profit - expected_profit) < 0.01, \
            f"Annual profit calculation wrong. Expected {expected_profit}, got {annual_profit}"
        print(f"✓ Yıllık Net Kar formula verified: {annual_gross_profit} - {annual_expenses} = {annual_profit}")
    
    # ==================== QUOTE ANALYSIS TESTS ====================
    
    def test_quote_analysis_endpoint_returns_200(self):
        """Test GET /api/reports/quote-analysis returns 200"""
        response = self.session.get(f"{BASE_URL}/api/reports/quote-analysis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ GET /api/reports/quote-analysis returns 200")
    
    def test_quote_analysis_has_summary(self):
        """Test quote analysis contains summary with total_count and total_value"""
        response = self.session.get(f"{BASE_URL}/api/reports/quote-analysis")
        data = response.json()
        
        assert "summary" in data, "summary field missing"
        assert "total_count" in data["summary"], "total_count missing from summary"
        assert "total_value" in data["summary"], "total_value missing from summary"
        
        print(f"✓ Teklif Özeti: {data['summary']['total_count']} adet, {data['summary']['total_value']} TL")
    
    def test_quote_analysis_has_by_user(self):
        """Test quote analysis contains kullanıcı bazlı teklif sayıları"""
        response = self.session.get(f"{BASE_URL}/api/reports/quote-analysis")
        data = response.json()
        
        assert "by_user" in data, "by_user field missing"
        assert isinstance(data["by_user"], list), "by_user should be a list"
        
        # Check structure of user items
        if len(data["by_user"]) > 0:
            user_item = data["by_user"][0]
            assert "user_name" in user_item, "user_name missing from by_user item"
            assert "count" in user_item, "count missing from by_user item"
            assert "value" in user_item, "value missing from by_user item"
        
        print(f"✓ Kullanıcı bazlı teklif: {len(data['by_user'])} kullanıcı")
        for user in data["by_user"][:3]:
            print(f"  - {user['user_name']}: {user['count']} adet, {user['value']} TL")
    
    def test_quote_analysis_has_by_potential(self):
        """Test quote analysis contains potansiyel dağılımı (Yüksek/Düşük)"""
        response = self.session.get(f"{BASE_URL}/api/reports/quote-analysis")
        data = response.json()
        
        assert "by_potential" in data, "by_potential field missing"
        
        # Check for expected potential categories
        by_potential = data["by_potential"]
        assert "yuksek_potansiyel" in by_potential, "yuksek_potansiyel missing"
        assert "dusuk_potansiyel" in by_potential, "dusuk_potansiyel missing"
        
        # Check structure
        for key in ["yuksek_potansiyel", "dusuk_potansiyel"]:
            assert "count" in by_potential[key], f"count missing from {key}"
            assert "value" in by_potential[key], f"value missing from {key}"
        
        print(f"✓ Potansiyel Dağılımı:")
        print(f"  - Yüksek Potansiyel: {by_potential['yuksek_potansiyel']['count']} adet")
        print(f"  - Düşük Potansiyel: {by_potential['dusuk_potansiyel']['count']} adet")
    
    def test_quote_analysis_has_by_city(self):
        """Test quote analysis contains il bazlı teklif dağılımı"""
        response = self.session.get(f"{BASE_URL}/api/reports/quote-analysis")
        data = response.json()
        
        assert "by_city" in data, "by_city field missing"
        assert isinstance(data["by_city"], list), "by_city should be a list"
        
        # Check structure of city items
        if len(data["by_city"]) > 0:
            city_item = data["by_city"][0]
            assert "city" in city_item, "city missing from by_city item"
            assert "count" in city_item, "count missing from by_city item"
            assert "value" in city_item, "value missing from by_city item"
        
        print(f"✓ İl bazlı dağılım: {len(data['by_city'])} il")
        for city in data["by_city"][:5]:
            print(f"  - {city['city']}: {city['count']} adet, {city['value']} TL")
    
    # ==================== EXPENSE UPDATE TESTS ====================
    
    def test_expense_update_endpoint_exists(self):
        """Test PUT /api/expenses/{expense_id} endpoint exists"""
        # First get an expense to update
        expenses_response = self.session.get(f"{BASE_URL}/api/expenses")
        assert expenses_response.status_code == 200, f"Failed to get expenses: {expenses_response.text}"
        
        expenses = expenses_response.json()
        if len(expenses) > 0:
            expense_id = expenses[0]["id"]
            
            # Try to update with same data (should work)
            update_data = {
                "category_id": expenses[0].get("category_id"),
                "amount": expenses[0].get("amount"),
                "currency": expenses[0].get("currency", "TRY"),
                "expense_date": expenses[0].get("expense_date"),
                "description": expenses[0].get("description", "Test update")
            }
            
            response = self.session.put(f"{BASE_URL}/api/expenses/{expense_id}", json=update_data)
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            print(f"✓ PUT /api/expenses/{expense_id} returns 200")
        else:
            print("✓ No expenses to test update (skipped)")
    
    def test_expense_update_returns_updated_data(self):
        """Test expense update returns updated expense data"""
        # First get an expense to update
        expenses_response = self.session.get(f"{BASE_URL}/api/expenses")
        expenses = expenses_response.json()
        
        if len(expenses) > 0:
            expense_id = expenses[0]["id"]
            original_description = expenses[0].get("description", "")
            new_description = f"Updated at {datetime.now().isoformat()}"
            
            update_data = {
                "category_id": expenses[0].get("category_id"),
                "amount": expenses[0].get("amount"),
                "currency": expenses[0].get("currency", "TRY"),
                "expense_date": expenses[0].get("expense_date"),
                "description": new_description
            }
            
            response = self.session.put(f"{BASE_URL}/api/expenses/{expense_id}", json=update_data)
            assert response.status_code == 200
            
            updated_expense = response.json()
            assert updated_expense.get("description") == new_description, \
                f"Description not updated. Expected '{new_description}', got '{updated_expense.get('description')}'"
            
            # Restore original description
            update_data["description"] = original_description
            self.session.put(f"{BASE_URL}/api/expenses/{expense_id}", json=update_data)
            
            print(f"✓ Expense update returns updated data correctly")
        else:
            print("✓ No expenses to test update (skipped)")
    
    def test_expense_update_invalid_id_returns_404(self):
        """Test expense update with invalid ID returns 404"""
        update_data = {
            "category_id": "test",
            "amount": 100,
            "currency": "TRY",
            "expense_date": datetime.now().isoformat(),
            "description": "Test"
        }
        
        response = self.session.put(f"{BASE_URL}/api/expenses/invalid-id-12345", json=update_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT /api/expenses/invalid-id returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
