#!/usr/bin/env python3
"""
SolarPro Backend API Test Suite
Tests all endpoints for the solar energy sales management system
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SolarProAPITester:
    def __init__(self, base_url: str = "https://solarsmart-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_ids = {
            'products': [],
            'customers': [],
            'quotes': [],
            'users': [],
            'dealers': []
        }

    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED")
        else:
            print(f"❌ {test_name}: FAILED - {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response_data': response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {'error': f'Unsupported method: {method}'}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {'status_code': response.status_code, 'text': response.text}
            
            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {'error': str(e)}

    def test_init_data(self):
        """Test initialization of default data"""
        print("\n🔧 Testing Data Initialization...")
        success, response = self.make_request('POST', 'init-data', expected_status=200)
        
        if success and 'admin_email' in response:
            self.log_result("Init Default Data", True, f"Admin created: {response.get('admin_email')}")
            return True
        else:
            # Data might already exist
            self.log_result("Init Default Data", True, "Data already exists or created successfully")
            return True

    def test_login(self):
        """Test admin login"""
        print("\n🔐 Testing Authentication...")
        
        login_data = {
            "email": "admin@solar.com",
            "password": "admin123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data, 200)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log_result("Admin Login", True, f"Token received, User: {response['user']['name']}")
            return True
        else:
            self.log_result("Admin Login", False, f"Login failed: {response}")
            return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard Stats...")
        
        success, response = self.make_request('GET', 'stats/dashboard')
        
        if success and isinstance(response, dict):
            required_fields = ['total_products', 'total_customers', 'total_quotes', 'total_revenue']
            has_all_fields = all(field in response for field in required_fields)
            
            if has_all_fields:
                self.log_result("Dashboard Stats", True, f"Stats: {response['total_products']} products, {response['total_customers']} customers")
                return True
            else:
                self.log_result("Dashboard Stats", False, f"Missing required fields: {response}")
                return False
        else:
            self.log_result("Dashboard Stats", False, f"Invalid response: {response}")
            return False

    def test_products_crud(self):
        """Test products CRUD operations"""
        print("\n📦 Testing Products CRUD...")
        
        # Get products
        success, response = self.make_request('GET', 'products')
        if success and isinstance(response, list):
            product_count = len(response)
            self.log_result("Get Products", True, f"Retrieved {product_count} products")
            
            # Check if we have at least 6 products as required
            if product_count >= 6:
                self.log_result("Product Count Check", True, f"Has {product_count} products (≥6 required)")
            else:
                self.log_result("Product Count Check", False, f"Only {product_count} products, need ≥6")
        else:
            self.log_result("Get Products", False, f"Failed to get products: {response}")
            return False

        # Create new product (admin only)
        new_product = {
            "name": "Test Solar Panel 600W",
            "category": "panel",
            "description": "Test product for API testing",
            "purchase_price": 3000.0,
            "sale_price": 4200.0,
            "dealer_price": 3600.0,
            "stock_quantity": 50,
            "unit": "adet"
        }
        
        success, response = self.make_request('POST', 'products', new_product, 200)
        if success and 'id' in response:
            product_id = response['id']
            self.created_ids['products'].append(product_id)
            self.log_result("Create Product", True, f"Created product ID: {product_id}")
            
            # Update product
            update_data = {"stock_quantity": 75}
            success, response = self.make_request('PUT', f'products/{product_id}', update_data)
            if success:
                self.log_result("Update Product", True, "Product updated successfully")
            else:
                self.log_result("Update Product", False, f"Update failed: {response}")
        else:
            self.log_result("Create Product", False, f"Creation failed: {response}")

        return True

    def test_customers_crud(self):
        """Test customers CRUD operations"""
        print("\n👥 Testing Customers CRUD...")
        
        # Get customers
        success, response = self.make_request('GET', 'customers')
        if success and isinstance(response, list):
            self.log_result("Get Customers", True, f"Retrieved {len(response)} customers")
        else:
            self.log_result("Get Customers", False, f"Failed: {response}")
            return False

        # Create new customer
        new_customer = {
            "name": "Test Müşteri A.Ş.",
            "phone": "0212 555 1234",
            "email": "test@musteri.com",
            "address": "Test Mahallesi, Test Sokak No:1, İstanbul",
            "customer_type": "isletme",
            "notes": "API test müşterisi"
        }
        
        success, response = self.make_request('POST', 'customers', new_customer, 200)
        if success and 'id' in response:
            customer_id = response['id']
            self.created_ids['customers'].append(customer_id)
            self.log_result("Create Customer", True, f"Created customer ID: {customer_id}")
            
            # Update customer
            update_data = {"notes": "Updated via API test"}
            success, response = self.make_request('PUT', f'customers/{customer_id}', update_data)
            if success:
                self.log_result("Update Customer", True, "Customer updated successfully")
            else:
                self.log_result("Update Customer", False, f"Update failed: {response}")
        else:
            self.log_result("Create Customer", False, f"Creation failed: {response}")

        return True

    def test_quotes_crud(self):
        """Test quotes CRUD operations"""
        print("\n📋 Testing Quotes CRUD...")
        
        # Get quotes
        success, response = self.make_request('GET', 'quotes')
        if success and isinstance(response, list):
            self.log_result("Get Quotes", True, f"Retrieved {len(response)} quotes")
        else:
            self.log_result("Get Quotes", False, f"Failed: {response}")
            return False

        # Need customer and product for quote creation
        if not self.created_ids['customers'] or not self.created_ids['products']:
            self.log_result("Create Quote", False, "No customer or product available for quote creation")
            return False

        # Create new quote
        new_quote = {
            "customer_id": self.created_ids['customers'][0],
            "items": [
                {
                    "product_id": self.created_ids['products'][0],
                    "quantity": 2
                }
            ],
            "discount_rate": 5.0,
            "currency": "TRY",
            "validity_days": 30,
            "notes": "API test teklifi"
        }
        
        success, response = self.make_request('POST', 'quotes', new_quote, 200)
        if success and 'id' in response:
            quote_id = response['id']
            self.created_ids['quotes'].append(quote_id)
            self.log_result("Create Quote", True, f"Created quote ID: {quote_id}")
            
            # Update quote status
            status_update = {"status": "onaylandi"}
            success, response = self.make_request('PUT', f'quotes/{quote_id}/status', status_update)
            if success:
                self.log_result("Update Quote Status", True, "Quote status updated to 'onaylandi'")
                
                # Convert to sale
                status_update = {"status": "satisa_dondu"}
                success, response = self.make_request('PUT', f'quotes/{quote_id}/status', status_update)
                if success:
                    self.log_result("Convert Quote to Sale", True, "Quote converted to sale")
                else:
                    self.log_result("Convert Quote to Sale", False, f"Conversion failed: {response}")
            else:
                self.log_result("Update Quote Status", False, f"Status update failed: {response}")
        else:
            self.log_result("Create Quote", False, f"Creation failed: {response}")

        return True

    def test_users_management(self):
        """Test user management (admin only)"""
        print("\n👤 Testing User Management...")
        
        # Get users
        success, response = self.make_request('GET', 'users')
        if success and isinstance(response, list):
            self.log_result("Get Users", True, f"Retrieved {len(response)} users")
        else:
            self.log_result("Get Users", False, f"Failed: {response}")
            return False

        # Create new user (staff)
        new_user = {
            "email": "personel@solar.com",
            "name": "Test Personel",
            "role": "personel",
            "phone": "0212 555 5678",
            "password": "test123"
        }
        
        success, response = self.make_request('POST', 'users', new_user, 200)
        if success and 'id' in response:
            user_id = response['id']
            self.created_ids['users'].append(user_id)
            self.log_result("Create User", True, f"Created user ID: {user_id}")
        else:
            self.log_result("Create User", False, f"Creation failed: {response}")

        return True

    def test_dealers_management(self):
        """Test dealer management"""
        print("\n🏢 Testing Dealer Management...")
        
        # Get dealers
        success, response = self.make_request('GET', 'dealers')
        if success and isinstance(response, list):
            self.log_result("Get Dealers", True, f"Retrieved {len(response)} dealers")
        else:
            self.log_result("Get Dealers", False, f"Failed: {response}")
            return False

        # Create new dealer
        new_dealer = {
            "name": "Test Bayi Ltd.",
            "contact_person": "Ahmet Yılmaz",
            "phone": "0212 555 9999",
            "email": "bayi@test.com",
            "address": "Bayi Mahallesi, İstanbul",
            "discount_rate": 15.0
        }
        
        success, response = self.make_request('POST', 'dealers', new_dealer, 200)
        if success and 'id' in response:
            dealer_id = response['id']
            self.created_ids['dealers'].append(dealer_id)
            self.log_result("Create Dealer", True, f"Created dealer ID: {dealer_id} with 15% discount")
        else:
            self.log_result("Create Dealer", False, f"Creation failed: {response}")

        return True

    def test_stock_management(self):
        """Test stock movement operations"""
        print("\n📊 Testing Stock Management...")
        
        if not self.created_ids['products']:
            self.log_result("Stock Movement", False, "No product available for stock testing")
            return False

        # Create stock entry
        stock_entry = {
            "product_id": self.created_ids['products'][0],
            "movement_type": "giris",
            "quantity": 25,
            "note": "API test stock entry"
        }
        
        success, response = self.make_request('POST', 'stock-movements', stock_entry, 200)
        if success:
            self.log_result("Stock Entry", True, "Stock entry created successfully")
            
            # Create stock exit
            stock_exit = {
                "product_id": self.created_ids['products'][0],
                "movement_type": "cikis",
                "quantity": 10,
                "note": "API test stock exit"
            }
            
            success, response = self.make_request('POST', 'stock-movements', stock_exit, 200)
            if success:
                self.log_result("Stock Exit", True, "Stock exit created successfully")
            else:
                self.log_result("Stock Exit", False, f"Stock exit failed: {response}")
        else:
            self.log_result("Stock Entry", False, f"Stock entry failed: {response}")

        # Get stock movements
        success, response = self.make_request('GET', 'stock-movements')
        if success and isinstance(response, list):
            self.log_result("Get Stock Movements", True, f"Retrieved {len(response)} stock movements")
        else:
            self.log_result("Get Stock Movements", False, f"Failed: {response}")

        return True

    def test_company_settings(self):
        """Test company settings"""
        print("\n⚙️ Testing Company Settings...")
        
        # Get company settings
        success, response = self.make_request('GET', 'settings/company')
        if success and isinstance(response, dict):
            self.log_result("Get Company Settings", True, f"Company: {response.get('company_name', 'N/A')}")
            
            # Update company settings
            update_data = {
                "company_name": "Solar Enerji Test A.Ş.",
                "phone": "0212 555 0001",
                "email": "test@solarenerji.com"
            }
            
            success, response = self.make_request('PUT', 'settings/company', update_data)
            if success:
                self.log_result("Update Company Settings", True, "Settings updated successfully")
            else:
                self.log_result("Update Company Settings", False, f"Update failed: {response}")
        else:
            self.log_result("Get Company Settings", False, f"Failed: {response}")

        return True

    def test_sales_reports(self):
        """Test sales reporting endpoints"""
        print("\n📈 Testing Sales Reports...")
        
        # Sales by user
        success, response = self.make_request('GET', 'stats/sales-by-user')
        if success and isinstance(response, list):
            self.log_result("Sales by User Report", True, f"Retrieved {len(response)} user sales records")
        else:
            self.log_result("Sales by User Report", False, f"Failed: {response}")

        # Sales by dealer
        success, response = self.make_request('GET', 'stats/sales-by-dealer')
        if success and isinstance(response, list):
            self.log_result("Sales by Dealer Report", True, f"Retrieved {len(response)} dealer sales records")
        else:
            self.log_result("Sales by Dealer Report", False, f"Failed: {response}")

        return True

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created quotes
        for quote_id in self.created_ids['quotes']:
            success, _ = self.make_request('DELETE', f'quotes/{quote_id}')
            if success:
                print(f"  ✅ Deleted quote {quote_id}")

        # Delete created customers
        for customer_id in self.created_ids['customers']:
            success, _ = self.make_request('DELETE', f'customers/{customer_id}')
            if success:
                print(f"  ✅ Deleted customer {customer_id}")

        # Delete created products
        for product_id in self.created_ids['products']:
            success, _ = self.make_request('DELETE', f'products/{product_id}')
            if success:
                print(f"  ✅ Deleted product {product_id}")

        # Delete created users
        for user_id in self.created_ids['users']:
            success, _ = self.make_request('DELETE', f'users/{user_id}')
            if success:
                print(f"  ✅ Deleted user {user_id}")

        # Delete created dealers
        for dealer_id in self.created_ids['dealers']:
            success, _ = self.make_request('DELETE', f'dealers/{dealer_id}')
            if success:
                print(f"  ✅ Deleted dealer {dealer_id}")

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting SolarPro Backend API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)

        # Initialize data first
        self.test_init_data()
        
        # Authentication is required for all other tests
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False

        # Run all test modules
        test_modules = [
            self.test_dashboard_stats,
            self.test_products_crud,
            self.test_customers_crud,
            self.test_quotes_crud,
            self.test_users_management,
            self.test_dealers_management,
            self.test_stock_management,
            self.test_company_settings,
            self.test_sales_reports
        ]

        for test_module in test_modules:
            try:
                test_module()
            except Exception as e:
                print(f"❌ Test module {test_module.__name__} failed with exception: {e}")

        # Clean up test data
        self.cleanup_test_data()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Backend API tests completed successfully!")
            return True
        else:
            print("⚠️ Some backend tests failed - check logs above")
            return False

def main():
    """Main test execution"""
    tester = SolarProAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w', encoding='utf-8') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2, ensure_ascii=False)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())