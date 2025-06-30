<template>
  <div @click="handleClick">
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  open?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:open": [open: boolean];
}>();

const handleClick = () => {
  emit("update:open", !props.open);
};
</script>

<style scoped>
/* DialogTrigger 只是一个逻辑组件，不需要特殊样式 */
</style>
