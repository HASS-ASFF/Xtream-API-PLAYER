#!/usr/bin/env python3
"""
IPTV Player Backend API Testing Script
Tests all backend endpoints using the public URL
"""

import requests
import sys
import json
from datetime import datetime

class IPTVAPITester:
    def __init__(self, base_url="https://8304c974-cc53-4f50-a52f-1af0be26d73e.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.timeout = 30

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED")
        
        if details:
            print(f"   Details: {details}")
        print()

    def test_endpoint(self, name, endpoint, expected_status=200, params=None):
        """Test a single API endpoint"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            print(f"🔍 Testing {name}...")
            print(f"   URL: {url}")
            
            response = self.session.get(url, params=params)
            
            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            
            if success:
                try:
                    data = response.json()
                    print(f"   Response: {json.dumps(data, indent=2)[:500]}...")
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, data
                except json.JSONDecodeError:
                    print(f"   Response (text): {response.text[:200]}...")
                    self.log_test(name, True, f"Status: {response.status_code}, Non-JSON response")
                    return True, response.text
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg += f" - {error_data}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_msg)
                return False, {}
                
        except requests.exceptions.RequestException as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Unexpected error: {str(e)}")
            return False, {}

    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 60)
        print("🚀 IPTV Player Backend API Testing")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        # Test 1: Health Check
        health_success, health_data = self.test_endpoint(
            "Health Check", 
            "/api/health"
        )

        # Test 2: Xtream API Connection Test
        xtream_success, xtream_data = self.test_endpoint(
            "Xtream API Connection Test", 
            "/api/xtream/test"
        )

        # Test 3: Live Categories
        live_cat_success, live_cat_data = self.test_endpoint(
            "Live Categories", 
            "/api/categories/live"
        )

        # Test 4: VOD Categories
        vod_cat_success, vod_cat_data = self.test_endpoint(
            "VOD Categories", 
            "/api/categories/vod"
        )

        # Test 5: Series Categories
        series_cat_success, series_cat_data = self.test_endpoint(
            "Series Categories", 
            "/api/categories/series"
        )

        # Test 6: Live Streams
        live_streams_success, live_streams_data = self.test_endpoint(
            "Live Streams", 
            "/api/streams/live"
        )

        # Test 7: VOD Streams
        vod_streams_success, vod_streams_data = self.test_endpoint(
            "VOD Streams", 
            "/api/streams/vod"
        )

        # Test 8: Series Streams
        series_streams_success, series_streams_data = self.test_endpoint(
            "Series Streams", 
            "/api/streams/series"
        )

        # Test 9: Playlist Info
        playlist_success, playlist_data = self.test_endpoint(
            "Playlist Info", 
            "/api/playlist-info"
        )

        # Test 10: Search Functionality
        search_success, search_data = self.test_endpoint(
            "Search Functionality", 
            "/api/search",
            params={"q": "test"}
        )

        # Test 11: Search with type parameter
        search_live_success, search_live_data = self.test_endpoint(
            "Search Live Content", 
            "/api/search",
            params={"q": "news", "type": "live"}
        )

        # Print summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        print()

        # Analysis
        print("🔍 ANALYSIS:")
        
        if health_success and health_data:
            iptv_configured = health_data.get('iptv_configured', False)
            print(f"   - IPTV Configuration Status: {'✅ Configured' if iptv_configured else '❌ Not Configured'}")
        
        if xtream_success and xtream_data:
            xtream_status = xtream_data.get('status', 'unknown')
            print(f"   - Xtream API Status: {xtream_status}")
            if xtream_status == 'error':
                print(f"   - Xtream Error: {xtream_data.get('message', 'Unknown error')}")
        
        if playlist_success and playlist_data:
            playlist_status = playlist_data.get('status', 'unknown')
            print(f"   - Playlist Status: {playlist_status}")
            print(f"   - Server: {playlist_data.get('server', 'N/A')}")
        
        # Check data availability
        categories_available = any([live_cat_success, vod_cat_success, series_cat_success])
        streams_available = any([live_streams_success, vod_streams_success, series_streams_success])
        
        print(f"   - Categories Available: {'✅ Yes' if categories_available else '❌ No'}")
        print(f"   - Streams Available: {'✅ Yes' if streams_available else '❌ No'}")
        print(f"   - Search Working: {'✅ Yes' if search_success else '❌ No'}")
        
        print()
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = IPTVAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1
    finally:
        tester.session.close()

if __name__ == "__main__":
    sys.exit(main())