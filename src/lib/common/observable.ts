type Subscriber<T> = (value: T) => void;

/**
 * 可观察对象类
 * 实现简单的发布订阅模式,用于状态管理
 */
export class Observable<T> {
  private value: T;
  private subscribers: Set<Subscriber<T>> = new Set();
  private disposers: (() => void) | null = null;

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  /**
   * 获取当前值
   */
  get(): T {
    return this.value;
  }

  /**
   * 设置新值并通知所有订阅者
   */
  set(newValue: T): void {
    if (this.value === newValue) return;
    this.value = newValue;
    this.notifyAll();
  }

  /**
   * 通过一个更新函数来修改值, 然后通知所有订阅者。
   * 这允许对对象或数组进行安全的内部修改。
   */
  update(updater: (value: T) => void): void {
    updater(this.value);
    this.notifyAll();
  }

  /**
   * 添加订阅者
   */
  subscribe(
    subscriber: Subscriber<T>,
    config?: { immediate?: boolean }
  ): () => void {
    this.subscribers.add(subscriber);

    if (config?.immediate) {
      subscriber(this.value);
    }

    // 返回取消订阅函数
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  subscribeOnce(subscriber: Subscriber<T>): void {
    const unsubscribe = this.subscribe(subscriber);
    unsubscribe();
  }

  setDisposer(disposer: () => void): void {
    this.disposers = disposer;
  }

  dispose(): void {
    if (this.disposers) this.disposers();
    this.subscribers.clear();
  }

  /**
   * 通知所有订阅者
   */
  private notifyAll(): void {
    for (const subscriber of this.subscribers) {
      subscriber(this.value);
    }
  }
}
