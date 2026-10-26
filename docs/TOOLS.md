# MCP tool reference

Generated from the runtime tool schemas with `npm run docs:tools`. Do not edit
this file manually. See [LIMITATIONS.md](LIMITATIONS.md) and [NETWORK.md](NETWORK.md)
for behavior that a schema alone cannot describe.

There are **39 tools**. Most non-network tools operate on the active tab.
All example tab IDs, request IDs, references, selectors, and paths are illustrative.

## Index

- [`browser_click`](#browser_click)
- [`browser_clipboard_write`](#browser_clipboard_write)
- [`browser_close_tab`](#browser_close_tab)
- [`browser_delete_cookie`](#browser_delete_cookie)
- [`browser_dialog_handle`](#browser_dialog_handle)
- [`browser_drag`](#browser_drag)
- [`browser_drag_drop`](#browser_drag_drop)
- [`browser_execute_in_frame`](#browser_execute_in_frame)
- [`browser_get_console_logs`](#browser_get_console_logs)
- [`browser_get_cookies`](#browser_get_cookies)
- [`browser_get_html`](#browser_get_html)
- [`browser_get_storage`](#browser_get_storage)
- [`browser_get_text`](#browser_get_text)
- [`browser_go_back`](#browser_go_back)
- [`browser_go_forward`](#browser_go_forward)
- [`browser_hover`](#browser_hover)
- [`browser_list_tabs`](#browser_list_tabs)
- [`browser_navigate`](#browser_navigate)
- [`browser_network_clear`](#browser_network_clear)
- [`browser_network_detail`](#browser_network_detail)
- [`browser_network_export_har`](#browser_network_export_har)
- [`browser_network_list`](#browser_network_list)
- [`browser_network_start`](#browser_network_start)
- [`browser_network_stop`](#browser_network_stop)
- [`browser_new_tab`](#browser_new_tab)
- [`browser_press_key`](#browser_press_key)
- [`browser_reload`](#browser_reload)
- [`browser_screenshot`](#browser_screenshot)
- [`browser_screenshot_element`](#browser_screenshot_element)
- [`browser_screenshot_fullpage`](#browser_screenshot_fullpage)
- [`browser_scroll`](#browser_scroll)
- [`browser_select_option`](#browser_select_option)
- [`browser_set_cookie`](#browser_set_cookie)
- [`browser_snapshot`](#browser_snapshot)
- [`browser_switch_tab`](#browser_switch_tab)
- [`browser_type`](#browser_type)
- [`browser_upload_file`](#browser_upload_file)
- [`browser_wait`](#browser_wait)
- [`execute_script`](#execute_script)

## browser_click

Perform click on a web page

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `element` | string | Yes | Human-readable element description |
| `ref` | string | Yes | Exact element reference from the latest snapshot |

```json
{
  "name": "browser_click",
  "arguments": {
    "element": "Save button",
    "ref": "e1"
  }
}
```

## browser_clipboard_write

Write text to the browser clipboard

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string | Yes | Text to write to the clipboard |

```json
{
  "name": "browser_clipboard_write",
  "arguments": {
    "text": "Example text"
  }
}
```

## browser_close_tab

Close a browser tab by its tab ID

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tabId` | integer | Yes | Numeric ID of the tab to close |

```json
{
  "name": "browser_close_tab",
  "arguments": {
    "tabId": 123
  }
}
```

## browser_delete_cookie

Delete a specific browser cookie by name

Uses document.cookie on the active tab. The url argument is accepted but not used to select a different cookie origin.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Name of the cookie to delete |
| `url` | string | No | Cookie URL (accepted for compatibility; deletion uses the active page) |
| `path` | string | No | Cookie path (defaults to /) |

```json
{
  "name": "browser_delete_cookie",
  "arguments": {
    "name": "theme",
    "path": "/"
  }
}
```

## browser_dialog_handle

Handle a JavaScript dialog (alert, confirm, or prompt) by accepting or dismissing it

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `action` | "accept" \| "dismiss" | Yes | Dialog action: accept or dismiss |
| `promptText` | string | No | Text to enter in a prompt dialog |

```json
{
  "name": "browser_dialog_handle",
  "arguments": {
    "action": "accept"
  }
}
```

## browser_drag

Perform drag and drop between two elements

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `startElement` | string | Yes | Human-readable source description |
| `startRef` | string | Yes | Source reference from the latest snapshot |
| `endElement` | string | Yes | Human-readable target description |
| `endRef` | string | Yes | Target reference from the latest snapshot |

```json
{
  "name": "browser_drag",
  "arguments": {
    "startElement": "Source",
    "startRef": "e1",
    "endElement": "Target",
    "endRef": "e2"
  }
}
```

## browser_drag_drop

Perform a drag-and-drop operation between two elements identified by CSS selectors

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `sourceSelector` | string | Yes | CSS selector of the drag source |
| `targetSelector` | string | Yes | CSS selector of the drop target |

```json
{
  "name": "browser_drag_drop",
  "arguments": {
    "sourceSelector": "#source",
    "targetSelector": "#target"
  }
}
```

## browser_execute_in_frame

Execute JavaScript code inside a specific iframe

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `frameId` | string | Yes | Target frame ID, HTML id attribute, or name |
| `code` | string | Yes | JavaScript expression to evaluate in the frame |

```json
{
  "name": "browser_execute_in_frame",
  "arguments": {
    "frameId": "checkout",
    "code": "document.title"
  }
}
```

## browser_get_console_logs

Get the console logs from the browser

Reads a shared buffer of logs captured during execute_script calls; continuous page console monitoring is not implemented.

No parameters.

```json
{
  "name": "browser_get_console_logs",
  "arguments": {}
}
```

## browser_get_cookies

Get all cookies for a specific URL

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | URL whose cookies should be read |

```json
{
  "name": "browser_get_cookies",
  "arguments": {
    "url": "https://example.org"
  }
}
```

## browser_get_html

Get the HTML content of the page or a specific element

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `selector` | string | No | Target CSS selector (whole page by default) |
| `outerHTML` | boolean | No | Return outerHTML instead of innerHTML (default: false) |

```json
{
  "name": "browser_get_html",
  "arguments": {
    "selector": "main",
    "outerHTML": true
  }
}
```

## browser_get_storage

Read localStorage and/or sessionStorage of the active tab

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | "local" \| "session" \| "both" | No | Storage to read: local, session, or both (default: both) |

```json
{
  "name": "browser_get_storage",
  "arguments": {
    "type": "both"
  }
}
```

## browser_get_text

Get the plain text content of the page or a specific element

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `selector` | string | No | Target CSS selector (whole page by default) |

```json
{
  "name": "browser_get_text",
  "arguments": {
    "selector": "h1"
  }
}
```

## browser_go_back

Go back to the previous page

No parameters.

```json
{
  "name": "browser_go_back",
  "arguments": {}
}
```

## browser_go_forward

Go forward to the next page

No parameters.

```json
{
  "name": "browser_go_forward",
  "arguments": {}
}
```

## browser_hover

Hover over element on page

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `element` | string | Yes | Human-readable element description |
| `ref` | string | Yes | Exact element reference from the latest snapshot |

```json
{
  "name": "browser_hover",
  "arguments": {
    "element": "Help link",
    "ref": "e2"
  }
}
```

## browser_list_tabs

List all open browser tabs with their IDs, URLs, and titles

No parameters.

```json
{
  "name": "browser_list_tabs",
  "arguments": {}
}
```

## browser_navigate

Navigate to a URL

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | HTTP(S) URL to navigate to |

```json
{
  "name": "browser_navigate",
  "arguments": {
    "url": "https://example.org"
  }
}
```

## browser_network_clear

Clear the captured network buffer without stopping an active capture.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tabId` | integer | No | Tab to capture or inspect (active tab by default). |

```json
{
  "name": "browser_network_clear",
  "arguments": {
    "tabId": 123
  }
}
```

## browser_network_detail

Read a captured request including headers, query URL, POST data, response body, timing, errors and WebSocket frames. Bodies can be unavailable or truncated; see bodyError and truncated fields.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tabId` | integer | No | Tab to capture or inspect (active tab by default). |
| `requestId` | string | Yes | Exact id returned by browser_network_list |

```json
{
  "name": "browser_network_detail",
  "arguments": {
    "tabId": 123,
    "requestId": "12345.1:1"
  }
}
```

## browser_network_export_har

Export captured traffic as HAR 1.2. Returns HAR JSON, or writes a new file on the MCP server machine if filePath is supplied. Existing files are not overwritten. Timing phases are aggregated; unavailable fields use HAR sentinel values.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tabId` | integer | No | Tab to capture or inspect (active tab by default). |
| `filePath` | string | No | Optional output .har file path on the MCP server machine |

```json
{
  "name": "browser_network_export_har",
  "arguments": {
    "tabId": 123,
    "filePath": "/absolute/path/capture.har"
  }
}
```

## browser_network_list

List captured requests with IDs, URLs, methods, statuses, durations and failures. Supports filters and pagination. Use the returned id in browser_network_detail.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tabId` | integer | No | Tab to capture or inspect (active tab by default). |
| `url` | string | No | URL substring filter |
| `method` | string | No | HTTP method filter |
| `status` | integer | No | HTTP status filter |
| `resourceType` | string | No | Resource type filter, e.g. Fetch, XHR, Document, WebSocket |
| `offset` | integer | No | See usage example. |
| `limit` | integer | No | See usage example. |

```json
{
  "name": "browser_network_list",
  "arguments": {
    "tabId": 123,
    "resourceType": "Fetch",
    "limit": 50
  }
}
```

## browser_network_start

Start network capture on a tab. Captures future HTTP requests, responses, failures and WebSocket messages. Reload the page afterwards to capture initial loading. Starting an already active capture preserves it; starting a stopped capture resets its buffer.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tabId` | integer | No | Tab to capture or inspect (active tab by default). |
| `captureBodies` | boolean | No | Collect response bodies (default: true). Text is capped at 262144 characters per response, with 8388608 characters shared by response bodies and WebSocket frames. |
| `maxEntries` | integer | No | Maximum retained requests (1000 by default). Oldest requests are evicted. |

```json
{
  "name": "browser_network_start",
  "arguments": {
    "tabId": 123,
    "captureBodies": true,
    "maxEntries": 1000
  }
}
```

## browser_network_stop

Stop capture and release the debugger. Recorded requests and captured bodies remain available until clear, restart or extension reload.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tabId` | integer | No | Tab to capture or inspect (active tab by default). |

```json
{
  "name": "browser_network_stop",
  "arguments": {
    "tabId": 123
  }
}
```

## browser_new_tab

Open a new browser tab, optionally navigating to a URL

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | No | URL to open (defaults to about:blank) |

```json
{
  "name": "browser_new_tab",
  "arguments": {
    "url": "https://example.org"
  }
}
```

## browser_press_key

Press a key on the keyboard

Dispatches synthetic DOM key events; native default keyboard behavior is not guaranteed.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | string | Yes | Key name, e.g. ArrowLeft, Enter, a |

```json
{
  "name": "browser_press_key",
  "arguments": {
    "key": "Enter"
  }
}
```

## browser_reload

Reload the current browser page, optionally with a hard refresh (cache bypass)

Reloads the active tab through chrome.tabs.reload. hard requests bypassCache, rather than clearing the entire browser cache.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `hard` | boolean | No | Bypass the cache when reloading (default: false) |

```json
{
  "name": "browser_reload",
  "arguments": {
    "hard": true
  }
}
```

## browser_screenshot

Take a screenshot of the current page

No parameters.

```json
{
  "name": "browser_screenshot",
  "arguments": {}
}
```

## browser_screenshot_element

Take a screenshot of a specific DOM element identified by a CSS selector

Returns the element bounding box and a viewport image; it does not crop the image to the element.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `selector` | string | Yes | CSS selector of the target element |

```json
{
  "name": "browser_screenshot_element",
  "arguments": {
    "selector": "main"
  }
}
```

## browser_screenshot_fullpage

Capture a full-page screenshot (beyond the visible viewport)

No parameters.

```json
{
  "name": "browser_screenshot_fullpage",
  "arguments": {}
}
```

## browser_scroll

Scroll the page or a specific element to given coordinates or into view

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | number | No | Horizontal scroll position in pixels (default: 0) |
| `y` | number | No | Vertical scroll position in pixels |
| `selector` | string | No | CSS selector to scroll into view (takes priority over x/y) |
| `behavior` | "smooth" \| "instant" \| "auto" | No | Scroll behavior |

```json
{
  "name": "browser_scroll",
  "arguments": {
    "y": 600,
    "behavior": "smooth"
  }
}
```

## browser_select_option

Select an option in a dropdown

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `element` | string | Yes | Human-readable element description |
| `ref` | string | Yes | Exact element reference from the latest snapshot |
| `values` | string[] | Yes | Option values to select |

```json
{
  "name": "browser_select_option",
  "arguments": {
    "element": "Region",
    "ref": "e4",
    "values": [
      "eu"
    ]
  }
}
```

## browser_set_cookie

Set or update a browser cookie

Uses document.cookie on the active tab. HttpOnly cannot be set by this implementation.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Cookie name |
| `value` | string | Yes | Cookie value |
| `domain` | string | No | Cookie domain, e.g. .example.com |
| `path` | string | No | Cookie path (defaults to /) |
| `secure` | boolean | No | Secure cookie (HTTPS only) |
| `httpOnly` | boolean | No | HttpOnly flag (currently not supported by the document.cookie setter) |
| `sameSite` | "Strict" \| "Lax" \| "None" | No | SameSite policy |
| `expires` | number | No | Expiry as a Unix timestamp in seconds |

```json
{
  "name": "browser_set_cookie",
  "arguments": {
    "name": "theme",
    "value": "dark",
    "path": "/"
  }
}
```

## browser_snapshot

Capture accessibility snapshot of the current page. Use this for getting references to elements to interact with.

Returns a simplified summary of at most 250 visible interactive elements. References are shared and should be regenerated after changes.

No parameters.

```json
{
  "name": "browser_snapshot",
  "arguments": {}
}
```

## browser_switch_tab

Switch to a specific browser tab by its tab ID

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tabId` | integer | Yes | Numeric ID of the tab to activate |

```json
{
  "name": "browser_switch_tab",
  "arguments": {
    "tabId": 123
  }
}
```

## browser_type

Type text into editable element

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `element` | string | Yes | Human-readable element description |
| `ref` | string | Yes | Exact element reference from the latest snapshot |
| `text` | string | Yes | Text to enter |
| `submit` | boolean | Yes | Submit the associated form after typing |

```json
{
  "name": "browser_type",
  "arguments": {
    "element": "Search field",
    "ref": "e3",
    "text": "MCP",
    "submit": false
  }
}
```

## browser_upload_file

Upload a file to a file input element on the page

Validates a regular file on the MCP server machine and assigns it to the selected file input through CDP. Assignment does not submit a form.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `selector` | string | Yes | CSS selector of an input[type=file] element |
| `filePath` | string | Yes | Absolute or relative local path of the file to upload |

```json
{
  "name": "browser_upload_file",
  "arguments": {
    "selector": "input[type=file]",
    "filePath": "/absolute/path/example.txt"
  }
}
```

## browser_wait

Wait for a specified time in seconds

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `time` | number | Yes | Wait duration in seconds |

```json
{
  "name": "browser_wait",
  "arguments": {
    "time": 1
  }
}
```

## execute_script

Execute arbitrary JavaScript code in the active browser tab and return the result

Input is an evaluated expression. Use an IIFE for statements. The world hint is accepted but is not currently enforced.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | Yes | JavaScript expression to evaluate |
| `world` | "ISOLATED" \| "MAIN" | No | Execution world hint (currently accepted but not enforced) |
| `timeoutMs` | number | No | Timeout in milliseconds |
| `captureConsole` | boolean | No | Capture console output during evaluation |

```json
{
  "name": "execute_script",
  "arguments": {
    "code": "(() => ({title: document.title}))()",
    "captureConsole": true
  }
}
```
