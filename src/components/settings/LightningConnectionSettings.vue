<template>
  <SettingsSection
    icon="wallet"
    label="Lightning"
    caption="Connect wallet"
    compact
    data-testid="settings-bitcoin-wallet-section"
  >
    <div class="settings-inline-grid settings-inline-grid--center">
      <div class="settings-inline-grid__main">
        <div class="connection-status">
          <q-icon
            :name="connectedProvider ? 'check_circle' : 'radio_button_unchecked'"
            :class="connectedProvider ? 'text-positive' : 'settings-disconnected-icon'"
            size="md"
            class="connection-status__icon"
          />
          <div>
            <div class="settings-subtitle">
              {{ connectedProvider ? 'Connected' : 'Not Connected' }}
            </div>
            <div class="settings-caption settings-muted" v-if="connectedProvider">
              {{ connectedProvider }}
            </div>
            <div class="settings-caption settings-muted" v-else>
              Connect to send and receive payments via Lightning
            </div>
          </div>
        </div>
      </div>

      <div class="settings-inline-grid__side settings-inline-grid__side--end">
        <q-btn
          :label="connectedProvider ? 'Change' : 'Connect'"
          :icon="connectedProvider ? 'swap_horiz' : 'link'"
          :color="connectedProvider ? 'secondary' : 'primary'"
          no-caps
          unelevated
          class="settings-action-btn"
          @click="configureBitcoinConnect"
          :flat="!!connectedProvider"
          :outline="!!connectedProvider"
          data-testid="settings-bitcoin-connect-btn"
        />
      </div>
    </div>
  </SettingsSection>
</template>

<script setup lang="ts">
defineOptions({
  name: 'LightningConnectionSettings',
})

import { ref } from 'vue'
import SettingsSection from 'src/components/settings/SettingsSection.vue'
import {
  getConnectorConfig,
  launchModal,
  onConnected,
  onDisconnected,
} from '@getalby/bitcoin-connect'

const connectedProvider = ref('')

function updateConnectedProvider() {
  const config = getConnectorConfig()
  connectedProvider.value = config?.connectorName ?? ''
}

onDisconnected(() => {
  updateConnectedProvider()
})

onConnected(() => {
  updateConnectedProvider()
})

function configureBitcoinConnect() {
  launchModal()
}
</script>
