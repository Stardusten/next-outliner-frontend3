<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="outline" class="flex-grow" @click="resetWizard()">
        <Plus />
        {{ $t("repoWizard.addRepo") }}
      </Button>
    </DialogTrigger>

    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ $t("repoWizard.addRepo") }}</DialogTitle>
        <DialogDescription>
          {{ $t(`repoWizard.steps.${currentStep}`) }} ({{ currentStep }}/{{
            totalSteps
          }})
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4 py-4" @submit="wizard.handleSubmit">
        <WizardStepBasicInfo
          v-show="currentStep === 1"
          :wizard="wizard"
          :repo-configs="repoConfigs"
        />
        <WizardStepPersistence v-show="currentStep === 2" :wizard="wizard" />
        <WizardStepAttachment v-show="currentStep === 3" :wizard="wizard" />
      </form>

      <DialogFooter>
        <div class="flex justify-between w-full">
          <div class="flex gap-2">
            <Button
              v-if="currentStep > 1"
              variant="outline"
              @click="previousStep()"
            >
              {{ $t("repoWizard.prevStep") }}
            </Button>

            <Button variant="outline">
              <Code />
              {{ $t("repoWizard.importFromJson") }}
            </Button>
          </div>

          <div class="flex gap-2">
            <DialogClose as-child>
              <Button variant="outline">{{ $t("repoWizard.cancel") }}</Button>
            </DialogClose>
            <Button
              v-if="currentStep < totalSteps"
              @click="nextStep()"
              :disabled="!canProceedToNext"
            >
              {{ $t("repoWizard.nextStep") }}
            </Button>
            <DialogClose as-child>
              <Button
                v-if="currentStep === totalSteps"
                :disabled="!canFinish"
                @click="handleFinish()"
              >
                {{ $t("repoWizard.complete") }}
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { useRepoConfigs } from "@/composables/useRepoConfigs";
import type { useRepoWizard } from "@/composables/useRepoWizard";
import { Code, Plus } from "lucide-vue-next";
import { ref } from "vue";
import WizardStepAttachment from "./WizardStepAttachment.vue";
import WizardStepBasicInfo from "./WizardStepBasicInfo.vue";
import WizardStepPersistence from "./WizardStepPersistence.vue";

const props = defineProps<{
  wizard: ReturnType<typeof useRepoWizard>;
  repoConfigs: ReturnType<typeof useRepoConfigs>;
}>();
const { repoConfigs } = props;
const open = ref(false);

const {
  currentStep,
  totalSteps,
  canProceedToNext,
  canFinish,
  form,
  nextStep,
  previousStep,
  resetWizard,
  handleSubmit,
} = props.wizard;

const handleFinish = async () => {
  const res = await form.validate();
  if (res.valid) {
    handleSubmit();
    open.value = false;
  }
};
</script>
