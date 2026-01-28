# Lesson API Documentation

## Overview
The Lesson API generates adaptive ecology lessons using GPT integration. It provides personalized educational content based on user history and specified topics.

## Endpoint

### POST /api/v1/users/lesson

Generate an adaptive ecology lesson with recommended actions.

#### Request Body

```json
{
  "topic": "climate change",
  "user_id": 1  // optional
}
```

**Parameters:**
- `topic` (string, required): The ecology topic to learn about
  - Min length: 1 character
  - Max length: 200 characters
  - Examples: "climate change", "renewable energy", "sustainable living"
  
- `user_id` (integer, optional): User ID for personalized content
  - When provided, the lesson adapts based on user's previous learning history

#### Response

**Success (200 OK)**

```json
{
  "lesson": "Climate change is a critical environmental issue affecting our planet...",
  "actions": [
    {
      "title": "Reduce energy consumption",
      "description": "Turn off lights when not in use and switch to energy-efficient appliances"
    },
    {
      "title": "Use public transport",
      "description": "Reduce carbon footprint by using buses, trains, or carpooling"
    },
    {
      "title": "Plant trees",
      "description": "Participate in local tree planting initiatives to absorb CO2"
    }
  ],
  "topic": "climate change"
}
```

**Error Responses:**

- `422 Unprocessable Entity`: Validation error (empty topic, topic too long, etc.)
```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "topic"],
      "msg": "String should have at least 1 character"
    }
  ]
}
```

- `500 Internal Server Error`: Service error (GPT API failure, configuration issue)
```json
{
  "detail": "Failed to generate lesson: GPT API key not configured"
}
```

## Features

### Adaptive Content
When a `user_id` is provided, the system:
1. Retrieves the user's last 5 lesson topics from history
2. Passes this context to GPT for adaptive content generation
3. Generates lessons that build on previous knowledge
4. Saves the new lesson to the user's history

### Action Recommendations
Every lesson includes exactly 3 actionable recommendations that users can implement immediately.

## Database Schema

### lesson_history Table

Stores user lesson history for adaptive content generation.

```sql
CREATE TABLE lesson_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    topic VARCHAR(200) NOT NULL,
    lesson_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX ix_lesson_history_user_id ON lesson_history(user_id);
```

## Configuration

Required environment variables:

```bash
# GPT API Configuration
GPT_API_KEY=your-api-key-here
GPT_API_URL=https://api.dat1.co/api/v1/collection/gpt-120-oss/invoke-chat
```

## Example Usage

### Basic Lesson Generation

```bash
curl -X POST http://localhost:8960/api/v1/users/lesson \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "ocean pollution"
  }'
```

### Personalized Lesson

```bash
curl -X POST http://localhost:8960/api/v1/users/lesson \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "renewable energy",
    "user_id": 42
  }'
```

## Testing

Run the test suite:

```bash
cd backend
pytest tests/test_lesson.py -v
```

All tests follow TDD principles and include:
- ✅ Successful lesson generation
- ✅ Personalized lessons with user ID
- ✅ Empty topic validation
- ✅ Missing topic validation
- ✅ Topic length validation
- ✅ Service error handling

## Implementation Details

### Service Architecture

```
Client Request
    ↓
POST /api/v1/users/lesson (lessons.py)
    ↓
generate_lesson() (lesson_service.py)
    ↓
├─→ get_user_lesson_history() → Database
├─→ build_lesson_prompt() → String
├─→ call_gpt_api() → External API
└─→ save_lesson_history() → Database
    ↓
Response to Client
```

### Error Handling

The service includes comprehensive error handling:
- Missing API key configuration
- HTTP errors from GPT API
- Network connection errors
- Invalid JSON responses from GPT
- Database errors

All errors are caught and returned as appropriate HTTP status codes with descriptive messages.
