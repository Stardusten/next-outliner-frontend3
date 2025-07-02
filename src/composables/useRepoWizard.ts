import { ref, computed } from "vue";
import { nanoid } from "nanoid";
import { toTypedSchema } from "@vee-validate/zod";
import { repoConfigSchema } from "@/lib/repo/repo";
import { useForm } from "vee-validate";
import { useRepoConfigs } from "./useRepoConfigs";
import z from "zod";

export const useRepoWizard = () => {
  const totalSteps = 3;
  const currentStep = ref(1);
  const repoConfigs = useRepoConfigs();

  // 使用 refine 校验知识库标题是否已存在
  const refinedSchema = z.object({
    ...repoConfigSchema.shape,
    title: z.string().refine(
      (data) => {
        for (const config of repoConfigs.configs.value) {
          if (config.title === data) {
            return false;
          }
        }
        return true;
      },
      { message: "repoWizard.repoTitleAlreadyUsed" }
    ),
  });

  const formSchema = toTypedSchema(refinedSchema);
  const form = useForm({
    validationSchema: formSchema,
  });

  const canProceedToNext = computed(() => {
    const data = form.values;
    if (!data) return false;

    const {
      title: titleSchema,
      id: idSchema,
      persistence: persistenceSchema,
      attachment: attachmentSchema,
    } = refinedSchema.shape;
    switch (currentStep.value) {
      case 1:
        const titleRes = titleSchema.safeParse(data.title);
        const idRes = idSchema.safeParse(data.id);
        return titleRes.success && idRes.success;
      case 2:
        const persistenceRes = persistenceSchema.safeParse(data.persistence);
        return persistenceRes.success;
      case 3:
        const attachmentRes = attachmentSchema.safeParse(data.attachment);
        return attachmentRes.success;
      default:
        return false;
    }
  });

  const canFinish = computed(() => {
    const res = repoConfigSchema.safeParse(form.values);
    return res.success;
  });

  // 初始化向导
  const resetWizard = () => {
    currentStep.value = 1;
    form.resetForm();
    // 默认值
    form.setFieldValue("id", nanoid());
    form.setFieldValue("persistence.type", "local-storage");
    form.setFieldValue("attachment.type", "r2");
  };

  // 步骤导航
  const nextStep = () => {
    if (canProceedToNext.value && currentStep.value < totalSteps) {
      currentStep.value++;
    }
  };

  const previousStep = () => {
    if (currentStep.value > 1) {
      currentStep.value--;
    }
  };

  const handleSubmit = form.handleSubmit(repoConfigs.addConfig);

  return {
    // 状态
    currentStep,
    totalSteps,
    form,

    // 计算属性
    canProceedToNext,
    canFinish,

    // 方法
    resetWizard,
    nextStep,
    previousStep,
    handleSubmit,
  };
};
