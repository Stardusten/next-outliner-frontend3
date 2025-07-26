import { defineComponent, h } from "vue";

// 基于 @tiptap/vue-3 的 NodeViewWrapper 组件
// 1. 添加了 style 属性
// 2. 透传所有 data attributes
export const NodeViewWrapper = defineComponent({
  name: "NodeViewWrapper",

  props: {
    as: {
      type: String,
      default: "div",
    },
    style: {
      type: [Object, String],
      default: () => ({}),
    },
  },

  inject: ["onDragStart", "decorationClasses"],

  render() {
    // 合并内部固定样式和外部传入的 style
    const internalStyle = { whiteSpace: "normal" };

    // 处理 style 可能为字符串或对象
    const mergedStyle =
      typeof this.style === "string"
        ? this.style + "; white-space: normal;"
        : { ...internalStyle, ...this.style };

    // 透传所有 data- 属性
    const dataAttrs: Record<string, any> = {};
    for (const key in this.$attrs) {
      if (key.startsWith("data-")) {
        dataAttrs[key] = this.$attrs[key];
      }
    }

    return h(
      this.as,
      {
        // @ts-ignore
        class: this.decorationClasses,
        style: mergedStyle,
        "data-node-view-wrapper": "",
        // @ts-ignore (https://github.com/vuejs/vue-next/issues/3031)
        onDragstart: this.onDragStart,
        ...dataAttrs,
      },
      this.$slots.default?.()
    );
  },
});
