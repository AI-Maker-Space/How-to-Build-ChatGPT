#!/usr/bin/env python
"""
Test script for the OpenAI Responses API backend
"""

import requests
import json
import os
from typing import Optional

# Configuration
BASE_URL = "http://localhost:8000"
API_KEY = os.getenv("OPENAI_API_KEY", "")  # Set your API key here or as env variable


def test_health():
    """Test the health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()
    return response.status_code == 200


def test_chat(message: str, use_research: bool = False):
    """Test the chat endpoint"""
    print(f"Testing chat endpoint (research={'enabled' if use_research else 'disabled'})...")
    
    data = {
        "user_message": message,
        "model": "gpt-5",
        "api_key": API_KEY,
        "use_research": use_research,
        "reasoning_effort": "medium"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/chat",
        json=data,
        stream=True
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Response: ", end="")
        for chunk in response.iter_content(chunk_size=1, decode_unicode=True):
            if chunk:
                print(chunk, end="", flush=True)
        print("\n")
    else:
        print(f"Error: {response.text}")
    print()
    return response.status_code == 200


def test_file_upload(file_path: str):
    """Test file upload endpoint"""
    print(f"Testing file upload with {file_path}...")
    
    if not os.path.exists(file_path):
        # Create a test file
        with open(file_path, "w") as f:
            f.write("This is a test file for the OpenAI Responses API.\n")
            f.write("It contains sample content to test file upload functionality.\n")
    
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f, "text/plain")}
        data = {"api_key": API_KEY}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            data=data
        )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        return result.get("file_id")
    else:
        print(f"Error: {response.text}")
    print()
    return None


def test_chat_with_file(message: str, file_id: str):
    """Test chat with uploaded file"""
    print(f"Testing chat with file attachment...")
    
    data = {
        "user_message": message,
        "model": "gpt-5",
        "api_key": API_KEY,
        "file_ids": [file_id],
        "use_research": False,
        "reasoning_effort": "medium"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/chat",
        json=data,
        stream=True
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Response: ", end="")
        for chunk in response.iter_content(chunk_size=1, decode_unicode=True):
            if chunk:
                print(chunk, end="", flush=True)
        print("\n")
    else:
        print(f"Error: {response.text}")
    print()
    return response.status_code == 200


def test_research(query: str, depth: str = "medium"):
    """Test the research endpoint"""
    print(f"Testing research endpoint (depth={depth})...")
    
    data = {
        "query": query,
        "api_key": API_KEY,
        "depth": depth
    }
    
    response = requests.post(f"{BASE_URL}/api/research", json=data)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Error: {response.text}")
    print()
    return response.status_code == 200


def test_list_files():
    """Test listing uploaded files"""
    print("Testing list files endpoint...")
    
    response = requests.get(f"{BASE_URL}/api/files")
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Error: {response.text}")
    print()
    return response.status_code == 200


def main():
    """Run all tests"""
    print("=" * 60)
    print("OpenAI Responses API Test Suite")
    print("=" * 60)
    print()
    
    if not API_KEY:
        print("WARNING: No API key set. Please set OPENAI_API_KEY environment variable.")
        print("Tests will likely fail without a valid API key.")
        print()
        api_key_input = input("Enter your OpenAI API key (or press Enter to skip): ").strip()
        if api_key_input:
            global API_KEY
            API_KEY = api_key_input
    
    # Test 1: Health check
    if not test_health():
        print("Health check failed. Is the server running?")
        return
    
    # Test 2: Basic chat
    test_chat("What is artificial intelligence?")
    
    # Test 3: Chat with research
    test_chat("What are the latest developments in AI?", use_research=True)
    
    # Test 4: File upload
    file_id = test_file_upload("test_document.txt")
    
    # Test 5: Chat with file
    if file_id:
        test_chat_with_file("Summarize the content of the uploaded file", file_id)
    
    # Test 6: Research endpoint
    test_research("OpenAI GPT-5 capabilities", depth="light")
    
    # Test 7: List files
    test_list_files()
    
    print("=" * 60)
    print("Test suite completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
