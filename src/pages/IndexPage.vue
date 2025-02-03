<template>
  <q-page class="row items-center justify-evenly">
    <q-dialog
      v-model="showSettingsOverlay"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      class="full-width-dialog"
    >
      <SettingsPage @close="showSettingsOverlay = false" />
    </q-dialog>

    <div class="fixed-bottom-bar row no-wrap justify-between">
      <div class="button-container">
        <q-btn stack icon="home" label="Home" class="small-label" />
      </div>
      <div class="button-container">
        <q-btn stack icon="account_balance" label="Federations" class="small-label" />
      </div>
      <div class="button-container">
        <q-btn
          stack
          icon="settings"
          label="Settings"
          class="small-label"
          @click="showSettingsOverlay = true"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SettingsPage from 'components/SettingsPage.vue'

const showSettingsOverlay = ref(false)
</script>

<style scoped>
.fixed-bottom-bar {
  position: fixed;
  bottom: 0;
  width: 100%;
  border-top: 1px solid #ccc;
  padding: 5px;
  display: flex;
  align-items: center;
}

.button-container {
  flex: 1;
  display: flex;
  justify-content: center;
}

/* Target the q-btn that has the .small-label class */
.q-btn.small-label .q-btn__content .q-btn__label {
  font-size: 0.75rem !important;
  text-align: center;
}

.full-width-dialog .q-dialog__inner {
  width: 100vw;
  max-width: 100vw;
  margin: 0;
}
</style>
