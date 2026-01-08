#!/usr/bin/env node

import { VoiceMemoMCPServer } from "./server.js";

async function main() {
  const server = new VoiceMemoMCPServer();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    server.close();
    process.exit(0);
  });

  try {
    await server.run();
  } catch (error) {
    console.error("Fatal error:", error);
    server.close();
    process.exit(1);
  }
}

main();
