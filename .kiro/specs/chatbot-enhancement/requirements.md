# Requirements Document

## Introduction

This document specifies the requirements for enhancing the Event Planning Assistant chatbot to provide more comprehensive, detailed, and contextually aware responses. The current chatbot is limited by low token output limits, overly concise prompt instructions, truncated user input, and lack of conversation memory. The enhancement aims to transform the chatbot from a brief-answer tool into a rich conversational assistant that maintains context across multiple exchanges and delivers thorough, helpful responses.

## Glossary

- **Chatbot_Backend**: The Express.js route handler (`routes/chatbot.js`) that processes user messages, queries the database, and orchestrates AI responses
- **Gemini_Client**: The utility module (`utils/gemini.js`) that interfaces with the Google Gemini AI model for generating natural language responses
- **Conversation_Session**: A server-side or client-side record of the message exchange history between a user and the chatbot within a single chat window session
- **AI_Prompt**: The structured text sent to the Gemini model containing system instructions, conversation context, database results, and the user's current message
- **Input_Sanitizer**: The function that filters prompt injection attempts and limits input length before passing user messages to the AI model
- **Response_Token_Limit**: The maximum number of tokens the Gemini model is allowed to generate in a single response
- **Follow_Up_Query**: A user message that references or builds upon information from a previous message in the same conversation session
- **Chatbot_Frontend**: The React component (`Chatbot.js`) that renders the chat interface and manages message display

## Requirements

### Requirement 1: Increase AI Response Output Capacity

**User Story:** As a user, I want the chatbot to provide detailed and thorough responses, so that I get comprehensive information without needing to ask multiple follow-up questions.

#### Acceptance Criteria

1. THE Gemini_Client SHALL be configured with a Response_Token_Limit of at least 2048 tokens and no more than 8192 tokens
2. WHEN the Gemini_Client generates a response, THE Chatbot_Backend SHALL return the complete generated text to the user without applying any character-limit truncation or substring operations on the AI output
3. THE AI_Prompt SHALL NOT contain instructions limiting responses to a fixed line count or word count (such as "4-6 lines max" or "keep it concise")
4. THE AI_Prompt SHALL instruct the Gemini model to structure responses with relevant details including specific names, prices, ratings, locations, and actionable next steps drawn from the provided data
5. IF the Gemini_Client returns a response shorter than 50 characters for a search query containing results data, THEN THE Chatbot_Backend SHALL fall back to the pre-formatted result text instead of displaying the short AI response

### Requirement 2: Remove Overly Restrictive Prompt Constraints

**User Story:** As a user, I want the chatbot to present all relevant results with full details, so that I can make informed decisions about event planners and services.

#### Acceptance Criteria

1. THE AI_Prompt SHALL NOT contain instructions limiting responses to a fixed line count (such as "4-6 lines max") or a fixed result count (such as "top 2-3 results")
2. THE AI_Prompt SHALL instruct the Gemini model to present all results included in the provided data section of the prompt, without omitting or summarizing any entries
3. WHEN search results contain matching planners, THE Chatbot_Backend SHALL include up to 5 deduplicated results in the data provided to the AI_Prompt, ordered by the applied sort criteria
4. THE AI_Prompt SHALL instruct the Gemini model to include the following details for each result when available in the data: name, price, rating, location, experience, capacity, and available services
5. IF a detail field (such as rating, capacity, or experience) is not available for a result, THEN THE AI_Prompt SHALL instruct the Gemini model to omit that field from the result rather than displaying a placeholder value

### Requirement 3: Expand User Input Acceptance

**User Story:** As a user, I want to write detailed queries describing my event needs, so that the chatbot can understand my full requirements and provide accurate recommendations.

#### Acceptance Criteria

