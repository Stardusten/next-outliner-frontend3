<template>
  <div class="flex items-center text-sm">
    <template
      v-for="(item, index) in breadcrumbItems"
      :key="item.blockId || 'root'"
    >
      <span
        class="transition-colors duration-200 cursor-pointer hover:text-foreground"
        :class="
          index === breadcrumbItems.length - 1
            ? 'text-foreground cursor-default'
            : 'text-muted-foreground'
        "
        @click="handleBreadcrumbClick(item)"
      >
        {{ item.title }}
      </span>
      <span
        v-if="index < breadcrumbItems.length - 1"
        class="mx-2 text-border text-sm"
        >/</span
      >
    </template>
  </div>
</template>

<script setup lang="ts">
import type { BreadcrumbItem } from "@/composables/useBreadcrumb";

interface Props {
  breadcrumbItems: BreadcrumbItem[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  itemClick: [item: BreadcrumbItem];
}>();

// 处理面包屑点击
const handleBreadcrumbClick = (item: BreadcrumbItem) => {
  emit("itemClick", item);
};
</script>
