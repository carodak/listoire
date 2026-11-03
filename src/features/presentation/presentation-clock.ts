interface Task {
  callback: () => void;
  remaining: number;
  started: number;
  timer?: ReturnType<typeof setTimeout>;
}
export class PresentationClock {
  private readonly tasks = new Set<Task>();
  private paused = false;
  schedule(callback: () => void, delay: number) {
    const task: Task = { callback, remaining: delay, started: performance.now() };
    this.tasks.add(task);
    if (!this.paused) this.arm(task);
  }
  private arm(task: Task) {
    task.started = performance.now();
    task.timer = setTimeout(() => {
      this.tasks.delete(task);
      task.callback();
    }, task.remaining);
  }
  pause() {
    if (this.paused) return;
    this.paused = true;
    for (const task of this.tasks) {
      clearTimeout(task.timer);
      task.remaining = Math.max(0, task.remaining - performance.now() + task.started);
    }
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    for (const task of this.tasks) this.arm(task);
  }
  clear() {
    for (const task of this.tasks) clearTimeout(task.timer);
    this.tasks.clear();
  }
}