1. THE Input_Sanitizer SHALL accept user messages up to 1500 characters in length and pass them through for processing without truncation
2. THE Input_Sanitizer SHALL filter prompt injection patterns (including "ignore previous instructions", "you are now", "system:", "pretend", and "act as" variants) on the full message content prior to any truncation
3. WHEN a user message exceeds 1500 characters, THE Input_Sanitizer SHALL truncate the message to the first 1500 characters and process only the truncated content
4. IF a user message is empty or contains only whitespace after trimming, THEN THE Input_Sanitizer SHALL reject the message and return an empty string without forwarding it to the AI model
5. THE Input_Sanitizer SHALL apply prompt injection filtering before applying the character limit truncation, so that injection patterns are detected regardless of their position in the message

### Requirement 4: Implement Conversation History

**User Story:** As a user, I want the chatbot to remember what we discussed earlier in the conversation, so that I can ask follow-up questions without repeating context.

#### Acceptance Criteria

1. THE Chatbot_Frontend SHALL send the conversation history as an array of message objects, each containing a role field ("user" or "bot") and a content field (the message text), ordered from oldest to newest, along with each new user message to the Chatbot_Backend
2. THE Chatbot_Backend SHALL accept a conversation history array containing up to the 10 most recent message exchanges (user and bot pairs), where one exchange consists of one user message and one bot response
3. WHEN a Conversation_Session contains prior messages, THE AI_Prompt SHALL include the conversation history in chronological order as context for the Gemini model
4. THE Gemini_Client SHALL receive the conversation history as part of the prompt so that the generated response accounts for previously discussed topics, results, and user preferences within the session
5. IF the conversation history exceeds 10 message exchanges, THEN THE Chatbot_Frontend SHALL send only the 10 most recent exchanges
6. IF the conversation history array is absent, empty, or contains no valid message objects in the request, THEN THE Chatbot_Backend SHALL process the user message as a standalone query without conversation context
7. IF a message object in the conversation history array is missing the role or content field, THEN THE Chatbot_Backend SHALL discard that message object and process the remaining valid history

### Requirement 5: Support Follow-Up Queries

**User Story:** As a user, I want to ask follow-up questions like "tell me more about the second one" or "what about cheaper options", so that I can explore results conversationally.

#### Acceptance Criteria

1. WHEN a user sends a Follow_Up_Query referencing a previous result by position (e.g., "the second one", "the first planner"), THE Chatbot_Backend SHALL use the conversation history to identify the referenced result and return details specific to that result
2. WHEN a user asks to refine previous results (e.g., "cheaper options", "in a different city"), THE Chatbot_Backend SHALL apply the new filter while retaining the original query context including event type, location, price range, guest count, and any previously applied filters
3. THE AI_Prompt SHALL instruct the Gemini model to interpret follow-up messages in the context of the prior conversation and to reference specific results from the conversation history when the user uses positional or descriptive references
4. IF a Follow_Up_Query references a result that does not exist in the prior conversation (e.g., "the fifth one" when only 3 results were shown), THEN THE Chatbot_Backend SHALL return a message indicating how many results were previously shown and prompt the user to select a valid option

### Requirement 6: Improve Response Formatting and Structure

**User Story:** As a user, I want chatbot responses to be well-structured and easy to read, so that I can quickly find the information I need in longer responses.

#### Acceptance Criteria

1. THE AI_Prompt SHALL instruct the Gemini model to use markdown section headings, bullet points, and numbered lists for organizing responses that contain more than one result or more than 3 sentences of content
2. WHEN a response contains 2 or more event planner results, THE AI_Prompt SHALL instruct the Gemini model to provide a 1-2 sentence summary at the beginning stating the total number of results and the primary filter criteria matched
3. WHEN presenting event planner results, THE Chatbot_Backend SHALL format each result with fields in the following fixed order: name, services, price (₹ symbol), rating, location, and contact information, using the same labels and structure for every result in the response
4. THE Chatbot_Frontend SHALL render markdown-style formatting (bold text, bullet points, numbered lists) in bot messages by converting markdown tokens to styled HTML elements
5. IF a bot message contains markdown tokens that the Chatbot_Frontend does not support, THEN THE Chatbot_Frontend SHALL display the raw text content without the unsupported tokens rather than rendering broken formatting

### Requirement 7: Increase API Timeout for Longer Responses

