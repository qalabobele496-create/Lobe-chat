[copilot-memory-mcp]

You are given tools from Copilot Memory MCP server for knowledge storage, rules management, code indexing, and **smart context enrichment**:

## CRITICAL: Always Retrieve Rules First

**At the start of EVERY chat session**, you MUST call `mcp_copilot-memor_retrieve_rules` to load active coding rules and guidelines. These rules define how you should write code, structure projects, and respond to user requests.

Example first action in every chat:
```
retrieve_rules() // Load all active rules
```

## Knowledge Storage Tools (3 tools)

### 1. `mcp_copilot-memor_store_knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation
+ User explicitly asks to "remember" or "save" information
+ Discovering project-specific conventions or configurations

### 2. `mcp_copilot-memor_retrieve_knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase
+ User explicitly asks to "retrieve" or "recall" information
+ Need context about past decisions or implementations

### 3. `mcp_copilot-memor_list_knowledge`
You `MUST` use this tool when:

+ User wants to see all stored knowledge
+ Need to browse available context and patterns
+ Checking what information is already saved
+ Getting statistics about stored knowledge

## Rules Management Tools (5 tools)

### 4. `mcp_copilot-memor_store_rule`
Use when user says "save as rule", "remember this rule", or "add this to rules":

+ Stores coding guidelines, conventions, and best practices
+ Rules are automatically applied to every chat session
+ Categories: "code-style", "architecture", "testing", "general"
+ Priority: 0-10 (higher = more important)

### 5. `mcp_copilot-memor_retrieve_rules`
**MUST be called at the start of every chat**:

+ Loads all active rules to guide your responses
+ Returns rules sorted by priority
+ Apply these rules to all code you write

### 6. `mcp_copilot-memor_list_rules`
Use to show all rules with their IDs for management:

+ Lists all rules with titles, categories, IDs
+ Shows priority and enabled/disabled status
+ Helps users manage their rules

### 7. `mcp_copilot-memor_update_rule`
Use to modify existing rules by ID:

+ Update title, content, category, priority
+ Enable or disable rules
+ Requires rule ID from list_rules

### 8. `mcp_copilot-memor_delete_rule`
Use to remove rules by ID:

+ Permanently deletes a rule
+ Requires rule ID from list_rules

## Code Indexing Tools (6 tools) - PROJECT scope only

These tools help you understand the codebase structure, find symbols, and track dependencies.

### 9. `mcp_copilot-memor_index_file`
Index a single file to extract symbols and imports:

+ Call after file changes for real-time updates
+ Extracts functions, classes, methods, interfaces, types
+ Tracks import/export relationships
+ Uses content hash for incremental indexing

### 10. `mcp_copilot-memor_index_workspace`
Index all files in the workspace:

+ Batch index with incremental support (skips unchanged files)
+ Supports 27+ languages (JS, TS, Python, Rust, Go, Java, C/C++, etc.)
+ Returns statistics about indexed files

### 11. `mcp_copilot-memor_search_symbols`
Search for symbols across the indexed codebase:

+ Full-text search on symbol names
+ Filter by SymbolKind (5=Class, 6=Method, 12=Function, 13=Variable)
+ Filter by exported symbols only
+ Returns file path and line number

### 12. `mcp_copilot-memor_get_file_symbols`
Get all symbols and imports for a specific file:

+ Lists all functions, classes, methods in a file
+ Shows import statements and their sources
+ Useful for understanding file structure

### 13. `mcp_copilot-memor_find_references`
Find files that import a module or define a symbol:

+ Find all files importing a specific module
+ Find all definitions of a symbol name
+ Useful for refactoring and impact analysis

### 14. `mcp_copilot-memor_get_index_stats`
Get code index statistics:

+ Total files, symbols, and imports indexed
+ Per-language breakdown (file count, line count)
+ Useful for understanding codebase size

---

## Smart Context Features (Automatic)

The Copilot Memory system now includes intelligent context enrichment:

### Automatic Context Attachment
When storing knowledge, the system automatically:
+ Tracks the **active file** you're working on
+ Extracts **related symbols** (functions, classes) from the content
+ Discovers **related files** through import analysis
+ Links knowledge to relevant code locations

### Enhanced Knowledge Retrieval
When retrieving knowledge, you get:
+ Related files and symbols attached to each result
+ Code symbol matches from the indexed codebase
+ File path context for better navigation

### Entity Extraction
The system automatically extracts:
+ File paths from code blocks and inline references
+ Import statements and module dependencies
+ Function calls and class references
+ Symbol names for cross-referencing

---

**Note**: This project uses SQLite-based Copilot Memory for high-performance knowledge storage, rules management, and code indexing with full-text search capabilities.

**REMEMBER**: 
1. Call `retrieve_rules()` at the START of every chat to load coding guidelines!
2. Use `search_symbols` to find functions/classes before implementing similar ones
3. Use `get_file_symbols` to understand a file's structure before editing
4. Knowledge stored while editing a file automatically links to that file context
