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

    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" bordered>
      <q-list>
        <q-item-label header> Federations </q-item-label>
        <FederationList />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="text-white footer-container ios-safe-area dark-bg">
      <q-toolbar class="dark-bg">
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />
        <q-btn
          stack
          flat
          icon="home"
          icon-color="primary"
          label="Home"
          class="small-label button-container text-primary"
        />

        <q-btn
          stack
          flat
          icon="account_balance"
          label="Federations"
          class="small-label button-container"
          @click="showAddFederationOverlay = true"
        />

        <q-btn
          stack
          flat
          icon="settings"
          label="Settings"
          class="small-label button-container"
          @click="showSettingsOverlay = true"
        />
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FederationList from 'components/FederationList.vue'
import SettingsPage from 'src/pages/SettingsPage.vue'
import AddFederationPage from 'src/pages/AddFederationPage.vue'
const showSettingsOverlay = ref(false)
const showAddFederationOverlay = ref(false)
const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
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