**User Story:** As a user, I want the chatbot to complete generating detailed responses without timing out, so that I receive full answers even when they take slightly longer to generate.

#### Acceptance Criteria

1. THE Gemini_Client SHALL be configured with a request timeout of 30000 milliseconds per attempt, with a maximum of 2 retry attempts before returning a failure response
2. IF the Gemini_Client request times out after all retry attempts are exhausted, THEN THE Chatbot_Backend SHALL return an HTTP 200 response containing a message indicating the response is taking longer than expected and suggesting the user try again
3. WHEN the user sends a message to the Chatbot_Backend, THE Chatbot_Frontend SHALL display a typing indicator within 100 milliseconds of the request being initiated
4. WHEN the Chatbot_Backend returns a response or an error, THE Chatbot_Frontend SHALL remove the typing indicator and display the returned message

### Requirement 8: Preserve Existing Functionality

**User Story:** As a developer, I want the chatbot enhancements to be backward-compatible with existing features, so that current chatbot capabilities (greeting handling, help commands, query parsing, search filters, suggestions, rate limiting, and safety settings) continue to work without disruption.

#### Acceptance Criteria

1. WHEN a user sends a greeting message (e.g., "hi", "hello", "hey"), THE Chatbot_Backend SHALL return a welcome response containing event category examples and a list of up to 5 dynamic suggestions, along with a clickable suggestions array in the JSON response
2. WHEN a user sends a help command (e.g., "help", "commands"), THE Chatbot_Backend SHALL return a response listing all supported filter types: search by type, location, budget, capacity, rating, experience, services, availability, and compare
3. WHEN a user sends a suggestion request (e.g., "suggest", "recommend", "popular"), THE Chatbot_Backend SHALL return up to 3 top-rated events and up to 5 dynamic search suggestions
4. THE Chatbot_Backend SHALL preserve all existing query parsing logic for location, price (min and max), rating, experience, guest count, event type, addon filters (catering, decoration, photography, music, transport, dj, food, photo, video), and sort preferences (cheapest, best-rated)
5. THE Gemini_Client SHALL retain all 4 existing safety settings (HARM_CATEGORY_HARASSMENT, HARM_CATEGORY_HATE_SPEECH, HARM_CATEGORY_SEXUALLY_EXPLICIT, HARM_CATEGORY_DANGEROUS_CONTENT) each configured at BLOCK_MEDIUM_AND_ABOVE threshold
6. THE Chatbot_Backend SHALL maintain the existing rate limiter configuration of 15 requests per 1-minute window, returning a message indicating the user is sending messages too fast when the limit is exceeded
7. THE Input_Sanitizer SHALL continue to filter all existing prompt injection patterns including: "ignore previous instructions", "you are now", "system:", "pretend", and "act as"
8. THE Chatbot_Backend SHALL preserve the existing JSON response structure containing a "reply" field and an optional "suggestions" array field for all chat endpoint responses

### Requirement 9: Provide Contextual Event Planning Guidance

**User Story:** As a user, I want the chatbot to provide expert event planning advice alongside search results, so that I get actionable guidance beyond just a list of planners.

#### Acceptance Criteria

1. WHEN a user sends a message that does not match any search filters (location, price, rating, experience, guest count, event type, or addon keywords), THE AI_Prompt SHALL instruct the Gemini model to provide planning advice containing 3-5 actionable steps relevant to the user's question
2. WHEN the Chatbot_Backend presents search results to the user, THE AI_Prompt SHALL instruct the Gemini model to include 2-3 tips specific to the user's queried event type or applied filters (e.g., budget considerations, venue capacity guidance, or seasonal timing advice)
3. WHEN presenting results for a specific event type, THE AI_Prompt SHALL instruct the Gemini model to include 2-3 planning tips specific to that event type (e.g., timeline milestones, vendor coordination advice, or guest management considerations)
4. IF the Gemini model response does not include planning tips alongside search results, THEN THE Chatbot_Backend SHALL still return the formatted search results without blocking the response
