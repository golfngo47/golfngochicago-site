export async function register() {
  // Only run in the Node.js runtime (not edge), and only once
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
