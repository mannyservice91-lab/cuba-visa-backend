#!/usr/bin/env python3
"""
Backend API Testing for Manny Visa Serbia
Tests all endpoints for visa application management for Cubans traveling to Serbia
"""

import requests
import json
import base64
from datetime import datetime
import uuid

# Get backend URL from environment
BACKEND_URL = "https://service-marketplace-100.preview.emergentagent.com/api"

# Test data - realistic Cuban user data
TEST_USER_DATA = {
    "email": "maria.gonzalez@gmail.com",
    "password": "CubaLibre2024!",
    "full_name": "María González Pérez",
    "phone": "+53 52341678",
    "passport_number": "CUB987654"
}

# Admin credentials
ADMIN_AUTH = ("admin", "Jmg910217*")

class VisaAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.user_id = None
        self.application_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details, response_code=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "response_code": response_code,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        if response_code:
            print(f"    Response Code: {response_code}")
        print()

    def test_root_endpoint(self):
        """Test GET /api/ - Root endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "Bienvenido" in data["message"]:
                    self.log_test("Root Endpoint", True, 
                                f"Welcome message received: {data['message']}", 
                                response.status_code)
                else:
                    self.log_test("Root Endpoint", False, 
                                f"Unexpected response format: {data}", 
                                response.status_code)
            else:
                self.log_test("Root Endpoint", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Connection error: {str(e)}")

    def test_visa_types(self):
        """Test GET /api/visa-types - Should return visa types with prices"""
        try:
            response = self.session.get(f"{BACKEND_URL}/visa-types")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for required visa types
                if "turismo" in data and "trabajo" in data:
                    turismo = data["turismo"]
                    trabajo = data["trabajo"]
                    
                    # Verify prices
                    if turismo.get("price") == 1500 and trabajo.get("price") == 2500:
                        self.log_test("Visa Types", True, 
                                    f"Correct visa types and prices - Turismo: {turismo['price']} EUR, Trabajo: {trabajo['price']} EUR", 
                                    response.status_code)
                    else:
                        self.log_test("Visa Types", False, 
                                    f"Incorrect prices - Turismo: {turismo.get('price')}, Trabajo: {trabajo.get('price')}", 
                                    response.status_code)
                else:
                    self.log_test("Visa Types", False, 
                                f"Missing required visa types. Got: {list(data.keys())}", 
                                response.status_code)
            else:
                self.log_test("Visa Types", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Visa Types", False, f"Connection error: {str(e)}")

    def test_user_registration(self):
        """Test POST /api/auth/register - Register a new user"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/auth/register",
                json=TEST_USER_DATA
            )
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data and "id" in data["user"]:
                    self.user_id = data["user"]["id"]
                    self.log_test("User Registration", True, 
                                f"User registered successfully. ID: {self.user_id}", 
                                response.status_code)
                else:
                    self.log_test("User Registration", False, 
                                f"Unexpected response format: {data}", 
                                response.status_code)
            else:
                self.log_test("User Registration", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("User Registration", False, f"Connection error: {str(e)}")

    def test_user_login(self):
        """Test POST /api/auth/login - Login with email and password"""
        try:
            login_data = {
                "email": TEST_USER_DATA["email"],
                "password": TEST_USER_DATA["password"]
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if "user" in data and data["user"]["email"] == TEST_USER_DATA["email"]:
                    if not self.user_id:  # If registration failed, get user_id from login
                        self.user_id = data["user"]["id"]
                    self.log_test("User Login", True, 
                                f"Login successful for {data['user']['full_name']}", 
                                response.status_code)
                else:
                    self.log_test("User Login", False, 
                                f"Unexpected response format: {data}", 
                                response.status_code)
            else:
                self.log_test("User Login", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("User Login", False, f"Connection error: {str(e)}")

    def test_create_visa_application(self):
        """Test POST /api/applications?user_id={user_id} - Create new application"""
        if not self.user_id:
            self.log_test("Create Visa Application", False, "No user_id available (registration/login failed)")
            return
            
        try:
            application_data = {
                "visa_type": "turismo",
                "notes": "Viaje de turismo a Serbia por 2 semanas"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/applications?user_id={self.user_id}",
                json=application_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if "application" in data and "id" in data["application"]:
                    self.application_id = data["application"]["id"]
                    app = data["application"]
                    self.log_test("Create Visa Application", True, 
                                f"Application created successfully. ID: {self.application_id}, Type: {app['visa_type']}, Price: {app['price']} EUR", 
                                response.status_code)
                else:
                    self.log_test("Create Visa Application", False, 
                                f"Unexpected response format: {data}", 
                                response.status_code)
            else:
                self.log_test("Create Visa Application", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Create Visa Application", False, f"Connection error: {str(e)}")

    def test_get_user_applications(self):
        """Test GET /api/applications/user/{user_id} - Get user's applications"""
        if not self.user_id:
            self.log_test("Get User Applications", False, "No user_id available")
            return
            
        try:
            response = self.session.get(f"{BACKEND_URL}/applications/user/{self.user_id}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get User Applications", True, 
                                f"Retrieved {len(data)} applications for user", 
                                response.status_code)
                else:
                    self.log_test("Get User Applications", False, 
                                f"Expected list, got: {type(data)}", 
                                response.status_code)
            else:
                self.log_test("Get User Applications", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Get User Applications", False, f"Connection error: {str(e)}")

    def test_get_specific_application(self):
        """Test GET /api/applications/{application_id} - Get specific application"""
        if not self.application_id:
            self.log_test("Get Specific Application", False, "No application_id available")
            return
            
        try:
            response = self.session.get(f"{BACKEND_URL}/applications/{self.application_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and data["id"] == self.application_id:
                    self.log_test("Get Specific Application", True, 
                                f"Retrieved application {self.application_id}, Status: {data.get('status', 'N/A')}", 
                                response.status_code)
                else:
                    self.log_test("Get Specific Application", False, 
                                f"Unexpected response format: {data}", 
                                response.status_code)
            else:
                self.log_test("Get Specific Application", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Get Specific Application", False, f"Connection error: {str(e)}")

    def test_admin_get_all_applications(self):
        """Test GET /api/admin/applications - Get all applications (admin)"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/admin/applications",
                auth=ADMIN_AUTH
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Admin Get All Applications", True, 
                                f"Retrieved {len(data)} total applications", 
                                response.status_code)
                else:
                    self.log_test("Admin Get All Applications", False, 
                                f"Expected list, got: {type(data)}", 
                                response.status_code)
            else:
                self.log_test("Admin Get All Applications", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Admin Get All Applications", False, f"Connection error: {str(e)}")

    def test_admin_stats(self):
        """Test GET /api/admin/stats - Get statistics (admin)"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/admin/stats",
                auth=ADMIN_AUTH
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_applications", "pending", "in_review", "approved", "rejected", "completed"]
                if all(field in data for field in required_fields):
                    self.log_test("Admin Stats", True, 
                                f"Stats retrieved - Total: {data['total_applications']}, Pending: {data['pending']}", 
                                response.status_code)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Admin Stats", False, 
                                f"Missing required fields: {missing}", 
                                response.status_code)
            else:
                self.log_test("Admin Stats", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Admin Stats", False, f"Connection error: {str(e)}")

    def test_admin_update_application(self):
        """Test PUT /api/admin/applications/{id} - Update application (admin)"""
        if not self.application_id:
            self.log_test("Admin Update Application", False, "No application_id available")
            return
            
        try:
            update_data = {
                "status": "revision",
                "admin_notes": "Documentos en revisión",
                "deposit_paid": 750
            }
            
            response = self.session.put(
                f"{BACKEND_URL}/admin/applications/{self.application_id}",
                json=update_data,
                auth=ADMIN_AUTH
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "revision" and data.get("deposit_paid") == 750:
                    self.log_test("Admin Update Application", True, 
                                f"Application updated - Status: {data['status']}, Deposit: {data['deposit_paid']} EUR", 
                                response.status_code)
                else:
                    self.log_test("Admin Update Application", False, 
                                f"Update not reflected in response: {data}", 
                                response.status_code)
            else:
                self.log_test("Admin Update Application", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Admin Update Application", False, f"Connection error: {str(e)}")

    def test_admin_get_users(self):
        """Test GET /api/admin/users - Get all users (admin)"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/admin/users",
                auth=ADMIN_AUTH
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Admin Get Users", True, 
                                f"Retrieved {len(data)} users", 
                                response.status_code)
                else:
                    self.log_test("Admin Get Users", False, 
                                f"Expected list, got: {type(data)}", 
                                response.status_code)
            else:
                self.log_test("Admin Get Users", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Admin Get Users", False, f"Connection error: {str(e)}")

    def test_admin_delete_application(self):
        """Test DELETE /api/admin/applications/{id} - Delete application (admin)"""
        if not self.application_id:
            self.log_test("Admin Delete Application", False, "No application_id available")
            return
            
        try:
            response = self.session.delete(
                f"{BACKEND_URL}/admin/applications/{self.application_id}",
                auth=ADMIN_AUTH
            )
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "eliminada" in data["message"]:
                    self.log_test("Admin Delete Application", True, 
                                f"Application deleted successfully: {data['message']}", 
                                response.status_code)
                else:
                    self.log_test("Admin Delete Application", False, 
                                f"Unexpected response: {data}", 
                                response.status_code)
            else:
                self.log_test("Admin Delete Application", False, 
                            f"HTTP {response.status_code}: {response.text}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Admin Delete Application", False, f"Connection error: {str(e)}")

    def test_admin_auth_protection(self):
        """Test that admin endpoints are properly protected"""
        try:
            # Test without auth
            response = self.session.get(f"{BACKEND_URL}/admin/applications")
            
            if response.status_code == 401:
                self.log_test("Admin Auth Protection", True, 
                            "Admin endpoints properly protected (401 without auth)", 
                            response.status_code)
            else:
                self.log_test("Admin Auth Protection", False, 
                            f"Expected 401, got {response.status_code}", 
                            response.status_code)
                
        except Exception as e:
            self.log_test("Admin Auth Protection", False, f"Connection error: {str(e)}")

    def run_all_tests(self):
        """Run all API tests"""
        print("=" * 60)
        print("MANNY VISA SERBIA API TESTING")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test User: {TEST_USER_DATA['full_name']} ({TEST_USER_DATA['email']})")
        print("=" * 60)
        print()

        # Basic endpoints
        self.test_root_endpoint()
        self.test_visa_types()
        
        # User authentication
        self.test_user_registration()
        self.test_user_login()
        
        # Visa applications
        self.test_create_visa_application()
        self.test_get_user_applications()
        self.test_get_specific_application()
        
        # Admin endpoints
        self.test_admin_auth_protection()
        self.test_admin_get_all_applications()
        self.test_admin_stats()
        self.test_admin_update_application()
        self.test_admin_get_users()
        
        # Cleanup (delete test application)
        self.test_admin_delete_application()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"❌ {result['test']}: {result['details']}")
        
        return self.test_results

if __name__ == "__main__":
    tester = VisaAPITester()
    results = tester.run_all_tests()