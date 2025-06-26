<template>
  <BaseModal
    :visible="visible"
    title="导入确认"
    confirm-text="确认导入"
    @confirm="handleConfirm"
    @cancel="handleCancel"
    @close="handleCancel"
  >
    <p class="message">
      检测到 <strong>{{ blockCount }}</strong> 个块，是否确定导入？
    </p>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from "./BaseModal.vue";

// Props
defineProps<{
  visible: boolean;
  blockCount: number;
}>();

// Emits
const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

// 处理确认
const handleConfirm = () => {
  emit("confirm");
};

// 处理取消
const handleCancel = () => {
  emit("cancel");
};
</script>

<style scoped>
.message {
  margin: 0;
  color: var(--menu-text);
  font-size: var(--ui-font-size);
  line-height: 1.5;
}

.message strong {
  color: var(--menu-text);
  font-weight: 600;
}
</style>
