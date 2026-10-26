# Third-party notices

BrowserMCP Extended is an independent modified project. See [NOTICE](NOTICE)
and [LICENSE](LICENSE) for upstream attribution and Apache License 2.0 terms.

Runtime dependencies are installed by npm rather than vendored into this source
repository. Their own license files and transitive notices remain authoritative:

| Package | Declared license |
| --- | --- |
| `@modelcontextprotocol/sdk` | MIT |
| `ws` | MIT |
| `zod` | MIT |
| `zod-to-json-schema` | ISC |

Use `npm ls --all` to inspect the dependency tree. The lockfile records the exact
resolved dependencies. Source and attribution: [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk),
[ws](https://github.com/websockets/ws), [Zod](https://github.com/colinhacks/zod),
[zod-to-json-schema](https://github.com/StefanTerdell/zod-to-json-schema).
