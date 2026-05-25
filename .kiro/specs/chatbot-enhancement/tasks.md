# Implementation Plan: Chatbot Enhancement

## Overview

This plan implements enhancements to the Event Planning Assistant chatbot across three layers: the Gemini AI client (increased tokens/timeout), the backend chatbot route (expanded input, conversation history, improved prompts), and the React frontend (history management, markdown rendering, expanded input). Tasks are ordered to build foundational changes first, then layer on features incrementally.

## Tasks

- [x] 1. Update Gemini Client Configuration
  - [x] 1.1 Increase token limit and timeout in `utils/gemini.js`
    - Change `maxOutputTokens` from 500 to 4096
    - Change default `timeoutMs` from 10000 to 30000
    - Keep `retries` default at 2 and all 4 safety settings unchanged
    - _Requirements: 1.1, 7.1, 8.5_

  - [ ]* 1.2 Write property test for Gemini client configuration
    - **Property 6: AI response passthrough without truncation**
    - **Property 7: Short response fallback**
    - **Validates: Requirements 1.2, 1.5**

- [x] 2. Enhance Input Sanitizer
  - [x] 2.1 Update `sanitizeForPrompt` in `routes/chatbot.js`
    - Change character limit from 500 to 1500
    - Apply injection pattern filtering on full input BEFORE truncation
    - Return empty string for empty/whitespace-only input
    - Preserve all existing injection patterns (ignore previous instructions, you are now, system:, pretend, act as)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.7_

  - [ ]* 2.2 Write property tests for input sanitizer
    - **Property 1: Input sanitizer preserves content up to 1500 characters**
    - **Property 2: Injection filtering applied before truncation**
    - **Property 3: Whitespace-only input rejection**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 3. Implement Conversation History Validation
  - [x] 3.1 Create `validateConversationHistory` function in `routes/chatbot.js`
    - Accept an array of message objects
    - Filter to only objects with valid `role` ("user" or "bot") and `content` (string) fields
    - Trim to last 20 valid messages (10 most recent exchanges)
    - Return empty array for non-array, absent, or empty input
    - _Requirements: 4.2, 4.5, 4.6, 4.7_

  - [ ]* 3.2 Write property tests for conversation history validation
    - **Property 4: Conversation history validation and trimming**
    - **Validates: Requirements 4.2, 4.5, 4.7**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Rebuild AI Prompt Builder
  - [x] 5.1 Update `buildAIPrompt` function in `routes/chatbot.js`
    - Add `conversationHistory` parameter (default empty array)
    - Remove "4-6 lines max" and "top 2-3 results" constraints from all prompt templates
    - Add conversation history section formatted chronologically (role: content)
    - Add markdown formatting instructions (bold, bullets, numbered lists, headings)
    - Add instruction to present ALL results with full details (name, services, price, rating, location, experience, capacity)
    - Add instruction to omit unavailable fields rather than showing "N/A"
    - Add instruction to include 2-3 actionable planning tips relevant to the query
    - Add instruction to interpret follow-up messages using conversation history
    - Add instruction for non-search queries to provide 3-5 actionable planning steps
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.4, 2.5, 4.3, 4.4, 5.3, 6.1, 6.2, 9.1, 9.2, 9.3_

  - [ ]* 5.2 Write property test for prompt builder
    - **Property 5: Conversation history included in prompt chronologically**
    - **Validates: Requirements 4.3, 4.4**

