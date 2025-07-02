<template>
  <Dialog v-model:open="visible" @update:open="handleOpenChange">
    <DialogContent
      class="flex flex-row gap-0 max-w-[90vw]! max-h-[80vh]! w-[800px] h-[600px] p-0 !outline-none overflow-hidden"
    >
      <DialogHeader class="hidden">
        <DialogTitle>设置</DialogTitle>
      </DialogHeader>

      <!-- 左侧边栏 -->
      <div
        class="left w-[200px] bg-sidebar border-r border-sidebar-border p-2 pr-1 flex flex-col text-sidebar-foreground"
      >
        <div class="text-sm text-muted-foreground font-semibold px-4 py-2">
          Settings
        </div>
        <div class="flex flex-col gap-1">
          <template v-for="section in sidebarSections" :key="section.title">
            <Button
              v-for="item in section.items"
              :key="item.id"
              variant="ghost"
              :data-active="item.id === currentPage"
              class="w-full h-7 justify-start font-normal truncate text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
              @click="currentPage = item.id"
            >
              <component
                :is="item.icon"
                v-if="item.icon"
                class="w-4 h-4 mr-2"
              />
              {{ item.label }}
            </Button>
          </template>
        </div>
      </div>

      <!-- 右侧内容区域 -->
      <div class="right w-0 flex flex-col items-center flex-grow pr-1">
        <div
          class="flex flex-col gap-y-6 w-full overflow-y-auto overflow-x-hidden px-4 py-8"
        >
          <template v-if="currentPageConfig?.id === 'about'">
            <div class="flex py-5 items-center justify-center gap-4">
              <img src="/logo.png" alt="Next Outliner" class="w-16" />
              <div class="flex flex-col">
                <h2 class="text-xl font-semibold">Next Outliner 3</h2>
                <p class="text-muted-foreground">by Krisxin</p>
              </div>
            </div>
          </template>
          <template v-else-if="visiblePageConfig">
            <div
              v-for="group in visiblePageConfig.groups"
              :key="group.id"
              class="flex flex-col gap-4"
            >
              <!-- 分组标题 -->
              <h3 class="text-lg font-semibold mb-2">{{ group.title }}</h3>
              <!-- 分组描述 -->
              <p
                v-if="group.description"
                class="text-sm text-muted-foreground mt-[-.5em] mb-2 whitespace-pre-wrap"
              >
                {{ group.description }}
              </p>

              <!-- 设置项 -->
              <div
                v-for="setting in group.settings"
                :key="setting.id"
                class="flex flex-col"
              >
                <Label
                  v-if="setting.type !== 'custom' || !setting.noLabel"
                  class="mb-2"
                  >{{ setting.label }}</Label
                >
                <Label
                  class="text-[.8em] text-muted-foreground mb-2 whitespace-pre-wrap"
                  v-if="setting.description"
                >
                  {{ setting.description }}
                </Label>

                <!-- 根据设置类型渲染不同的组件 -->
                <!-- Toggle 开关 -->
                <SwitchComp
                  v-if="setting.type === 'toggle'"
                  :setting="setting"
                />

                <!-- 单选下拉 -->
                <SelectComp
                  v-else-if="setting.type === 'single-select'"
                  :setting="setting"
                />

                <!-- 多选 -->
                <MultiSelectComp
                  v-else-if="setting.type === 'multi-select'"
                  :setting="setting"
                />

                <!-- 输入框 -->
                <TextInputComp
                  v-else-if="setting.type === 'input'"
                  :setting="setting"
                />

                <!-- 数字输入 -->
                <NumberInputComp
                  v-else-if="setting.type === 'number'"
                  :setting="setting"
                />

                <!-- 字体选择 -->
                <FontSelectorComp
                  v-else-if="setting.type === 'font'"
                  :setting="setting"
                />

                <!-- 自定义渲染 -->
                <component
                  v-else-if="setting.type === 'custom'"
                  :is="setting.render(renderContext)"
                />
              </div>
            </div>
          </template>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { useSettings } from "@/composables";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { computed } from "vue";

import SwitchComp from "./comps/SwitchComp.vue";
import SelectComp from "./comps/SelectComp.vue";
import MultiSelectComp from "./comps/MultiSelectComp.vue";
import TextInputComp from "./comps/TextInputComp.vue";
import NumberInputComp from "./comps/NumberInputComp.vue";
import FontSelectorComp from "./comps/FontSelectorComp.vue";

const {
  visible,
  currentPage,
  currentPageConfig,
  sidebarSections,
  settings,
  evaluateCondition,
  getSetting,
  saveSetting,
  resetSetting,
} = useSettings();

// 创建渲染上下文
const renderContext = computed(() => ({
  settings,
  getSetting,
  saveSetting,
  resetSetting,
}));

// 计算当前应该显示的分组和设置项
const visiblePageConfig = computed(() => {
  if (!currentPageConfig.value) return null;

  return {
    ...currentPageConfig.value,
    groups: currentPageConfig.value.groups
      .map((group) => ({
        ...group,
        settings: group.settings.filter((setting) =>
          evaluateCondition(setting.condition, settings)
        ),
      }))
      .filter((group) => group.settings.length > 0), // 过滤掉没有可见设置项的分组
  };
});

// 处理对话框开关状态变化
const handleOpenChange = (open: boolean) => {
  if (!open) {
    visible.value = false;
  }
};
</script>
