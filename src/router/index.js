import { createRouter, createWebHistory } from "vue-router"
import Chat from "../components/Chat.vue"
import Login from "../components/Login.vue"
import ChatWithSidebar from "../components/ChatWithSidebar.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "login",
      component: Login
    }, {
      path: "/chat/",
      name: "chat",
      component: Chat,
      beforeEnter: (to, from, next) => {
        if (from.name === "login") {
          next()
        } else {
          next({ name: "login" })
        }
      },
    }, {
      path: "/chat-with-sidebar/",
      name: "chat-with-sidebar",
      component: ChatWithSidebar,
      beforeEnter: (to, from, next) => {
        if (from.name === "login") {
          next()
        } else {
          next({ name: "login" })
        }
      },
    }
  ],
})

export default router