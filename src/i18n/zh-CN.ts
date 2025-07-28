export const zhCN_messages = {
  repoNotFound: "糟糕！没有找到 ID 为 {id} 的知识库",
  backToSwitchRepo: "返回知识库列表",
  commands: {
    toSearchBlock: {
      searchBlockCannotHaveChildren: "搜索块不能有子块",
      alreadySearchBlock: "当前块已经是搜索块了",
      onlyTextBlockCanBeSearchBlock: "只有文本块可以被转换为搜索块",
    },
  },
  blockContextMenu: {
    delete: "删除块",
    copyBlockRef: "复制块引用",
  },
  listItem: {
    editSearchQuery: "编辑查询表达式",
    editViewOptions: "视图选项",
    invalidQuery: "无效的查询表达式",
    nResults: "{n} 条结果",
    refCounterTooltip: "{n} 个块引用了此块",
    tagCounterTooltip: "{n} 个块打了此标签",
    refreshSearch: "重新搜索",
    bulletTooltip: "右键打开块菜单",
  },
  editSearchQueryPopup: {
    queryLabel: "编辑查询表达式",
    queryPlaceholder: "输入查询表达式...",
    cancel: "取消",
    save: "保存",
  },
  quickadd: {
    tooltip: "快速添加",
    title: "快速添加",
    save: "保存",
    cancel: "取消",
    selectPlaceholder: "选择放置位置，默认放到根块末尾",
  },
  search: {
    tooltip: "搜索",
  },
  moremenu: {
    tooltip: "更多选项",
    theme: "主题",
    lineSpace: "行间距",
  },
  repoConfig: {
    titleCannotBeEmpty: "知识库标题不能为空",
    idCannotBeEmpty: "知识库 ID 不能为空",
    attachment: {
      r2: {
        endpointCannotBeEmpty: "R2 存储服务地址不能为空",
        bucketCannotBeEmpty: "R2 存储桶名不能为空",
        accessKeyIdCannotBeEmpty: "R2 存储 Access Key ID 不能为空",
        secretAccessKeyCannotBeEmpty: "R2 存储 Secret Access Key 不能为空",
      },
      invalidAttachmentStorageType: "无效的附件存储方式",
    },
    persistence: {
      invalidPersistenceType: "无效的块存储方式",
    },
  },
  repoWizard: {
    repoTitleAlreadyUsed: "存在已打开的同名知识库",
    steps: {
      1: "设置知识库基本信息",
      2: "设置块存储方式",
      3: "设置附件存储方式",
    },
    idDesc:
      "知识库 ID 是知识库的唯一标识。如果希望创建新知识库，你可以保持自动生成的 ID 不变。但如果你希望使用块存储中已经存在的知识库，请正确输入其 ID。",
    addRepo: "添加知识库",
    prevStep: "上一步",
    nextStep: "下一步",
    cancel: "取消",
    importFromJson: "从 JSON 导入",
    complete: "完成",
    existStatus: {
      valid: "检测到 {persistenceType} 中已经存在 ID 为 {id} 的知识库",
      notFound:
        "{persistenceType} 中不存在 ID 为 {id} 的知识库，将创建一个新的知识库",
      corrupted:
        "{persistenceType} 中存在 ID 为 {id} 的知识库，但数据损坏，将创建一个新的知识库",
    },
  },
  repoList: {
    noRepo: "暂无知识库",
    clickToAddRepo: "点击下方按钮添加一个知识库",
    openRepo: "打开知识库",
    deleteRepo: "删除知识库",
  },
  settings: {
    repo: {
      basicInfo: {
        repoName: "知识库名称",
        repoId: "知识库 ID",
        exportAsJson: "导出知识库配置",
        switchRepo: "切换知识库",
      },
    },
  },
  attachmentMgr: {
    tooltip: "附件管理",
  },
};
