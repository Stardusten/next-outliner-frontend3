<template>
  <BaseModal
    :visible="visible"
    title="导入确认"
    confirm-text="确认导入"
    @confirm="handleConfirm"
    @cancel="handleCancel"
    @close="handleCancel"
  >
    <p class="conflict-message">
      发现 <strong>{{ conflictCount }}</strong> 个块的 ID 与现有数据冲突。
    </p>
    <p class="conflict-description">请选择处理方式：</p>

    <div class="option-group">
      <label class="option-item">
        <input type="radio" name="conflictResolution" value="skip" v-model="selectedStrategy" />
        <div class="option-content">
          <div class="option-title">跳过冲突块</div>
          <div class="option-desc">保留现有数据，不导入冲突的块</div>
        </div>
      </label>

      <label class="option-item">
        <input
          type="radio"
          name="conflictResolution"
          value="overwrite"
          v-model="selectedStrategy"
        />
        <div class="option-content">
          <div class="option-title">覆盖现有块</div>
          <div class="option-desc">用导入的数据替换现有块（谨慎使用）</div>
        </div>
      </label>

      <label class="option-item">
        <input
          type="radio"
          name="conflictResolution"
          value="generateNewId"
          v-model="selectedStrategy"
        />
        <div class="option-content">
          <div class="option-title">生成新ID（推荐）</div>
          <div class="option-desc">为冲突的块生成新ID，保留所有数据</div>
        </div>
      </label>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ImportOptions } from "../lib/storage/interface";
import BaseModal from "./BaseModal.vue";

// Props
defineProps<{
  visible: boolean;
  conflictCount: number;
}>();

// Emits
const emit = defineEmits<{
  confirm: [strategy: ImportOptions["conflictResolution"]];
  cancel: [];
}>();

// 选中的策略
const selectedStrategy = ref<ImportOptions["conflictResolution"]>("generateNewId");

// 处理确认
const handleConfirm = () => {
  emit("confirm", selectedStrategy.value);
};

// 处理取消
const handleCancel = () => {
  emit("cancel");
};
</script>

<style scoped>
.conflict-message {
  margin: 0 0 8px 0;
  color: var(--menu-text);
  font-size: 14px;
}

.conflict-description {
  margin: 0 0 20px 0;
  color: var(--menu-text-muted);
  font-size: 13px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--menu-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--color-bg);
}

.option-item:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-block-ref);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.option-item input[type="radio"] {
  margin: 2px 0 0 0;
  accent-color: var(--color-block-ref);
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--menu-text);
  margin-bottom: 4px;
}

.option-desc {
  font-size: 12px;
  color: var(--menu-text-muted);
  line-height: 1.4;
}
</style>
