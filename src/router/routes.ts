import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/IndexPage.vue') }],
  },
  {
    path: '/scan',
    component: () => import('pages/ScanPage.vue'),
  },
  {
    path: '/receive',
    component: () => import('pages/ReceivePage.vue'),
  },
  {
    path: '/send',
    component: () => import('pages/SendPage.vue'),
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
