# Troubleshooting

## Server connects but tools are missing

The expected catalog contains 39 tools. Restart all affected MCP client sessions
after changing the server or tool definitions; a live Node.js process does not
reload files automatically. Reload the extension separately after changing its
background code. Inspect client MCP stderr logs for startup errors.

Multiple compatible 2.x processes share the same browser bridge. An older process
still owning the port may not understand peer relaying; close the old sessions
before starting the updated pair. Do not keep changing ports for every client.

## Extension waits for the server

Check the server path, Node executable, installed dependencies, and matching
port. Run `npm ci` in the server checkout. Use an absolute Node path for clients
without your shell's PATH. An MCP server configured with stdio must be launched
by the client; do not configure its WebSocket address as an MCP HTTP endpoint.

## Address already in use

Check which application owns the chosen port. The server intentionally does not
kill it. A compatible Extended owner is reused; another service is not. Choose a
free port with `--execute-port` and set the same value in the extension popup.

## Network capture is empty or incomplete

Start capture before reloading the target tab. Pass its explicit `tabId` on later
inspection calls. For action-triggered traffic, perform that action while capture
is running. A full browser reload does not automatically start media playback.
Workers and out-of-process frames are not separately attached. See [NETWORK.md](NETWORK.md).

## Body is unavailable or truncated

Inspect `bodyError`, `truncated`, and `captureBodies`. CDP buffers, resource type,
redirect behavior, navigation, and size limits can make content unavailable.
A metadata record does not guarantee its response body is retained.

## Tool acts on an unexpected page

Non-network tools generally use the active tab. Switch explicitly before acting.
Another MCP client can change shared browser state; this is not client isolation.

## File upload or HAR export fails

Paths refer to the server machine. Upload requires an existing regular file and
a real `input[type=file]`. HAR output requires an existing parent directory and a
new destination file. The tools do not silently overwrite an existing export.

## Real Chromium test does not start

Use a Chromium build that supports loading unpacked extensions in headless mode.
Set `CHROMIUM` to its executable path and `BROWSERMCP_EXTENSION_PATH` to the
companion extension checkout. Branded browser builds or enterprise policies may
restrict command-line extension loading. The test uses a disposable profile.
