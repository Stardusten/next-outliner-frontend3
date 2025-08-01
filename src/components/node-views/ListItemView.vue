<template>
  <NodeViewWrapper
    as="div"
    class="list-item-x relative leading-[24px] flex flex-wrap !outline-none ml-[calc(var(--level)*32px+36px)]"
    :style="{ '--level': node.attrs.level }"
    :data-level="node.attrs.level"
    :data-block-id="node.attrs.blockId"
    :data-folded="node.attrs.folded"
    :data-has-children="node.attrs.hasChildren"
    :data-type="node.attrs.type"
    :data-is-search-result-root="node.attrs.isSearchResultRoot"
  >
    <div
      class="list-item-left flex absolute height-[24px] left-[-32px] py-[5px] select-none"
      contenteditable="false"
    >
      <FoldBtn
        class="size-[14px] cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        :class="{
          invisible: !showFoldBtn,
          'rotate-270': node.attrs.folded, // 折叠时，折叠按钮旋转 -90 度
        }"
        @click.stop="handleClickFoldBtn"
      />

      <BlockContextMenu :block-id="node.attrs.blockId" :editor="editor">
        <Bullet
          v-if="bulletType === 'normal'"
          class="size-[14px] cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          :class="{
            // 折叠且有子块时，bullet 周围加一个背景色
            'bg-[var(--color-bullet-background-collapsed)] rounded-full':
              node.attrs.folded && node.attrs.hasChildren,
            // 搜索块的 bullet 加一个虚线边框
            'border-dashed border-[1px] rounded-full border-[var(--color-bullet-dashed-border)]':
              node.attrs.isSearchResultRoot,
          }"
          @click.stop="handleClickBullet"
        />

        <Search
          v-else-if="bulletType === 'search'"
          class="size-[14px] cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        />
      </BlockContextMenu>
    </div>
    <!--
    min-w-[1px] 保证在没有内容时，也有一点宽度，能看到光标
    -->
    <NodeViewContent class="min-w-[1px] w-fit flex-0-0-auto" />
    <div
      class="list-item-right flex flex-1 flex-nowrap select-none"
      contenteditable="false"
    >
      <div class="cursor-text w-[8px]"></div>
      <div class="flex-0-0-auto flex items-center gap-1">
        <div v-if="queryStatus" :class="queryStatus.class">
          ({{ queryStatus.content }})
        </div>

        <!-- 编辑搜索查询 -->
        <EditSearchQueryPopup
          v-if="node.attrs.type === 'search'"
          :init-query="searchQuery"
          :on-submit="handleQueryUpdate"
        >
          <Button variant="secondary" size="2xs-icon">
            <Pencil class="size-[12px]" />
          </Button>
        </EditSearchQueryPopup>

        <Tooltip v-if="node.attrs.type === 'search'">
          <TooltipTrigger as-child>
            <Button variant="secondary" size="2xs-icon">
              <Settings2 class="size-[12px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ $t("listItem.editViewOptions") }}
          </TooltipContent>
        </Tooltip>

        <Tooltip v-if="node.attrs.type === 'search'">
          <TooltipTrigger as-child>
            <Button variant="secondary" size="2xs-icon">
              <RefreshCcw class="size-[12px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {{ $t("listItem.refreshSearch") }}
          </TooltipContent>
        </Tooltip>

        <Tooltip v-if="refCounter > 0">
          <TooltipTrigger as-child>
            <div
              class="rounded-md cursor-pointer border-1 text-xs min-w-[16px] text-center"
            >
              {{ refCounter }}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {{ $t("listItem.refCounterTooltip", { n: refCounter }) }}
          </TooltipContent>
        </Tooltip>

        <Tooltip v-if="tagCounter > 0">
          <TooltipTrigger as-child>
            <div
              class="rounded-md cursor-pointer border-1 text-xs px-[4px] text-center"
            >
              {{ tagCounter }}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {{ $t("listItem.tagCounterTooltip", { n: tagCounter }) }}
          </TooltipContent>
        </Tooltip>
      </div>
      <div
        class="flex-1 cursor-text"
        @click.prevent="handleClickRightPad"
      ></div>
    </div>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { getInRefs, getInTags } from "@/lib/app/index/in-refs";
