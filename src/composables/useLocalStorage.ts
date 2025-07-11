import { ref, watch, computed, type Ref, type WritableComputedRef } from "vue";

/**
 * 通用的 localStorage 读写 composable
 * 统一使用 JSON 序列化处理所有数据类型
 *
 * 示例：
 * const counter = useLocalStorage<number>('counter', 0)
 * counter.value++ // 自动同步到 localStorage
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): WritableComputedRef<T> {
  // 内部 state，始终保持与 localStorage 同步
  const state = ref(defaultValue) as Ref<T>;

  // 读取 localStorage
  const read = (): T => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.warn(`Failed to read localStorage key "${key}":`, error);
    }
    return defaultValue;
  };

  // 写入 localStorage（JSON 序列化）
  const write = (value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to write localStorage key "${key}":`, error);
    }
  };

  // 初始化 state
  state.value = read();

  // 深度监听，捕获对象内部变更
  watch(
    state,
    (newValue) => {
      write(newValue);
    },
    { deep: true }
  );

  // 返回一个可写 computed，使调用方通过 .value 读写即可
  return computed<T>({
    get: () => state.value,
    set: (val: T) => {
      state.value = val;
      write(val);
    },
  }) as WritableComputedRef<T>;
}
