<template>
  <q-layout view="hHh lpR fFf">
    <q-dialog
      v-model="showSettingsOverlay"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <SettingsPage @close="showSettingsOverlay = false" />
    </q-dialog>

    <q-dialog
      v-model="showAddFederationOverlay"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <AddFederationPage @close="showAddFederationOverlay = false" />
    </q-dialog>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="text-white footer-container ios-safe-area dark-bg">
      <q-toolbar class="dark-bg">
        <q-btn
          stack
          flat
          icon="home"
          :color="isHomeActive ? 'primary' : 'white'"
          label="Home"
          class="small-label button-container text-primary"
          :to="'/'"
        />

        <q-btn
          stack
          flat
          icon="account_balance"
          :color="isFederationsActive ? 'primary' : 'white'"
          label="Federations"
          class="small-label button-container"
          :to="'/federations'"
        />

        <q-btn
          stack
          flat
          icon="settings"
          :color="isSettingsActive ? 'primary' : 'white'"
          label="Settings"
          class="small-label button-container"
          :to="'/settings'"
        />
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import SettingsPage from 'src/pages/SettingsPage.vue'
import AddFederationPage from 'src/pages/AddFederationPage.vue'
const showSettingsOverlay = ref(false)
const showAddFederationOverlay = ref(false)

const route = useRoute()

const isHomeActive = computed(() => route.path === '/')
const isFederationsActive = computed(() => route.path === '/federations')
const isSettingsActive = computed(() => route.path === '/settings')
</script>

<style scoped>
.button-container {
  flex: 1;
  display: flex;
  justify-content: center;
}

/* Added rules to ensure proper styling in Firefox */
::v-deep .q-btn.small-label .q-btn__content .q-btn__label {
  font-size: 0.5rem !important;
  text-align: center;
}

.dark-bg {
  background-color: #202020;
}

.footer-container {
  padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
  height: auto;
  min-height: 60px;
  /* Ensure content doesn't overflow into safe area */
  margin-bottom: constant(safe-area-inset-bottom); /* iOS 11.0 */
  margin-bottom: env(safe-area-inset-bottom); /* iOS 11.2+ */
}

.ios-safe-area {
  /* Ensure the entire footer respects the safe area */
  padding-bottom: max(15px, env(safe-area-inset-bottom));
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
</style>
