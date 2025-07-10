export const zhCN_messages = {
  repoNotFound: "糟糕！没有找到 ID 为 {id} 的知识库",
  backToSwitchRepo: "返回知识库列表",
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
};
