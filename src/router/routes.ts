import type { RouteQuery, RouteRecordRaw } from 'vue-router'

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
    path: '/received-lightning',
    name: 'received-lightning',
    component: () => import('pages/ReceivedLightningSuccessPage.vue'),
  },
  {
    path: '/sent-lightning',
    name: 'sent-lightning',
    component: () => import('pages/SentLightningSuccessPage.vue'),
  },
  {
    path: '/send',
    name: 'send' as keyof RouteQuery,
    component: () => import('pages/SendPage.vue'),
  },

  {
    path: '/settings',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/SettingsPage.vue') }],
  },

  {
    path: '/federations',
    component: () => import('layouts/MainLayout.vue'),
    children: [{ path: '', component: () => import('pages/FederationsPage.vue') }],
  },
  {
    path: '/federation/:id',
    name: 'federation-details',
    component: () => import('pages/FederationDetailsPage.vue'),
  },
  {
    path: '/transaction/:id',
    name: 'transaction-details',
    component: () => import('pages/TransactionDetailsPage.vue'),
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