import type { Observable } from "@/lib/common/observable";
import type { BlockId } from "@/lib/common/types";
import {
  toggleFocusedFoldState,
  updateSearchQuery,
} from "@/lib/views/tiptap-editor/commands";
import { TextSelection } from "@tiptap/pm/state";
import { NodeViewContent, nodeViewProps } from "@tiptap/vue-3";
import { Pencil, RefreshCcw, Settings2 } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import BlockContextMenu from "../BlockContextMenu.vue";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import Bullet from "./Bullet.vue";
import EditSearchQueryPopup from "./EditSearchQueryPopup.vue";
import FoldBtn from "./FoldBtn.vue";
import { NodeViewWrapper } from "./NodeViewWrapper";
import Search from "./Search.vue";

const { node, editor, getPos } = defineProps(nodeViewProps);
const { t } = useI18n();

const bulletType = computed(() => {
  if (node.attrs.type === "search") return "search";
  return "normal";
});

const showFoldBtn = computed(() => {
  // 搜索块总是显示折叠按钮
  if (node.attrs.type === "search") return true;
  return node.attrs.hasChildren; // 其他块如果没有孩子，就不显示
});

const searchQuery = computed(() => {
  if (node.attrs.type !== "search") return "";
  return node.firstChild?.attrs.query ?? "";
});

const queryStatus = computed(() => {
  if (node.attrs.type !== "search") return undefined;
  const status = node.firstChild?.attrs.status;
  if (!status && typeof status !== "number") return undefined;
  if (status === "invalid")
    return { content: t("listItem.invalidQuery"), class: "text-destructive" };
  return {
    content: t("listItem.nResults", { n: status }),
    class: "text-muted-foreground",
  };
});

const refCounter = ref(0);
const tagCounter = ref(0);
let inRefs: Observable<Set<BlockId>> | null = null;
let inTags: Observable<Set<BlockId>> | null = null;

onMounted(() => {
  inRefs = getInRefs(editor.appView.app, node.attrs.blockId);
  inRefs.subscribe(
    (inRefsVal) => {
      refCounter.value = inRefsVal.size;
    },
    { immediate: true }
  );

  inTags = getInTags(editor.appView.app, node.attrs.blockId);
  inTags.subscribe(
    (inTagsVal) => {
      tagCounter.value = inTagsVal.size;
    },
    { immediate: true }
  );
});

onUnmounted(() => inRefs?.dispose());

const handleClickRightPad = () => {
  const pos = getPos();
  if (pos === undefined) return;
  const tr = editor.view.state.tr;
  const $pos = editor.view.state.doc.resolve(pos + node.nodeSize);
  const end = TextSelection.findFrom($pos, -1);
  if (!end) return;
  tr.setSelection(end);
  editor.view.dispatch(tr);
};

const handleClickBullet = () => {
  editor.appView.setRootBlockIds([node.attrs.blockId]);
};

const handleClickFoldBtn = () => {
  const cmd = toggleFocusedFoldState(editor, undefined, node.attrs.blockId);
  editor.appView.execCommand(cmd, true);
};

const handleQueryUpdate = (newQuery: string) => {
  const cmd = updateSearchQuery(editor, newQuery, node.attrs.blockId);
  editor.appView.execCommand(cmd, true);
};
</script>

<style>
.spacing-compact div.list-item-x {
  padding: 1px 0;
  line-height: 24px;
}

.spacing-normal div.list-item-x {
  padding: 2px 0;
  line-height: 24px;
}

.spacing-loose div.list-item-x {
  padding: 4px 0;
  line-height: 24px;
}

/* 链接样式 */
a {
  color: var(--color-link);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}

div.list-item-x[data-level="0"] {
  /** 这一部分 shadow 用于遮掉选区，下同 */
  box-shadow: calc(-11px - 1 * 32px) 0px 0px var(--color-background);
}

div.list-item-x[data-level="1"] {
  box-shadow:
    calc(-11px - 1 * 32px) 0px 0px var(--color-background),
    calc(-12px - 1 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 2 * 32px) 0px 0px var(--color-background);
}

