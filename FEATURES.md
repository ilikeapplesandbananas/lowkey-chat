# Lowkey AI - Feature Implementation Guide

## Overview
This document describes the new safety, privacy, and utility features implemented in Lowkey AI.

---

## ✨ New Features Implemented

### 1. **Memory System** (`/remember` command)
Store facts and preferences that persist across conversations.

**Usage:**
```
/remember favorite_language Python
/remember timezone EST
/remember work_hours 9am-5pm
```

**Features:**
- Persistent storage using Supabase database
- Automatic sensitive data detection (passwords, API keys, etc.)
- Confirmation dialog for sensitive information
- View and manage memories in Privacy Settings

**How it works:**
1. Type `/remember key value` in chat
2. A dialog appears confirming storage
3. Stored data is encrypted and only visible to you
4. AI can reference your memories in future conversations

---

### 2. **Code Execution Engine**
Run JavaScript code snippets directly in chat with output visualization.

**Features:**
- Syntax highlighting for code blocks
- One-click code execution (JavaScript only)
- Console output capture
- Copy code button
- Error handling with clear error messages

**Usage:**
When the assistant sends a code block like:
```javascript
const greeting = (name) => `Hello, ${name}!`;
console.log(greeting("World"));
```

The message will include:
- **Run** button to execute the code
- **Copy** button to copy the code
- Live output display below the code

---

### 3. **Safety Filter System**
Automatic content moderation to prevent unsafe requests.

**What it detects:**
- ❌ Hacking/unauthorized access attempts
- ❌ Illegal activity requests
- ❌ Violence and harm guidance
- ❌ Abuse and harassment instructions

**How it works:**
1. User submits a message
2. Safety filter analyzes content
3. If unsafe: message is declined with a suggestion
4. If safe: message proceeds normally

**Example:**
```
User: "How do I hack into someone's account?"
Response: "I can't help with hacking or unauthorized access. 
Instead, I can help you with: cybersecurity best practices, 
ethical hacking certifications, or authorized penetration testing."
```

---

### 4. **Privacy Controls & Settings**
Full transparency and control over your data.

**Features:**
- View all stored memories
- Delete individual memories
- Delete all memories at once
- Toggle conversation saving
- Data minimization best practices

**Access:** Settings → Privacy & Data

**Data Security:**
- Conversations stored only in your account
- Memories are encrypted at rest
- Row-level security (RLS) enforced
- Automatic sensitive data flagging

---

## 🔧 Technical Implementation

### Services Created

#### `memoryService.ts`
Handles all memory operations with Supabase:
```typescript
await memoryService.saveMemory({ key, value, isSensitive })
await memoryService.getMemory(key)
await memoryService.getAllMemories()
await memoryService.deleteMemory(id)
await memoryService.updateMemory(id, value)
```

#### `safetyService.ts`
Content moderation and sensitive data detection:
```typescript
const result = safetyService.checkContent(userMessage)
const isSensitive = safetyService.isMemorySensitive(key, value)
```

### Components Created

#### `CodeExecutor.tsx`
- Displays code with syntax highlighting
- Provides run and copy functionality
- Captures and displays console output

#### `MemoryDialog.tsx`
- Modal for saving new memories
- Sensitive data warnings
- Confirmation before storage

#### `PrivacySettings.tsx`
- View and manage stored memories
- Delete individual or all memories
- Privacy information and tips

### Database Schema
```sql
create table user_memories (
  id uuid primary key,
  user_id uuid references auth.users(id),
  key text,
  value text,
  is_sensitive boolean,
  created_at timestamp,
  updated_at timestamp
)
```

---

## 🚀 Usage Examples

### Memory System Example
```
User: /remember preferred_framework React
Assistant: ✓ Remembered: preferred_framework

Later in conversation:
User: What web framework should I use?
Assistant: Based on your preference for React, I'd recommend...
```

### Code Execution Example
```
Assistant: Here's a simple calculation:

```javascript
const sum = (a, b) => a + b;
console.log(sum(5, 3));
```

User clicks "Run" → Output shows: "8"
```

### Safety Filter Example
```
User: How do I create a malware?
Assistant: [Declined message with alternative suggestion]
```

---

## 🔐 Privacy & Security

### Data Protection
- ✅ End-to-end encryption for memories
- ✅ Row-level security on database
- ✅ User authentication required
- ✅ No data sharing without consent
- ✅ Automatic sensitive data detection

### Best Practices
- Never store passwords or API keys in plain text
- Use environment variables for secrets
- Consider a password manager for credentials
- Review stored memories regularly

---

## 📋 Checklist for Usage

- [ ] Try the `/remember` command to store your first preference
- [ ] Check Privacy Settings to view stored memories
- [ ] Test code execution by asking the AI for a code snippet
- [ ] Try requesting unsafe content to see the safety filter
- [ ] Review Privacy Settings for data minimization options

---

## 🐛 Troubleshooting

### Memory not saving?
- Check if you have an active user account (Supabase auth)
- Ensure database migration has been applied
- Check browser console for error messages

### Code not executing?
- Currently supports JavaScript/Node.js only
- Other languages (Python, etc.) show "Not supported" message
- Check console for syntax errors

### Safety filter blocking legitimate requests?
- The filter is conservative to prioritize safety
- If you believe it's a false positive, contact support
- The AI can still discuss security concepts in educational context

---

## 🎯 Future Enhancements

- [ ] Python code execution with Web Worker
- [ ] SQL query execution
- [ ] File upload and analysis
- [ ] Memory search and tagging
- [ ] Shared memories/profiles
- [ ] Advanced privacy controls (data retention policies)
- [ ] Memory usage analytics

---

## 📞 Support
For issues or questions about these features, please check:
1. Browser console for error messages
2. Privacy Settings for data management
3. Project documentation
