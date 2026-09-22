// 同时启动前端 (vite) 和后端 (server)。
// 任一进程退出则全部退出。

const procs = [
  Bun.spawn(["bun", "x", "vite"], {
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  }),
  Bun.spawn(["bun", "--cwd", "server", "start"], {
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  }),
];

const exit = async (code) => {
  for (const p of procs) {
    try {
      p.kill();
    } catch {}
  }
  process.exit(code ?? 0);
};

for (const p of procs) {
  p.exited.then((code) => exit(code));
}

process.on("SIGINT", () => exit(0));
process.on("SIGTERM", () => exit(0));