- [x] 6. Update Chat Endpoint for Conversation History and Follow-Up Support
  - [x] 6.1 Modify `/chat` endpoint in `routes/chatbot.js` to accept and process history
    - Extract `history` from `req.body` alongside `message`
    - Call `validateConversationHistory` on the history array
    - Pass validated history to `buildAIPrompt` for all prompt types
    - Implement short-response fallback: if AI response < 50 chars and search data exists, use pre-formatted results
    - Ensure deduplication limit remains at 5 unique managers
    - Preserve all existing handlers (greeting, help, suggest/recommend)
    - Preserve existing rate limiter (15 req/min), query parsing, and response structure
    - _Requirements: 1.2, 1.5, 2.3, 4.1, 4.6, 5.1, 5.2, 5.4, 7.2, 8.1, 8.2, 8.3, 8.4, 8.6, 8.8, 9.4_

  - [ ]* 6.2 Write unit tests for chat endpoint conversation flow
    - Test greeting handler returns welcome + suggestions
    - Test help handler returns filter list
    - Test suggest handler returns events + suggestions
    - Test follow-up query with positional reference ("the second one")
    - Test invalid result reference returns error message
    - Test short AI response triggers fallback
    - Test absent/empty history processes as standalone query
    - _Requirements: 5.1, 5.4, 8.1, 8.2, 8.3_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update Frontend Conversation History Management
  - [x] 8.1 Add conversation history state and sending logic to `src/Chatbot.js`
    - Add `conversationHistory` state as array of `{role, content}` objects
    - After each user message and bot response, append to history
    - Before sending API request, trim history to last 20 items (10 exchanges)
    - Send `history` array alongside `message` in POST body to `/chatbot/chat`
    - Update `handleSend` and `handleSuggestionClick` to include history
    - _Requirements: 4.1, 4.5_

  - [x] 8.2 Expand input acceptance in `src/Chatbot.js`
    - Allow input field to accept up to 1500 characters
    - Add `maxLength={1500}` attribute to input element
    - Add character counter display showing current/max characters
    - _Requirements: 3.1_

- [x] 9. Implement Markdown Rendering in Frontend
  - [x] 9.1 Create markdown rendering utility and integrate into `src/Chatbot.js`
    - Create a `renderMarkdown` function or lightweight component
    - Support: `**bold**` → `<strong>`, `- bullet` → `<ul><li>`, `1. numbered` → `<ol><li>`, `## heading` → `<h2>`
    - Replace current `msg.text.split('\n').map(...)` rendering with markdown-aware rendering
    - Gracefully degrade: unsupported tokens display as raw text without broken formatting
    - Ensure dark mode styles apply to new markdown elements
    - _Requirements: 6.1, 6.4, 6.5_

  - [ ]* 9.2 Write property test for markdown renderer
    - **Property 10: Markdown rendering correctness**
    - **Validates: Requirements 6.4**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integration Wiring and Final Validation
  - [x] 11.1 Wire all components together and verify end-to-end flow
    - Verify frontend sends history correctly to backend
    - Verify backend passes history through to prompt builder
    - Verify prompt builder includes history in Gemini prompt
    - Verify response flows back with markdown content
    - Verify frontend renders markdown response correctly
    - Verify typing indicator appears immediately on send and disappears on response
    - Verify existing functionality preserved (greetings, help, suggestions, rate limiting, safety settings)
    - _Requirements: 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.8_

  - [ ]* 11.2 Write integration tests for full chat flow
    - Test full request/response cycle with conversation history
    - Test timeout handling returns graceful fallback message
    - Test follow-up query sequence maintains context
    - Test rate limiting blocks 16th request in 1-minute window
    - Test AI response without planning tips still returns results
    - **Validates: Requirements 5.1, 5.2, 7.2, 8.6, 9.4**

  - [ ]* 11.3 Write property test for query parsing
    - **Property 11: Query parsing extraction**
    - **Validates: Requirements 8.4**

  - [ ]* 11.4 Write property test for response structure
    - **Property 12: Response structure consistency**
    - **Validates: Requirements 8.8**

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses JavaScript (Node.js/Express backend, React frontend) — no language selection needed as the design specifies JavaScript
- Conversation history is client-side only; no database schema changes required
- All existing functionality (greetings, help, suggestions, query parsing, rate limiting, safety settings) must be preserved

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.1"] },
    { "id": 2, "tasks": ["3.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "6.1"] },
    { "id": 4, "tasks": ["6.2", "8.1", "8.2"] },
    { "id": 5, "tasks": ["9.1"] },
    { "id": 6, "tasks": ["9.2", "11.1"] },
    { "id": 7, "tasks": ["11.2", "11.3", "11.4"] }
  ]
}
```
