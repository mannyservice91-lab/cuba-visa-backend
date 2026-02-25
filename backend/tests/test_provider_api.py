"""
Test Suite for Service Provider (Remesas) Feature
Tests provider registration, login, offers CRUD, admin management, and public service offers
"""
import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://visa-portal-v2.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "josemgt91@gmail.com"
ADMIN_PASSWORD = "Jmg910217*"
TEST_PROVIDER_EMAIL = "remesero@test.com"
TEST_PROVIDER_PASSWORD = "test123456"

class TestHealthAndSetup:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"API Health: {data['status']}, DB: {data['database']['status']}")


class TestPublicServiceOffers:
    """Test public service offers endpoint"""
    
    def test_get_public_service_offers(self):
        """GET /api/service-offers - should return active offers from active providers"""
        response = requests.get(f"{BASE_URL}/api/service-offers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Public service offers count: {len(data)}")
        
        # If offers exist, validate structure
        if len(data) > 0:
            offer = data[0]
            assert "id" in offer
            assert "title" in offer
            assert "description" in offer
            assert "provider" in offer
            assert "business_name" in offer["provider"]
            assert "whatsapp_number" in offer["provider"]
            print(f"First offer: {offer['title']} by {offer['provider']['business_name']}")


class TestProviderRegistration:
    """Test provider registration endpoint"""
    
    def test_provider_registration_success(self):
        """POST /api/provider/register - register new provider"""
        unique_email = f"test_provider_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "email": unique_email,
            "password": "testpass123",
            "business_name": f"TEST_Business_{uuid.uuid4().hex[:6]}",
            "owner_name": "Test Owner",
            "phone": "+5355555555",
            "whatsapp_number": "+5355555555",
            "whatsapp_group_link": "",
            "service_type": "remesas",
            "description": "Test provider for automated testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/register",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "provider_id" in data
        assert "message" in data
        print(f"Provider registered: {data['provider_id']}")
        
        # Store for cleanup
        self.__class__.test_provider_id = data["provider_id"]
        self.__class__.test_provider_email = unique_email
    
    def test_provider_registration_duplicate_email(self):
        """POST /api/provider/register - should fail for duplicate email"""
        # Use existing test provider email
        payload = {
            "email": TEST_PROVIDER_EMAIL,
            "password": "testpass123",
            "business_name": "Duplicate Business",
            "owner_name": "Test Owner",
            "phone": "+5355555555",
            "whatsapp_number": "+5355555555",
            "service_type": "remesas"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/register",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Should fail with 400 for duplicate
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"Duplicate email error: {data['detail']}")


