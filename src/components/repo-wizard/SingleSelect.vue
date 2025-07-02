<template>
  <div
    :class="[
      'px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors',
      selected
        ? 'border-primary bg-primary/5'
        : 'border-border hover:border-primary/50',
    ]"
  >
    <div class="flex items-center space-x-3">
      <div class="flex-shrink-0">
        <div
          class="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center"
        >
          <div v-if="selected" class="w-2 h-2 bg-primary rounded-full"></div>
        </div>
      </div>
      <div>
        <h4 class="font-medium">{{ title }}</h4>
        <p class="text-sm text-muted-foreground">
          {{ description }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string;
  description: string;
  selected: boolean;
}>();
</script>
