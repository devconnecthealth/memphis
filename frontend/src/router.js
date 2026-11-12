import { createRouter, createWebHistory } from 'vue-router'
import ListaHawbs from './views/ListaHawbs.vue'
import DetalheHawb from './views/DetalheHawb.vue'
import Login from './views/Login.vue'
import { token } from './supabase.js'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login, meta: { publica: true } },
    { path: '/', component: ListaHawbs },
    { path: '/hawb/:id', component: DetalheHawb, props: true },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.publica) return true
  return (await token()) ? true : '/login'
})

export default router
