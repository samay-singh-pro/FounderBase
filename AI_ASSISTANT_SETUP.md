# AI Writing Assistant Setup Guide

## Overview
The AI Writing Assistant is now integrated into the post creation page! It helps users:
- ✨ Refine their ideas with structured feedback
- 💡 Generate catchy title suggestions
- 📝 Improve descriptions with AI-powered enhancements
- 💬 Chat interactively about their post

## Features
- **Context-Aware**: The AI knows about your current draft (title, description, category, type)
- **Scoped & Safe**: Strictly limited to post creation topics - rejects off-topic or inappropriate questions
- **Rate Limited**: 20 requests per 5 minutes to prevent abuse
- **Responsive Design**: Shows on desktop (hidden on mobile to save screen space)
- **Cost Effective**: Uses `gemini-1.5-flash` - Google's cheapest and fastest model

## Setup Instructions

### 1. Get Your Google Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy your API key

**Important**: This is FREE for moderate usage! Google provides generous free tier limits.

### 2. Configure Backend

1. Navigate to the backend directory:
   ```bash
   cd /Users/samay.singh/Desktop/FoundrBase/backend
   ```

2. Create a `.env` file (if it doesn't exist):
   ```bash
   touch .env
   ```

3. Add your API key to `.env`:
   ```env
   # Google Gemini AI
   GOOGLE_GEMINI_API_KEY=your-actual-api-key-here
   GEMINI_MODEL=gemini-1.5-flash
   ```

4. Restart the backend server:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```

### 3. Test the AI Assistant

1. Open the app in your browser
2. Navigate to "Create Post" (click the Create button)
3. You should see the **AI Writing Assistant** panel on the right side (desktop only)
4. Try the quick action buttons:
   - 📝 Write some description first
   - Click "✨ Refine Idea" for feedback
   - Click "💡 Suggest Titles" for title options
   - Click "📝 Improve Description" for enhancements
5. Or just chat with the AI about your post!

## How It Works

### Backend (Python + FastAPI)
- **Service**: `/backend/app/features/ai/service.py` - Google Gemini integration with content guards
- **Router**: `/backend/app/features/ai/router.py` - API endpoints with rate limiting
- **Endpoints**:
  - `POST /api/v1/ai/chat` - General conversation
  - `POST /api/v1/ai/suggest-titles` - Title suggestions
  - `POST /api/v1/ai/improve-description` - Description improvements
  - `POST /api/v1/ai/refine-idea` - Comprehensive feedback

### Frontend (React + TypeScript)
- **Service**: `/frontend/src/services/ai.service.ts` - API client
- **Component**: `/frontend/src/components/AIWritingAssistant.tsx` - Chat UI
- **Integration**: Embedded in `CreateOpportunityPage.tsx` as a sticky sidebar

## Security Features

### Content Moderation
The AI service includes strict content filtering:
- ❌ Blocks inappropriate keywords (harassment, illegal content, etc.)
- ❌ Rejects off-topic questions (non-post-related queries)
- ✅ Only discusses post creation, writing, and idea refinement
- ✅ Validates message length (3-2000 characters)

### Rate Limiting
- **20 requests per 5 minutes** per user
- Prevents API abuse and excessive costs
- Returns 429 error when limit exceeded

### Context Restrictions
The AI system prompt enforces strict boundaries:
```
ONLY discuss post creation, writing, and idea refinement
REJECT any off-topic, personal, or inappropriate questions
DO NOT provide general knowledge unrelated to their post
```

## Cost Information

**Google Gemini 1.5 Flash Pricing** (as of April 2026):
- **Free Tier**: 15 requests per minute, 1 million tokens per day
- **Paid Tier**: $0.075 per 1M input tokens, $0.30 per 1M output tokens

With typical usage (200-300 tokens per request):
- **Free tier covers**: ~3,000-5,000 requests per day
- **Cost if exceeded**: Less than $0.10 per 1,000 requests

This is extremely affordable for a small-medium platform!

## Troubleshooting

### AI Assistant Not Showing
- **Problem**: Right sidebar is empty
- **Solution**: 
  1. Check that you're on desktop (hidden on mobile: `< 1024px width`)
  2. Verify API key is set in `.env`
  3. Check backend console for errors

### "AI service is not configured" Error
- **Problem**: API key not loaded
- **Solution**:
  1. Verify `GOOGLE_GEMINI_API_KEY` is in `/backend/.env`
  2. Restart backend server
  3. Check for typos in `.env` file

### "Rate limit exceeded" Error
- **Problem**: Too many requests (> 20 in 5 minutes)
- **Solution**: Wait a few minutes before trying again

### AI Gives Generic/Unhelpful Responses
- **Problem**: Not enough context
- **Solution**: 
  1. Fill in description field first
  2. Provide more details about your idea
  3. Ask specific questions

## Example Interactions

### Good Questions (AI Will Help)
- ✅ "Can you help me refine my idea?"
- ✅ "What's missing from my description?"
- ✅ "Suggest some catchy titles for this problem"
- ✅ "How can I make this more compelling?"
- ✅ "Is this description clear enough?"

### Rejected Questions (Off-Topic)
- ❌ "What's the weather today?"
- ❌ "Tell me about quantum physics"
- ❌ "How do I cook pasta?"
- ❌ Personal questions unrelated to post creation

## Future Enhancements

Potential improvements (not yet implemented):
- [ ] Mobile bottom sheet for AI assistant
- [ ] Save conversation history with drafts
- [ ] One-click "Apply suggestion" to auto-fill fields
- [ ] Multi-language support
- [ ] Template suggestions based on category
- [ ] Collaboration hints (suggest skills to request)

## API Documentation

Full API docs available at: `http://localhost:8000/docs`

Look for the `/api/v1/ai` section for detailed endpoint documentation.

---

**Questions or Issues?** 
The AI assistant is designed to be helpful while staying strictly focused on post creation. If you encounter any issues, check the backend console logs for detailed error messages.
