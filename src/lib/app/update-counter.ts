export class UpdateCounter {
  private updateCount = 0;

  get() {
    return this.updateCount;
  }

  set(val: number) {
    this.updateCount = val;
  }

  inc() {
    this.updateCount++;
  }
}