div.list-item-x[data-level="2"] {
  box-shadow:
    calc(-11px - 1 * 32px) 0px 0px var(--color-background),
    calc(-12px - 1 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 2 * 32px) 0px 0px var(--color-background),
    calc(-12px - 2 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 3 * 32px) 0px 0px var(--color-background);
}

div.list-item-x[data-level="3"] {
  box-shadow:
    calc(-11px - 1 * 32px) 0px 0px var(--color-background),
    calc(-12px - 1 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 2 * 32px) 0px 0px var(--color-background),
    calc(-12px - 2 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 3 * 32px) 0px 0px var(--color-background),
    calc(-12px - 3 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 4 * 32px) 0px 0px var(--color-background);
}

div.list-item-x[data-level="4"] {
  box-shadow:
    calc(-11px - 1 * 32px) 0px 0px var(--color-background),
    calc(-12px - 1 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 2 * 32px) 0px 0px var(--color-background),
    calc(-12px - 2 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 3 * 32px) 0px 0px var(--color-background),
    calc(-12px - 3 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 4 * 32px) 0px 0px var(--color-background),
    calc(-12px - 4 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 5 * 32px) 0px 0px var(--color-background);
}

div.list-item-x[data-level="5"] {
  box-shadow:
    calc(-11px - 1 * 32px) 0px 0px var(--color-background),
    calc(-12px - 1 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 2 * 32px) 0px 0px var(--color-background),
    calc(-12px - 2 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 3 * 32px) 0px 0px var(--color-background),
    calc(-12px - 3 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 4 * 32px) 0px 0px var(--color-background),
    calc(-12px - 4 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 5 * 32px) 0px 0px var(--color-background),
    calc(-12px - 5 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 6 * 32px) 0px 0px var(--color-background);
}

div.list-item-x[data-level="6"] {
  box-shadow:
    calc(-11px - 1 * 32px) 0px 0px var(--color-background),
    calc(-12px - 1 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 2 * 32px) 0px 0px var(--color-background),
    calc(-12px - 2 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 3 * 32px) 0px 0px var(--color-background),
    calc(-12px - 3 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 4 * 32px) 0px 0px var(--color-background),
    calc(-12px - 4 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 5 * 32px) 0px 0px var(--color-background),
    calc(-12px - 5 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 6 * 32px) 0px 0px var(--color-background),
    calc(-12px - 6 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 7 * 32px) 0px 0px var(--color-background);
}

div.list-item-x[data-level="7"] {
  box-shadow:
    calc(-11px - 1 * 32px) 0px 0px var(--color-background),
    calc(-12px - 1 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 2 * 32px) 0px 0px var(--color-background),
    calc(-12px - 2 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 3 * 32px) 0px 0px var(--color-background),
    calc(-12px - 3 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 4 * 32px) 0px 0px var(--color-background),
    calc(-12px - 4 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 5 * 32px) 0px 0px var(--color-background),
    calc(-12px - 5 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 6 * 32px) 0px 0px var(--color-background),
    calc(-12px - 6 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 7 * 32px) 0px 0px var(--color-background),
    calc(-12px - 7 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 8 * 32px) 0px 0px var(--color-background);
}

div.list-item-x[data-level="8"] {
  box-shadow:
    calc(-11px - 1 * 32px) 0px 0px var(--color-background),
    calc(-12px - 1 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 2 * 32px) 0px 0px var(--color-background),
    calc(-12px - 2 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 3 * 32px) 0px 0px var(--color-background),
    calc(-12px - 3 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 4 * 32px) 0px 0px var(--color-background),
    calc(-12px - 4 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 5 * 32px) 0px 0px var(--color-background),
    calc(-12px - 5 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 6 * 32px) 0px 0px var(--color-background),
    calc(-12px - 6 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 7 * 32px) 0px 0px var(--color-background),
    calc(-12px - 7 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 8 * 32px) 0px 0px var(--color-background),
    calc(-12px - 8 * 32px) 0px 0px var(--color-guide-line),
    calc(-11px - 9 * 32px) 0px 0px var(--color-background);
}
</style>
