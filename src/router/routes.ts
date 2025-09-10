import type { RouteQuery, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/index.vue') }],
  },
  {
    path: '/scan',
    component: () => import('pages/scan.vue'),
  },
  {
    path: '/receive',
    component: () => import('pages/receive.vue'),
  },
  {
    path: '/receive-ecash',
    component: () => import('pages/receive-ecash.vue'),
  },
  {
    path: '/received-lightning',
    name: 'received-lightning',
    component: () => import('pages/received-lightning.vue'),
  },
  {
    path: '/sent-lightning',
    name: 'sent-lightning',
    component: () => import('pages/sent-lightning.vue'),
  },
  {
    path: '/send',
    name: 'send' as keyof RouteQuery,
    component: () => import('pages/send.vue'),
  },

  {
    path: '/settings',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/settings/index.vue') }],
  },

  {
    path: '/federations',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/federations/index.vue') }],
  },
  {
    path: '/federation/:id',
    name: 'federation-details',
    component: () => import('pages/federation/[id].vue'),
  },
  {
    path: '/transaction/:id',
    name: 'transaction-details',
    component: () => import('pages/transaction/[id].vue'),
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
