"""
Test Suite for Admin Destinations and Promotions Feature
Tests: 
- Admin login
- GET/POST/PUT/DELETE /api/admin/destinations
- GET/POST/PUT/DELETE /api/admin/promotions
- Provider subscription status
"""
import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://service-marketplace-100.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "josemgt91@gmail.com"
ADMIN_PASSWORD = "Jmg910217*"


class TestAdminLogin:
    """Test admin login endpoint"""
    
    def test_admin_login_success(self):
        """POST /api/admin/login - login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["email"] == ADMIN_EMAIL
        assert "full_name" in data
        print(f"Admin logged in: {data['full_name']}")
        
        # Store token for other tests
        self.__class__.admin_token = data["access_token"]
    
    def test_admin_login_invalid_credentials(self):
        """POST /api/admin/login - should fail with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")


class TestAdminDestinations:
    """Test admin destinations management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login admin before tests"""
        login_resp = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_resp.status_code == 200:
            self.admin_token = login_resp.json()["access_token"]
        else:
            pytest.skip("Could not login admin")
    
    def test_get_destinations(self):
        """GET /api/destinations - get all destinations"""
        response = requests.get(f"{BASE_URL}/api/destinations")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total destinations: {len(data)}")
        
        # Validate structure if destinations exist
        if len(data) > 0:
            dest = data[0]
            assert "id" in dest
            assert "country" in dest
            assert "country_code" in dest
            assert "enabled" in dest
            print(f"First destination: {dest['country']} (enabled: {dest['enabled']})")
    
    def test_create_destination(self):
        """POST /api/admin/destinations - create new destination"""
        unique_code = f"T{uuid.uuid4().hex[:2].upper()}"
        payload = {
            "country": f"TEST_Country_{uuid.uuid4().hex[:6]}",
            "country_code": unique_code,
            "description": "Test destination for automated testing",
            "image_url": "https://example.com/test.jpg",
            "message": "Muy pronto disponible",
            "enabled": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/destinations",
            json=payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Create destination failed: {response.text}"
        data = response.json()
        assert "destination" in data
        dest = data["destination"]
        assert dest["country"] == payload["country"]
        assert dest["country_code"] == unique_code
        assert dest["description"] == payload["description"]
        print(f"Destination created: {dest['id']}")
        
        # Store for update/delete tests
        self.__class__.test_dest_id = dest["id"]
        self.__class__.test_dest_country = dest["country"]
    
    def test_update_destination_with_description(self):
        """PUT /api/admin/destinations/{id} - update destination with description"""
        # First create a destination
        unique_code = f"U{uuid.uuid4().hex[:2].upper()}"
        create_payload = {
            "country": f"TEST_Update_{uuid.uuid4().hex[:6]}",
            "country_code": unique_code,
            "description": "Original description",
            "enabled": False
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/destinations",
            json=create_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create destination for update test")
        
        dest_id = create_resp.json()["destination"]["id"]
        
        # Update with new description
        update_payload = {
            "description": "Updated description with more details",
            "enabled": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/destinations/{dest_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["description"] == update_payload["description"]
        assert data["enabled"] == True
        print(f"Destination updated with new description: {dest_id}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/destinations/{dest_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
    
    def test_toggle_destination_enabled(self):
        """PUT /api/admin/destinations/{id} - toggle enabled status"""
        # First get existing destinations
        get_resp = requests.get(f"{BASE_URL}/api/destinations")
        destinations = get_resp.json()
        
        if len(destinations) == 0:
            pytest.skip("No destinations to toggle")
        
        dest = destinations[0]
        original_enabled = dest["enabled"]
        
        # Toggle enabled status
        response = requests.put(
            f"{BASE_URL}/api/admin/destinations/{dest['id']}",
            json={"enabled": not original_enabled},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] != original_enabled
        print(f"Destination {dest['country']} toggled from {original_enabled} to {data['enabled']}")
        
        # Toggle back to restore
        requests.put(
            f"{BASE_URL}/api/admin/destinations/{dest['id']}",
            json={"enabled": original_enabled},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
    
    def test_delete_destination(self):
        """DELETE /api/admin/destinations/{id} - delete destination"""
        # First create a destination to delete
        unique_code = f"D{uuid.uuid4().hex[:2].upper()}"
        create_payload = {
            "country": f"TEST_Delete_{uuid.uuid4().hex[:6]}",
            "country_code": unique_code,
            "enabled": False
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/destinations",
            json=create_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create destination for delete test")
        
        dest_id = create_resp.json()["destination"]["id"]
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/admin/destinations/{dest_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        print(f"Destination deleted: {dest_id}")
        
        # Verify deletion
        verify_resp = requests.get(f"{BASE_URL}/api/destinations/{dest_id}")
        assert verify_resp.status_code == 404
    
    def test_destinations_require_auth(self):
        """Test that admin destination endpoints require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/destinations",
            json={"country": "Test", "country_code": "TS"}
        )
        assert response.status_code == 401
        print("Admin destination endpoints correctly require authentication")


class TestAdminPromotions:
    """Test admin promotions management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login admin before tests"""
        login_resp = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_resp.status_code == 200:
            self.admin_token = login_resp.json()["access_token"]
        else:
            pytest.skip("Could not login admin")
    
    def test_get_promotions(self):
        """GET /api/admin/promotions - get all admin promotions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promotions",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total promotions: {len(data)}")
        
        # Validate structure if promotions exist
        if len(data) > 0:
            promo = data[0]
            assert "id" in promo
            assert "title" in promo
            assert "description" in promo
            assert "is_active" in promo
            print(f"First promotion: {promo['title']} (active: {promo['is_active']})")
    
    def test_create_promotion(self):
        """POST /api/admin/promotions - create new admin promotion"""
        payload = {
            "title": f"TEST_Promo_{uuid.uuid4().hex[:6]}",
            "description": "Test promotion for automated testing",
            "link_url": "https://example.com/promo",
            "link_text": "Ver más"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promotions",
            json=payload,
            headers={
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200, f"Create promotion failed: {response.text}"
        data = response.json()
        assert "promotion" in data
        promo = data["promotion"]
        assert promo["title"] == payload["title"]
        assert promo["description"] == payload["description"]
        assert promo["is_active"] == True  # Default active
        print(f"Promotion created: {promo['id']}")
        
        # Store for update/delete tests
        self.__class__.test_promo_id = promo["id"]
    
    def test_update_promotion(self):
        """PUT /api/admin/promotions/{id} - update promotion"""
        # First create a promotion
        create_payload = {
            "title": f"TEST_Update_{uuid.uuid4().hex[:6]}",
            "description": "Original description"
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/promotions",
            json=create_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create promotion for update test")
        
        promo_id = create_resp.json()["promotion"]["id"]
        
        # Update it
        update_payload = {
            "title": "TEST_Updated_Title",
            "description": "Updated description",
            "is_active": False
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/promotions/{promo_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["title"] == update_payload["title"]
        assert data["is_active"] == False
        print(f"Promotion updated: {promo_id}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/promotions/{promo_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
    
    def test_delete_promotion(self):
        """DELETE /api/admin/promotions/{id} - delete promotion"""
        # First create a promotion to delete
        create_payload = {
            "title": f"TEST_Delete_{uuid.uuid4().hex[:6]}",
            "description": "To be deleted"
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/promotions",
            json=create_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create promotion for delete test")
        
        promo_id = create_resp.json()["promotion"]["id"]
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/admin/promotions/{promo_id}",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        print(f"Promotion deleted: {promo_id}")
        
        # Verify deletion by trying to get promotions again
        get_resp = requests.get(
            f"{BASE_URL}/api/admin/promotions",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        promos = get_resp.json()
        assert not any(p["id"] == promo_id for p in promos), "Promotion was not deleted"
    
    def test_public_promotions_endpoint(self):
        """GET /api/promotions - public endpoint for active promotions"""
        response = requests.get(f"{BASE_URL}/api/promotions")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned promotions should be active
        for promo in data:
            assert promo["is_active"] == True
        print(f"Public promotions: {len(data)} active")
    
    def test_promotions_require_auth(self):
        """Test that admin promotion endpoints require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/promotions",
            json={"title": "Test", "description": "Test"}
        )
        assert response.status_code == 401
        print("Admin promotion endpoints correctly require authentication")


class TestProviderSubscriptionStatus:
    """Test provider subscription status endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login admin before tests"""
        login_resp = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_resp.status_code == 200:
            self.admin_token = login_resp.json()["access_token"]
        else:
            pytest.skip("Could not login admin")
    
    def test_get_providers_with_subscription_status(self):
        """GET /api/admin/service-providers - verify subscription status fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/service-providers",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        providers = response.json()
        
        if len(providers) > 0:
            provider = providers[0]
            # Check subscription fields exist
            assert "subscription_plan" in provider
            assert "subscription_status" in provider
            assert "is_active" in provider
            
            # Status should be one of: trial, trial_pending, active, expired, awaiting_payment, pending
            valid_statuses = ["trial", "trial_pending", "active", "expired", "awaiting_payment", "pending", None, ""]
            assert provider["subscription_status"] in valid_statuses or provider["subscription_status"] is None
            print(f"Provider {provider['business_name']}: status={provider['subscription_status']}, active={provider['is_active']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
