import { ref, watch, type Ref } from "vue";

/**
 * 通用的 localStorage 读写 composable
 * 统一使用 JSON 序列化处理所有数据类型
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [Ref<T>, (value: T) => void] {
  const storedValue = ref(defaultValue) as Ref<T>;

  // 读取初始值
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

  // 写入值
  const write = (value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      storedValue.value = value;
    } catch (error) {
      console.warn(`Failed to write localStorage key "${key}":`, error);
    }
  };

  // 初始化
  storedValue.value = read();

  // 监听变化并自动保存
  watch(
    storedValue,
    (newValue) => {
      write(newValue);
    },
    { deep: true },
  );

  return [storedValue, write];
}
