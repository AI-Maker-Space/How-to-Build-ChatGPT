#!/usr/bin/env python
"""
Quick debug test for the API
"""

import requests
import json
import os

# Configuration
BASE_URL = "http://localhost:8000"
API_KEY = input("Enter your OpenAI API key: ").strip()

def test_health():
    """Test the health endpoint"""
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {json.dumps(response.json(), indent=2)}")
            return True
    except Exception as e:
        print(f"   Error: {e}")
    return False

def test_simple_chat():
    """Test basic chat without any extras"""
    print("\n2. Testing simple chat...")
    try:
        data = {
            "user_message": "Say hello in 5 words or less",
            "model": "gpt-5",
            "api_key": API_KEY,
            "use_research": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json=data,
            stream=True,
            timeout=30
        )
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   Response: ", end="")
            for chunk in response.iter_content(chunk_size=1, decode_unicode=True):
                if chunk:
                    print(chunk, end="", flush=True)
            print()
            return True
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Error: {e}")
    return False

def test_chat_with_research():
    """Test chat with research enabled"""
    print("\n3. Testing chat with research...")
    try:
        data = {
            "user_message": "What is FastAPI?",
            "model": "gpt-5",
            "api_key": API_KEY,
            "use_research": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat",
            json=data,
            stream=True,
            timeout=30
        )
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   Response: ", end="")
            content = ""
            for chunk in response.iter_content(chunk_size=1, decode_unicode=True):
                if chunk:
                    content += chunk
                    print(chunk, end="", flush=True)
            print()
            return True
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Error: {e}")
    return False

def main():
    print("=" * 60)
    print("API Debug Test")
    print("=" * 60)
    
    if not API_KEY:
        print("No API key provided. Exiting.")
        return
    
    # Run tests
    results = {
        "Health Check": test_health(),
        "Simple Chat": test_simple_chat(),
        "Chat with Research": test_chat_with_research()
    }
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary:")
    print("=" * 60)
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    if all_passed:
        print("\n✅ All tests passed! The API is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the errors above.")
        print("\nCommon issues:")
        print("1. Make sure the API server is running (python api/app.py)")
        print("2. Check your OpenAI API key is valid")
        print("3. Ensure you have API access to the models being used")

if __name__ == "__main__":
    main()
