<template>
  <SettingsSection
    icon="wallet"
    label="Lightning"
    caption="Connect wallet"
    :status="connectionStatusLabel"
    :status-tone="connectionStatusTone"
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
          :loading="isConfiguring"
          :disable="isConfiguring"
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

import { computed, onMounted, onUnmounted, ref } from 'vue'
import SettingsSection from 'src/components/settings/SettingsSection.vue'
import { initBitcoinConnect } from 'src/services/bitcoinConnect'
import { logger } from 'src/services/logger'
import { getErrorMessage } from 'src/utils/error'

const connectedProvider = ref('')
const isConfiguring = ref(false)
const hasConnectedProvider = computed(() => connectedProvider.value !== '')
const connectionStatusLabel = computed(() =>
  hasConnectedProvider.value ? 'Connected' : 'Not connected',
)
const connectionStatusTone = computed(() => (hasConnectedProvider.value ? 'positive' : 'neutral'))
const unsubscribeListeners: Array<() => void> = []
let isUnmounted = false

function updateConnectedProvider(
  getConnectorConfig: () => { connectorName?: string | undefined } | undefined,
) {
  const config = getConnectorConfig()
  connectedProvider.value = config?.connectorName ?? ''
}

onMounted(() => {
  isUnmounted = false
  initBitcoinConnect()
    .then(({ getConnectorConfig, onConnected, onDisconnected }) => {
      if (isUnmounted) {
        return
      }

      updateConnectedProvider(getConnectorConfig)
      const unsubscribeDisconnected = onDisconnected(() => {
        updateConnectedProvider(getConnectorConfig)
      })
      const unsubscribeConnected = onConnected(() => {
        updateConnectedProvider(getConnectorConfig)
      })

      if (isUnmounted) {
        unsubscribeDisconnected()
        unsubscribeConnected()
        return
      }

      unsubscribeListeners.push(unsubscribeDisconnected, unsubscribeConnected)
    })
    .catch((error: unknown) => {
      logger.warn('Failed to initialize Bitcoin Connect settings', {
        error: getErrorMessage(error),
      })
    })
})

onUnmounted(() => {
  isUnmounted = true
  for (const unsubscribe of unsubscribeListeners) {
    unsubscribe()
  }
  unsubscribeListeners.length = 0
})

function setConfiguring(value: boolean) {
  isConfiguring.value = value
}

async function configureBitcoinConnect() {
  if (isConfiguring.value) {
    return
  }

  setConfiguring(true)
  try {
    const { launchModal } = await initBitcoinConnect()
    launchModal()
  } catch (error) {
    logger.warn('Failed to launch Bitcoin Connect settings modal', {
      error: getErrorMessage(error),
    })
  } finally {
    setConfiguring(false)
  }
}
</script>