class TestProviderLogin:
    """Test provider login endpoint"""
    
    def test_provider_login_success(self):
        """POST /api/provider/login - login with valid credentials"""
        payload = {
            "email": TEST_PROVIDER_EMAIL,
            "password": TEST_PROVIDER_PASSWORD
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/login",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "provider_id" in data
        assert "business_name" in data
        assert data["email"] == TEST_PROVIDER_EMAIL
        print(f"Provider logged in: {data['business_name']}")
        
        # Store token for other tests
        self.__class__.provider_token = data["access_token"]
        self.__class__.provider_id = data["provider_id"]
    
    def test_provider_login_invalid_credentials(self):
        """POST /api/provider/login - should fail with wrong password"""
        payload = {
            "email": TEST_PROVIDER_EMAIL,
            "password": "wrongpassword"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/login",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"Invalid login error: {data['detail']}")
    
    def test_provider_login_nonexistent_email(self):
        """POST /api/provider/login - should fail for non-existent email"""
        payload = {
            "email": "nonexistent@test.com",
            "password": "anypassword"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/login",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 401
        print("Non-existent email login correctly rejected")


class TestProviderOffersCRUD:
    """Test provider offers CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_resp = requests.post(
            f"{BASE_URL}/api/provider/login",
            json={"email": TEST_PROVIDER_EMAIL, "password": TEST_PROVIDER_PASSWORD}
        )
        if login_resp.status_code == 200:
            self.token = login_resp.json()["access_token"]
        else:
            pytest.skip("Could not login provider")
    
    def test_get_provider_offers(self):
        """GET /api/provider/offers - get provider's offers"""
        response = requests.get(
            f"{BASE_URL}/api/provider/offers",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Provider offers count: {len(data)}")
    
    def test_create_provider_offer(self):
        """POST /api/provider/offers - create new offer"""
        payload = {
            "title": f"TEST_Offer_{uuid.uuid4().hex[:6]}",
            "description": "Test offer for automated testing",
            "exchange_rate": "1 USD = 350 CUP",
            "expires_at": "2026-12-31T23:59:59"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/offers",
            json=payload,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200, f"Create offer failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["title"] == payload["title"]
        assert data["exchange_rate"] == payload["exchange_rate"]
        print(f"Offer created: {data['id']}")
        
        # Store for update/delete tests
        self.__class__.test_offer_id = data["id"]
    
    def test_update_provider_offer(self):
        """PUT /api/provider/offers/{id} - update offer"""
        # First create an offer
        create_payload = {
            "title": f"TEST_Update_{uuid.uuid4().hex[:6]}",
            "description": "To be updated",
            "exchange_rate": "1 USD = 340 CUP"
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/provider/offers",
            json=create_payload,
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create offer for update test")
        
        offer_id = create_resp.json()["id"]
        
        # Now update it
        update_payload = {
            "title": "TEST_Updated_Title",
            "description": "Updated description",
            "exchange_rate": "1 USD = 360 CUP",
            "is_active": False
        }
        
        response = requests.put(
            f"{BASE_URL}/api/provider/offers/{offer_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["title"] == update_payload["title"]
        assert data["exchange_rate"] == update_payload["exchange_rate"]
        print(f"Offer updated: {offer_id}")
        
        # Cleanup - delete the test offer
        requests.delete(
            f"{BASE_URL}/api/provider/offers/{offer_id}",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    def test_delete_provider_offer(self):
        """DELETE /api/provider/offers/{id} - delete offer"""
        # First create an offer to delete
        create_payload = {
            "title": f"TEST_Delete_{uuid.uuid4().hex[:6]}",
            "description": "To be deleted",
            "exchange_rate": "1 USD = 330 CUP"
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/provider/offers",
            json=create_payload,
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create offer for delete test")
        
        offer_id = create_resp.json()["id"]
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/provider/offers/{offer_id}",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        print(f"Offer deleted: {offer_id}")
        
        # Verify deletion by trying to get offers again
        get_resp = requests.get(
            f"{BASE_URL}/api/provider/offers",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        offers = get_resp.json()
        assert not any(o["id"] == offer_id for o in offers), "Offer was not deleted"


class TestAdminProviderManagement:
    """Test admin endpoints for managing service providers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login admin before tests"""
        # Admin login via token endpoint
        login_resp = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_resp.status_code == 200:
            self.admin_token = login_resp.json()["access_token"]
        else:
            pytest.skip("Could not login admin")
    
    def test_get_all_providers(self):
        """GET /api/admin/service-providers - list all providers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/service-providers",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total providers: {len(data)}")
        
        # Validate structure if providers exist
        if len(data) > 0:
            provider = data[0]
            assert "id" in provider
            assert "email" in provider
            assert "business_name" in provider
            assert "is_active" in provider
            print(f"First provider: {provider['business_name']} (active: {provider['is_active']})")
    
    def test_toggle_provider_status(self):
        """PUT /api/admin/service-providers/{id}/toggle - toggle active status"""
        # First get providers to find one to toggle
        get_resp = requests.get(
            f"{BASE_URL}/api/admin/service-providers",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if get_resp.status_code != 200:
            pytest.skip("Could not get providers")
        
        providers = get_resp.json()
        if len(providers) == 0:
            pytest.skip("No providers to toggle")
        
        provider = providers[0]
        provider_id = provider["id"]
        original_status = provider["is_active"]
        
        # Toggle
        response = requests.put(
            f"{BASE_URL}/api/admin/service-providers/{provider_id}/toggle",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "is_active" in data
        assert data["is_active"] != original_status
        print(f"Provider {provider_id} toggled from {original_status} to {data['is_active']}")
        
        # Toggle back to restore original state
        requests.put(
            f"{BASE_URL}/api/admin/service-providers/{provider_id}/toggle",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
    
    def test_admin_without_auth(self):
        """Test that admin endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/service-providers")
        assert response.status_code == 401
        print("Admin endpoint correctly requires authentication")


class TestProviderMeEndpoint:
    """Test provider profile endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login provider before tests"""
        login_resp = requests.post(
            f"{BASE_URL}/api/provider/login",
            json={"email": TEST_PROVIDER_EMAIL, "password": TEST_PROVIDER_PASSWORD}
        )
        if login_resp.status_code == 200:
            self.token = login_resp.json()["access_token"]
        else:
            pytest.skip("Could not login provider")
    
    def test_get_provider_profile(self):
        """GET /api/provider/me - get current provider profile"""
        response = requests.get(
            f"{BASE_URL}/api/provider/me",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_PROVIDER_EMAIL
        assert "business_name" in data
        assert "owner_name" in data
        assert "whatsapp_number" in data
        print(f"Provider profile: {data['business_name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
