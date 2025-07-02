import { createRouter, createWebHistory } from "vue-router";
import SwitchRepoView from "@/views/SwitchRepoView.vue";
import EditRepoView from "@/views/EditRepoView.vue";

const routes = [
  {
    path: "/",
    redirect: "/switch-repo",
  },
  {
    path: "/switch-repo",
    name: "SwitchRepo",
    component: SwitchRepoView,
  },
  {
    path: "/edit/:repoId",
    name: "EditRepo",
    component: EditRepoView,
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
