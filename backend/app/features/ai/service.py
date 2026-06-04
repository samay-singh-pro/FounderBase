import google.generativeai as genai
from typing import List, Dict, Any
from app.core.config import settings
import re

# Configure Gemini API
print(f"Configuring Gemini API with key: {settings.google_gemini_api_key[:10]}..." if settings.google_gemini_api_key else "No API key found")
if settings.google_gemini_api_key:
    genai.configure(api_key=settings.google_gemini_api_key)
    print(f"Gemini API configured successfully with model: {settings.gemini_model}")
else:
    print("WARNING: Google Gemini API key not set!")


class AIService:
    """
    AI Service for helping users create better posts.
    - Uses gemini-1.5-flash (cheapest model)
    - Strictly scoped to post creation context
    - Includes content moderation to prevent misuse
    """
    
    # Blocked/inappropriate keywords to prevent misuse
    BLOCKED_KEYWORDS = [
        "hack", "exploit", "illegal", "abuse", "harass", "bully", "violent", 
        "weapon", "drug", "nsfw", "sexual", "racist", "hate", "scam", "fraud"
    ]
    
    # Allowed topics - must be related to post creation
    ALLOWED_TOPICS = [
        "idea", "problem", "solution", "improvement", "title", "description",
        "category", "farming", "technology", "education", "health", "environment",
        "infrastructure", "finance", "government", "food", "business", "startup",
        "innovation", "opportunity", "collaboration", "research", "writing",
        "refine", "improve", "suggest", "help"
    ]
    
    def __init__(self):
        try:
            self.model = genai.GenerativeModel(settings.gemini_model)
            print(f"AI Model initialized: {settings.gemini_model}")
        except Exception as e:
            print(f"ERROR initializing AI model: {type(e).__name__}: {str(e)}")
            self.model = None
        
        self.system_context = """You are a friendly AI writing assistant for FoundrBase, helping users develop and write better posts.

YOUR APPROACH:
- Be conversational and warm - greet users, ask questions, build rapport
- Help users think through their ideas by asking clarifying questions
- When they discuss an idea, help them shape it into a post
- Give helpful, medium-length responses (3-5 sentences usually)
- Be enthusiastic about their ideas while helping improve them

HOW TO HELP:
- If they share an idea/topic: Ask what problem it solves or why it matters
- If they're unsure: Help them brainstorm and structure their thoughts
- If they have a draft: Give specific, actionable feedback
- Guide them from rough concept → clear post

STAY FOCUSED ON:
- Their post topic and how to communicate it better
- Helping them write compelling titles and descriptions
- Understanding their audience and impact

AVOID:
- Giving opinions on unrelated topics (politics, news, etc.)
- Long theoretical discussions not related to their post
- Being dismissive or rude

Keep responses helpful and friendly - you're here to collaborate, not gatekeep.
"""
        # Safety settings for API calls
        self.safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE"
            }
        ]
    
    def _check_content_safety(self, message: str) -> tuple[bool, str]:
        """
        Check if message is safe and on-topic.
        Returns (is_safe, error_message)
        """
        message_lower = message.lower().strip()
        
        # Allow common greetings and short interactions
        greetings = ["hi", "hello", "hey", "help", "ok", "yes", "no", "thanks", "thank you"]
        if message_lower in greetings:
            return True, ""
        
        # Check for blocked keywords
        for keyword in self.BLOCKED_KEYWORDS:
            if keyword in message_lower:
                return False, "This assistant is only for help with post creation. Please keep your questions relevant and appropriate."
        
        # Check if message is too short (but allow greetings)
        if len(message.strip()) < 3:
            return False, "Could you provide a bit more detail? I'm here to help!"
        
        # Check if message is too long (prevent abuse)
        if len(message) > 2000:
            return False, "Please keep your message under 2000 characters."
        
        # More lenient topic check - allow questions that seem related to writing/creating
        common_words = ["how", "what", "can", "help", "suggest", "improve", "write", "create", 
                       "think", "idea", "about", "should", "would", "my", "i", "post", "draft"]
        has_common_words = any(word in message_lower for word in common_words)
        
        # Check if message contains allowed topic keywords
        has_allowed_topic = any(topic in message_lower for topic in self.ALLOWED_TOPICS)
        
        # Only reject if it seems completely unrelated AND has no common question words
        if not has_allowed_topic and not has_common_words and len(message.strip()) > 15:
            return False, "I'm here to help you create better posts! Let's focus on your idea or what you're trying to write."
        
        return True, ""
    
    def _build_context(self, current_draft: Dict[str, Any] = None) -> str:
        """Build context from user's current draft"""
        if not current_draft:
            return "The user is starting a new post."
        
        context_parts = ["Current draft:"]
        
        if current_draft.get("title"):
            context_parts.append(f"Title: {current_draft['title']}")
        
        if current_draft.get("description"):
            context_parts.append(f"Description: {current_draft['description']}")
        
        if current_draft.get("category"):
            context_parts.append(f"Category: {current_draft['category']}")
        
        if current_draft.get("type"):
            context_parts.append(f"Type: {current_draft['type']}")
        
        return "\n".join(context_parts)
    
    async def chat(
        self, 
        message: str, 
        conversation_history: List[Dict[str, str]] = None,
        current_draft: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Main chat function with context guards
        
        Args:
            message: User's message
            conversation_history: Previous messages [{"role": "user"/"assistant", "content": "..."}]
            current_draft: Current post draft data {"title": "", "description": "", ...}
        
        Returns:
            {"success": bool, "message": str, "error": str}
        """
        # Check content safety
        is_safe, error_msg = self._check_content_safety(message)
        if not is_safe:
            return {
                "success": False,
                "message": "",
                "error": error_msg
            }
        
        # Check if model is initialized
        if not self.model:
            return {
                "success": False,
                "message": "",
                "error": "AI model not initialized. Please check API key configuration."
            }
        
        try:
            # Build conversation context
            draft_context = self._build_context(current_draft)
            
            # Build full prompt with system context
            full_prompt = f"""{self.system_context}

{draft_context}

Conversation history:
"""
            
            # Add conversation history
            if conversation_history:
                for msg in conversation_history[-10:]:  # Last 10 messages only
                    role = "User" if msg["role"] == "user" else "Assistant"
                    full_prompt += f"{role}: {msg['content']}\n"
            
            # Add current message
            full_prompt += f"User: {message}\nAssistant:"
            
            # Generate response with safety settings
            response = self.model.generate_content(
                full_prompt,
                safety_settings=self.safety_settings
            )
            
            # Check if response was blocked
            if not response:
                return {
                    "success": False,
                    "message": "",
                    "error": "No response received from AI. Please try again."
                }
            
            # Check for safety blocks
            if hasattr(response, 'prompt_feedback') and response.prompt_feedback:
                if hasattr(response.prompt_feedback, 'block_reason'):
                    return {
                        "success": False,
                        "message": "",
                        "error": f"Content blocked: {response.prompt_feedback.block_reason}"
                    }
            
            # Get response text
            try:
                response_text = response.text
            except ValueError as e:
                # This happens when content is blocked
                return {
                    "success": False,
                    "message": "",
                    "error": "Response was blocked by safety filters. Please rephrase your question."
                }
            
            if not response_text:
                return {
                    "success": False,
                    "message": "",
                    "error": "I couldn't generate a response. Please try rephrasing your question."
                }
            
            return {
                "success": True,
                "message": response_text.strip(),
                "error": ""
            }
            
        except Exception as e:
            print(f"AI Service Error: {type(e).__name__}: {str(e)}")  # Log error for debugging
            return {
                "success": False,
                "message": "",
                "error": f"Error: {str(e)}"
            }
    
    async def suggest_titles(
        self,
        description: str,
        category: str = "",
        post_type: str = "idea"
    ) -> Dict[str, Any]:
        """Generate title suggestions based on description"""
        
        if not description or len(description.strip()) < 10:
            return {
                "success": False,
                "titles": [],
                "error": "Please provide a description (at least 10 characters) to generate title suggestions."
            }
        
        try:
            prompt = f"""Based on this {post_type} in the {category or 'general'} category, suggest 5 compelling titles (40-80 characters each):

Description: {description[:500]}

Generate exactly 5 titles that are:
1. Clear and concise
2. Action-oriented
3. Engaging and professional
4. Relevant to the category

Return ONLY the titles, one per line, numbered 1-5.
"""
            
            response = self.model.generate_content(prompt, safety_settings=self.safety_settings)
            
            if not response or not response.text:
                return {
                    "success": False,
                    "titles": [],
                    "error": "Couldn't generate titles. Please try again."
                }
            
            # Parse titles from response
            titles = []
            for line in response.text.strip().split('\n'):
                line = line.strip()
                # Remove numbering like "1.", "1)", etc.
                line = re.sub(r'^\d+[\.\)]\s*', '', line)
                if line and len(line) > 10:
                    titles.append(line)
            
            return {
                "success": True,
                "titles": titles[:5],  # Limit to 5
                "error": ""
            }
            
        except Exception as e:
            print(f"AI Service Error (suggest_titles): {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "titles": [],
                "error": f"Error: {str(e)}"
            }
    
    async def improve_description(
        self,
        description: str,
        post_type: str = "idea",
        category: str = ""
    ) -> Dict[str, Any]:
        """Improve and enhance description"""
        
        if not description or len(description.strip()) < 20:
            return {
                "success": False,
                "improved": "",
                "suggestions": [],
                "error": "Please provide a description (at least 20 characters) to improve."
            }
        
        try:
            prompt = f"""Improve this {post_type} description for the {category or 'general'} category:

{description}

Provide:
1. An improved version (keep it concise, clear, and impactful)
2. 3 specific suggestions for what's missing or could be better

Format:
IMPROVED:
[improved description]

SUGGESTIONS:
- [suggestion 1]
- [suggestion 2]
- [suggestion 3]
"""
            
            response = self.model.generate_content(prompt, safety_settings=self.safety_settings)
            
            if not response or not response.text:
                return {
                    "success": False,
                    "improved": "",
                    "suggestions": [],
                    "error": "Couldn't improve description. Please try again."
                }
            
            # Parse response
            text = response.text.strip()
            improved = ""
            suggestions = []
            
            if "IMPROVED:" in text:
                parts = text.split("IMPROVED:", 1)[1].split("SUGGESTIONS:", 1)
                improved = parts[0].strip()
                
                if len(parts) > 1:
                    suggestions_text = parts[1].strip()
                    for line in suggestions_text.split('\n'):
                        line = line.strip()
                        if line.startswith('-') or line.startswith('•'):
                            suggestions.append(line[1:].strip())
            else:
                improved = text
            
            return {
                "success": True,
                "improved": improved,
                "suggestions": suggestions[:3],
                "error": ""
            }
            
        except Exception as e:
            print(f"AI Service Error (improve_description): {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "improved": "",
                "suggestions": [],
                "error": f"Error: {str(e)}"
            }
    
    async def refine_idea(
        self,
        title: str = "",
        description: str = "",
        category: str = "",
        post_type: str = "idea"
    ) -> Dict[str, Any]:
        """Provide comprehensive feedback to refine the idea"""
        
        if not description or len(description.strip()) < 20:
            return {
                "success": False,
                "feedback": "",
                "error": "Please provide more details about your idea (at least 20 characters)."
            }
        
        try:
            prompt = f"""Analyze this {post_type} and provide structured feedback:

Title: {title or 'No title yet'}
Category: {category or 'Not specified'}
Description: {description}

Provide feedback on:
1. Clarity: Is the idea clearly explained?
2. Impact: What's the potential impact/value?
3. Completeness: What key details are missing?
4. Suggestions: 3 specific ways to improve this post

Keep feedback concise, actionable, and encouraging.
"""
            
            response = self.model.generate_content(prompt, safety_settings=self.safety_settings)
            
            if not response or not response.text:
                return {
                    "success": False,
                    "feedback": "",
                    "error": "Couldn't generate feedback. Please try again."
                }
            
            return {
                "success": True,
                "feedback": response.text.strip(),
                "error": ""
            }
            
        except Exception as e:
            print(f"AI Service Error (refine_idea): {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "feedback": "",
                "error": f"Error: {str(e)}"
            }


# Singleton instance
    async def summarize_post(
        self,
        title: str,
        description: str,
        post_type: str,
        category: str,
        comments: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Summarize a post and its comment thread.

        Returns ``{"success", "summary", "comments_considered", "error"}``.
        Comments are capped to keep the prompt bounded for cheap Gemini Flash
        runs; the cap is reflected back to the client via ``comments_considered``.
        """
        if not self.model:
            return {
                "success": False,
                "summary": "",
                "comments_considered": 0,
                "error": "AI model not initialized. Please check API key configuration.",
            }

        max_comments = 30
        max_comment_chars = 500
        used = comments[:max_comments]

        if used:
            comments_block_lines = []
            for i, c in enumerate(used, 1):
                username = (c.get("username") or "user").strip() or "user"
                content = (c.get("content") or "").strip().replace("\n", " ")
                if len(content) > max_comment_chars:
                    content = content[:max_comment_chars] + "..."
                if content:
                    comments_block_lines.append(f"{i}. @{username}: {content}")
            comments_block = "\n".join(comments_block_lines) or "(comments are media-only)"
        else:
            comments_block = "(no comments yet)"

        truncated_description = description[:2000]

        prompt = f"""You are summarizing a community post and how readers reacted.

POST
Title: {title}
Type: {post_type}
Category: {category}
Description: {truncated_description}

COMMENTS ({len(used)} shown of {len(comments)})
{comments_block}

Write a concise, neutral summary (under 110 words, plain prose, no bullets, no headings) that covers:
- What the post is about and its core point.
- How readers are reacting in the comments (only if comments exist; otherwise say "No comments yet.").
- Any notable agreement, pushback, or recurring themes.

Do NOT add disclaimers, do NOT quote comments verbatim, do NOT include the user's name."""

        try:
            response = self.model.generate_content(
                prompt,
                safety_settings=self.safety_settings,
            )

            if not response:
                return {
                    "success": False,
                    "summary": "",
                    "comments_considered": len(used),
                    "error": "No response received from AI. Please try again.",
                }

            try:
                response_text = response.text
            except ValueError:
                return {
                    "success": False,
                    "summary": "",
                    "comments_considered": len(used),
                    "error": "Response was blocked by safety filters.",
                }

            if not response_text or not response_text.strip():
                return {
                    "success": False,
                    "summary": "",
                    "comments_considered": len(used),
                    "error": "Couldn't generate a summary. Please try again.",
                }

            return {
                "success": True,
                "summary": response_text.strip(),
                "comments_considered": len(used),
                "error": "",
            }

        except Exception as e:
            print(f"AI Service Error (summarize_post): {type(e).__name__}: {str(e)}")
            return {
                "success": False,
                "summary": "",
                "comments_considered": len(used),
                "error": f"Error: {str(e)}",
            }


ai_service = AIService()
