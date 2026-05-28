#!/usr/bin/env python3
"""List available Google Gemini models"""

import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Configure API
api_key = os.getenv('GOOGLE_GEMINI_API_KEY')
if not api_key:
    print("ERROR: GOOGLE_GEMINI_API_KEY not found in .env file")
    exit(1)

genai.configure(api_key=api_key)

# List all available models
print("Available Gemini Models:")
print("=" * 80)

for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"📦 {model.name}")

print("=" * 80)
print("\nℹ️  Use the 'Model' name (like 'models/gemini-pro') in your config")
