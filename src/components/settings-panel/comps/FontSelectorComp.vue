<template>
  <div class="flex items-center gap-2">
    <Select v-model="currentValue">
      <SelectTrigger class="w-[200px]">
        <span
          class="text-muted-foreground"
          :style="{ fontFamily: currFontName }"
        >
          {{ currFontName }}
        </span>
      </SelectTrigger>
      <SelectContent
        class="max-h-[var(--reka-select-content-available-height)]"
      >
        <SelectGroup>
          <SelectItem
            v-for="(font, index) in FONT_NAMES"
            :key="index"
            :value="font"
            :style="{ fontFamily: font }"
          >
            <div class="flex items-center">
              <div>{{ font }}</div>
              <div
                v-if="!fontAvailability[index]"
                class="text-muted-foreground ml-2"
              >
                不可用
              </div>
            </div>
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>

    <Tooltip>
      <TooltipTrigger as-child>
        <Button variant="ghost" size="xs-icon" @click="openAddFontDialog">
          <Plus class="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent> 添加自定义字体 </TooltipContent>
    </Tooltip>

    <ResetButton :setting="setting" />

    <Dialog :open="showAddFontDialog" @update:open="showAddFontDialog = $event">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>添加自定义字体</DialogTitle>
          <DialogDescription> 输入您系统中已安装的字体名称 </DialogDescription>
        </DialogHeader>
        <div>
          <div class="mt-2">
            <div
              v-if="isCustomFontAvailable"
              class="flex items-center gap-2 text-green-500 text-sm mb-3"
            >
              <CircleCheck class="size-4" />
              <span>字体已安装</span>
            </div>
            <div
              v-else
              class="flex items-center gap-2 text-yellow-500 text-sm mb-3"
            >
              <AlertTriangle class="size-4" />
              <span>字体未安装</span>
            </div>

            <div
              v-if="customFontName"
              class="text-base mb-4 p-3 border rounded"
              :style="{ fontFamily: customFontName }"
            >
              AbCdEfGh 中文字体 あいうえお ÀàÈèÙù
            </div>
          </div>

          <Input
            v-model="customFontName"
            placeholder="请输入字体名称"
            @input="checkCustomFont"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showAddFontDialog = false">
            取消
          </Button>
          <Button @click="addCustomFont" :disabled="!customFontName">
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useSettings } from "@/composables";
import type { FontSetting } from "@/composables/useSettings";
import { checkFontAvailability, COMMON_FONTS } from "@/lib/common/font-utils";
import ResetButton from "./ResetButton.vue";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectGroup,
} from "../../ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { Button } from "../../ui/button";
import { Plus, AlertTriangle, CircleCheck } from "lucide-vue-next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";

const props = defineProps<{
  setting: FontSetting;
}>();

const settings = useSettings();

// 创建响应式的设置值
const currentValue = computed({
  get: () =>
    settings.getSetting(props.setting.storageKey) ?? props.setting.defaultValue,
  set: (value: string) => settings.saveSetting(props.setting.storageKey, value),
});

// 当前字体名称显示
const currFontName = computed(() => {
  const value = currentValue.value;
  if (!value || value.trim().length === 0) {
    return "未指定";
  }
  return value;
});

// 扩展字体列表，包含常用字体和更多选项
const FONT_NAMES = [
  ...COMMON_FONTS,
  // 系统常见字体
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Georgia",
  "Impact",
  "Palatino Linotype",
  "Century Gothic",
  "Gill Sans",
  "Lucida Sans Unicode",
  "Lucida Console",
  "Comic Sans MS",
  "Arial Black",
  "Garamond",
  "Franklin Gothic Medium",
  "Book Antiqua",
  "Calibri",
  "Cambria",
  "Candara",
  "Consolas",
  "Constantia",
  "Corbel",
  "Segoe UI",

  // Google Fonts
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Source Sans Pro",
  "Poppins",
  "Raleway",
  "Merriweather",
  "Nunito",
  "Playfair Display",
  "Ubuntu",
  "Noto Sans",
  "Oswald",
  "PT Sans",
  "PT Serif",
  "Work Sans",
  "Inconsolata",

  // 中文字体
  "Microsoft YaHei",
  "SimSun",
  "SimHei",
  "FangSong",
  "NSimSun",
  "STXihei",
  "STKaiti",
  "STSong",
  "STZhongsong",
  "Source Han Sans",
  "Source Han Serif",

  // 特殊用途字体
  "Monospace",
  "Cursive",
];

// 去重
const uniqueFontNames = [...new Set(FONT_NAMES)];
const fontAvailability = checkFontAvailability(uniqueFontNames);

const showAddFontDialog = ref(false);
const customFontName = ref("");
const isCustomFontAvailable = ref(false);

const openAddFontDialog = () => {
  showAddFontDialog.value = true;
  customFontName.value = "";
  isCustomFontAvailable.value = false;
};

const checkCustomFont = () => {
  if (customFontName.value) {
    const [isAvailable] = checkFontAvailability([customFontName.value]);
    isCustomFontAvailable.value = isAvailable;
  } else {
    isCustomFontAvailable.value = false;
  }
};

const addCustomFont = () => {
  if (customFontName.value) {
    // 将自定义字体添加到列表中（如果不存在）
    if (!uniqueFontNames.includes(customFontName.value)) {
      uniqueFontNames.push(customFontName.value);
    }
    // 设置为当前值
    currentValue.value = customFontName.value;
    showAddFontDialog.value = false;
  }
};
</script>
