"""
Solar Energy Sales Management System - New Sales Features Tests
Tests for: Quick Customer Create, Card Providers, Bank Accounts, Sales with Items
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ==================== FIXTURES ====================

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

@pytest.fixture
def headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ==================== CARD PROVIDERS TESTS ====================

class TestCardProviders:
    """Card Payment Providers CRUD tests (Kart Tedarikçileri)"""
    
    def test_get_card_providers(self, headers):
        """Test getting list of card providers"""
        response = requests.get(f"{BASE_URL}/api/settings/card-providers", headers=headers)
        assert response.status_code == 200, f"Get card providers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Card providers should be a list"
        print(f"✓ Retrieved {len(data)} card providers")
        return data
    
    def test_create_card_provider(self, headers):
        """Test creating a new card provider"""
        provider_data = {
            "name": "TEST_PayTR",
            "description": "Test PayTR sanal pos"
        }
        response = requests.post(f"{BASE_URL}/api/settings/card-providers", headers=headers, json=provider_data)
        assert response.status_code == 200, f"Create card provider failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Provider should have an id"
        assert data["name"] == "TEST_PayTR"
        assert data["description"] == "Test PayTR sanal pos"
        print(f"✓ Created card provider: {data['name']} (id: {data['id']})")
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/settings/card-providers", headers=headers)
        providers = get_response.json()
        found = any(p["id"] == data["id"] for p in providers)
        assert found, "Created provider not found in list"
        print(f"✓ Card provider persisted and verified")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/settings/card-providers/{data['id']}", headers=headers)
        assert delete_response.status_code == 200, f"Delete card provider failed: {delete_response.text}"
        print(f"✓ Cleaned up test card provider")
    
    def test_delete_card_provider(self, headers):
        """Test deleting a card provider"""
        # First create one
        provider_data = {"name": "TEST_ToDelete", "description": "Will be deleted"}
        create_response = requests.post(f"{BASE_URL}/api/settings/card-providers", headers=headers, json=provider_data)
        provider_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/settings/card-providers/{provider_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/settings/card-providers", headers=headers)
        providers = get_response.json()
        found = any(p["id"] == provider_id for p in providers)
        assert not found, "Deleted provider should not be in list"
        print(f"✓ Card provider deleted and verified")


# ==================== BANK ACCOUNTS TESTS ====================

class TestBankAccounts:
    """Bank Accounts CRUD tests (Satış Banka Hesapları)"""
    
    def test_get_bank_accounts(self, headers):
        """Test getting list of bank accounts"""
        response = requests.get(f"{BASE_URL}/api/settings/sale-bank-accounts", headers=headers)
        assert response.status_code == 200, f"Get bank accounts failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Bank accounts should be a list"
        print(f"✓ Retrieved {len(data)} bank accounts")
        return data
    
    def test_create_bank_account_tl(self, headers):
        """Test creating a TL bank account"""
        account_data = {
            "bank_name": "TEST_Ziraat Bankası",
            "bank_branch": "Kadıköy Şubesi",
            "account_holder": "Solar Enerji A.Ş.",
            "iban": "TR330006100519786457841326",
            "currency": "TRY"
        }
        response = requests.post(f"{BASE_URL}/api/settings/sale-bank-accounts", headers=headers, json=account_data)
        assert response.status_code == 200, f"Create bank account failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Account should have an id"
        assert data["bank_name"] == "TEST_Ziraat Bankası"
        assert data["currency"] == "TRY"
        assert data["iban"] == "TR330006100519786457841326"
        print(f"✓ Created TL bank account: {data['bank_name']} (IBAN: {data['iban'][:10]}...)")
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/settings/sale-bank-accounts", headers=headers)
        accounts = get_response.json()
        found = any(a.get("id") == data["id"] for a in accounts)
        assert found, "Created account not found in list"
        print(f"✓ Bank account persisted and verified")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/settings/sale-bank-accounts/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test bank account")
    
    def test_create_bank_account_usd(self, headers):
        """Test creating a USD bank account"""
        account_data = {
            "bank_name": "TEST_İş Bankası",
            "bank_branch": "Merkez Şube",
            "account_holder": "Solar Energy Inc.",
            "iban": "TR440006400000168000123456",
            "swift": "ISBKTRIS",
            "currency": "USD"
        }
        response = requests.post(f"{BASE_URL}/api/settings/sale-bank-accounts", headers=headers, json=account_data)
        assert response.status_code == 200, f"Create USD bank account failed: {response.text}"
        data = response.json()
        
        assert data["currency"] == "USD"
        assert data["swift"] == "ISBKTRIS"
        print(f"✓ Created USD bank account: {data['bank_name']} (Currency: {data['currency']})")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/settings/sale-bank-accounts/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test USD bank account")
    
    def test_delete_bank_account(self, headers):
        """Test deleting a bank account"""
        # First create one
        account_data = {"bank_name": "TEST_ToDelete", "currency": "TRY"}
        create_response = requests.post(f"{BASE_URL}/api/settings/sale-bank-accounts", headers=headers, json=account_data)
        account_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/settings/sale-bank-accounts/{account_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/settings/sale-bank-accounts", headers=headers)
        accounts = get_response.json()
        found = any(a.get("id") == account_id for a in accounts)
        assert not found, "Deleted account should not be in list"
        print(f"✓ Bank account deleted and verified")


# ==================== QUICK CUSTOMER CREATE TESTS ====================

class TestQuickCustomerCreate:
    """Quick Customer Create tests (Hızlı Müşteri Oluşturma)"""
    
    def test_quick_create_customer_minimal(self, headers):
        """Test quick creating a customer with minimal data"""
        customer_data = {
            "name": "TEST_Hızlı Müşteri"
        }
        response = requests.post(f"{BASE_URL}/api/customers/quick-create", headers=headers, json=customer_data)
        assert response.status_code == 200, f"Quick create customer failed: {response.text}"
        data = response.json()
        
        assert "id" in data, "Customer should have an id"
        assert data["name"] == "TEST_Hızlı Müşteri"
        print(f"✓ Quick created customer: {data['name']} (id: {data['id']})")
        
        # Verify persistence via GET
        get_response = requests.get(f"{BASE_URL}/api/customers/{data['id']}", headers=headers)
        assert get_response.status_code == 200, f"Get customer failed: {get_response.text}"
        fetched = get_response.json()
        assert fetched["name"] == "TEST_Hızlı Müşteri"
        print(f"✓ Customer persisted and verified")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/customers/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test customer")
    
    def test_quick_create_customer_full(self, headers):
        """Test quick creating a customer with all fields"""
        customer_data = {
            "name": "TEST_Tam Müşteri",
            "phone": "05551234567",
            "city": "İstanbul",
            "district": "Kadıköy",
            "notes": "Test notları"
        }
        response = requests.post(f"{BASE_URL}/api/customers/quick-create", headers=headers, json=customer_data)
        assert response.status_code == 200, f"Quick create customer failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "TEST_Tam Müşteri"
        assert data["phone"] == "05551234567"
        assert data["city"] == "İstanbul"
        assert data["district"] == "Kadıköy"
        assert data["notes"] == "Test notları"
        print(f"✓ Quick created customer with full data: {data['name']}")
        print(f"  - Phone: {data['phone']}")
        print(f"  - Location: {data['city']}/{data['district']}")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/customers/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test customer")


# ==================== SALES WITH ITEMS TESTS ====================

class TestSalesWithItems:
    """Sales with Items, Card Provider, Bank Account tests"""
    
    def test_get_sales(self, headers):
        """Test getting list of sales"""
        response = requests.get(f"{BASE_URL}/api/sales", headers=headers)
        assert response.status_code == 200, f"Get sales failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Sales should be a list"
        print(f"✓ Retrieved {len(data)} sales")
        return data
    
    def test_get_products_for_sale(self, headers):
        """Test getting products for sale items"""
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        assert response.status_code == 200, f"Get products failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Products should be a list"
        print(f"✓ Retrieved {len(data)} products for sale items")
        return data
    
    def test_get_packages_for_sale(self, headers):
        """Test getting packages for sale items"""
        response = requests.get(f"{BASE_URL}/api/packages", headers=headers)
        assert response.status_code == 200, f"Get packages failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Packages should be a list"
        print(f"✓ Retrieved {len(data)} packages for sale items")
        return data
    
    def test_create_sale_with_card_payment(self, headers):
        """Test creating a sale with card payment and provider"""
        # First create a card provider
        provider_data = {"name": "TEST_PayTR_Sale", "description": "Test"}
        provider_response = requests.post(f"{BASE_URL}/api/settings/card-providers", headers=headers, json=provider_data)
        provider = provider_response.json()
        
        # Create sale with card payment
        sale_data = {
            "customer_name": "TEST_Kart Müşterisi",
            "sale_amount_tl": 10000,
            "sale_amount_usd": 294.12,
            "exchange_rate": 34.0,
            "sale_date": "2026-01-30T10:00:00Z",
            "kart_tl": 10000,
            "kart_provider_id": provider["id"],
            "kart_provider_name": provider["name"],
            "notes": "Kart ile ödeme testi"
        }
        response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json=sale_data)
        assert response.status_code == 200, f"Create sale with card failed: {response.text}"
        data = response.json()
        
        assert data["customer_name"] == "TEST_Kart Müşterisi"
        assert data["kart_tl"] == 10000
        assert data["kart_provider_id"] == provider["id"]
        assert data["kart_provider_name"] == provider["name"]
        print(f"✓ Created sale with card payment: {data['customer_name']}")
        print(f"  - Card Amount: ₺{data['kart_tl']}")
        print(f"  - Card Provider: {data['kart_provider_name']}")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/sales/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        requests.delete(f"{BASE_URL}/api/settings/card-providers/{provider['id']}", headers=headers)
        print(f"✓ Cleaned up test sale and provider")
    
    def test_create_sale_with_bank_transfer(self, headers):
        """Test creating a sale with bank transfer (havale)"""
        # First create a bank account
        account_data = {"bank_name": "TEST_Ziraat_Sale", "currency": "TRY", "iban": "TR123456789"}
        account_response = requests.post(f"{BASE_URL}/api/settings/sale-bank-accounts", headers=headers, json=account_data)
        account = account_response.json()
        
        # Create sale with bank transfer
        sale_data = {
            "customer_name": "TEST_Havale Müşterisi",
            "sale_amount_tl": 50000,
            "sale_amount_usd": 1470.59,
            "exchange_rate": 34.0,
            "sale_date": "2026-01-30T10:00:00Z",
            "havale_tl": 50000,
            "havale_bank_account_id": account["id"],
            "havale_bank_name": account["bank_name"],
            "havale_currency": "TRY",
            "notes": "Havale ile ödeme testi"
        }
        response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json=sale_data)
        assert response.status_code == 200, f"Create sale with bank transfer failed: {response.text}"
        data = response.json()
        
        assert data["customer_name"] == "TEST_Havale Müşterisi"
        assert data["havale_tl"] == 50000
        assert data["havale_bank_account_id"] == account["id"]
        assert data["havale_bank_name"] == account["bank_name"]
        assert data["havale_currency"] == "TRY"
        print(f"✓ Created sale with bank transfer: {data['customer_name']}")
        print(f"  - Transfer Amount: ₺{data['havale_tl']}")
        print(f"  - Bank: {data['havale_bank_name']}")
        print(f"  - Currency: {data['havale_currency']}")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/sales/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        requests.delete(f"{BASE_URL}/api/settings/sale-bank-accounts/{account['id']}", headers=headers)
        print(f"✓ Cleaned up test sale and bank account")
    
    def test_create_sale_with_usd_transfer(self, headers):
        """Test creating a sale with USD bank transfer"""
        # First create a USD bank account
        account_data = {"bank_name": "TEST_USD_Bank", "currency": "USD", "iban": "TR987654321", "swift": "TESTSWIFT"}
        account_response = requests.post(f"{BASE_URL}/api/settings/sale-bank-accounts", headers=headers, json=account_data)
        account = account_response.json()
        
        # Create sale with USD transfer
        sale_data = {
            "customer_name": "TEST_USD Müşterisi",
            "sale_amount_tl": 34000,
            "sale_amount_usd": 1000,
            "exchange_rate": 34.0,
            "sale_date": "2026-01-30T10:00:00Z",
            "havale_tl": 34000,
            "havale_bank_account_id": account["id"],
            "havale_bank_name": account["bank_name"],
            "havale_currency": "USD",
            "havale_usd_amount": 1000,
            "notes": "USD havale testi"
        }
        response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json=sale_data)
        assert response.status_code == 200, f"Create sale with USD transfer failed: {response.text}"
        data = response.json()
        
        assert data["havale_currency"] == "USD"
        assert data["havale_usd_amount"] == 1000
        print(f"✓ Created sale with USD transfer: {data['customer_name']}")
        print(f"  - USD Amount: ${data['havale_usd_amount']}")
        print(f"  - Currency: {data['havale_currency']}")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/sales/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        requests.delete(f"{BASE_URL}/api/settings/sale-bank-accounts/{account['id']}", headers=headers)
        print(f"✓ Cleaned up test sale and USD bank account")
    
    def test_create_sale_with_items(self, headers):
        """Test creating a sale with product/package items"""
        # Get existing products
        products_response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        products = products_response.json()
        
        items = []
        if products:
            product = products[0]
            items.append({
                "item_type": "product",
                "item_id": product["id"],
                "item_name": product["name"],
                "quantity": 2,
                "unit_price": product.get("sale_price", 100),
                "line_total": 2 * product.get("sale_price", 100)
            })
        
        # Create sale with items
        sale_data = {
            "customer_name": "TEST_Ürünlü Satış",
            "sale_amount_tl": 20000,
            "sale_amount_usd": 588.24,
            "exchange_rate": 34.0,
            "sale_date": "2026-01-30T10:00:00Z",
            "items": items,
            "calculated_total": 20000,
            "discount_percent": 10,
            "net_total": 18000,
            "nakit_tl": 18000,
            "notes": "Ürünlü satış testi"
        }
        response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json=sale_data)
        assert response.status_code == 200, f"Create sale with items failed: {response.text}"
        data = response.json()
        
        assert data["customer_name"] == "TEST_Ürünlü Satış"
        if items:
            assert data.get("items") is not None, "Sale should have items"
            assert len(data["items"]) > 0, "Sale should have at least one item"
        assert data.get("discount_percent") == 10
        print(f"✓ Created sale with items: {data['customer_name']}")
        print(f"  - Items: {len(data.get('items', []))}")
        print(f"  - Discount: {data.get('discount_percent')}%")
        print(f"  - Net Total: ₺{data.get('net_total')}")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/sales/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test sale with items")
    
    def test_create_sale_with_mixed_payments(self, headers):
        """Test creating a sale with multiple payment methods"""
        sale_data = {
            "customer_name": "TEST_Karışık Ödeme",
            "sale_amount_tl": 100000,
            "sale_amount_usd": 2941.18,
            "exchange_rate": 34.0,
            "sale_date": "2026-01-30T10:00:00Z",
            "nakit_tl": 30000,
            "kart_tl": 40000,
            "havale_tl": 30000,
            "havale_currency": "TRY",
            "notes": "Karışık ödeme testi"
        }
        response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json=sale_data)
        assert response.status_code == 200, f"Create sale with mixed payments failed: {response.text}"
        data = response.json()
        
        assert data["nakit_tl"] == 30000
        assert data["kart_tl"] == 40000
        assert data["havale_tl"] == 30000
        total_paid = data["nakit_tl"] + data["kart_tl"] + data["havale_tl"]
        assert total_paid == 100000, f"Total paid should be 100000, got {total_paid}"
        print(f"✓ Created sale with mixed payments: {data['customer_name']}")
        print(f"  - Cash: ₺{data['nakit_tl']}")
        print(f"  - Card: ₺{data['kart_tl']}")
        print(f"  - Transfer: ₺{data['havale_tl']}")
        print(f"  - Total Paid: ₺{total_paid}")
        
        # Cleanup
        delete_response = requests.delete(f"{BASE_URL}/api/sales/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Cleaned up test sale with mixed payments")


# ==================== SALES STATS TESTS ====================

class TestSalesStats:
    """Sales Statistics tests"""
    
    def test_get_sales_stats(self, headers):
        """Test getting sales statistics"""
        response = requests.get(f"{BASE_URL}/api/sales/stats", headers=headers)
        assert response.status_code == 200, f"Get sales stats failed: {response.text}"
        data = response.json()
        
        # Check for expected periods
        expected_periods = ["daily", "weekly", "monthly", "yearly"]
        for period in expected_periods:
            assert period in data, f"Missing period: {period}"
        
        print(f"✓ Retrieved sales stats")
        for period in expected_periods:
            stats = data[period]
            print(f"  - {period}: {stats.get('count', 0)} sales, ₺{stats.get('sale_tl', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
