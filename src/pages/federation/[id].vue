<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <transition
    appear
    enter-active-class="animated slideInLeft fast"
    leave-active-class="animated slideOutLeft fast"
    mode="out-in"
  >
    <q-page class="vipr-mobile-page federation-details-page">
      <div class="vipr-topbar federation-details-topbar">
        <q-btn
          flat
          round
          icon="arrow_back"
          :to="{ name: '/federations/' }"
          class="vipr-topbar__back federation-details-topbar__back"
          data-testid="federation-details-back-btn"
        />
      </div>

      <div class="federation-details-content q-px-md">
        <q-card flat class="federation-card federation-card--summary q-mb-md">
          <q-card-section class="summary-layout">
            <div class="summary-logo">
              <q-avatar size="78px" v-if="federation?.metadata?.federation_icon_url">
                <q-img
                  :src="federation?.metadata?.federation_icon_url"
                  loading="eager"
                  no-spinner
                  no-transition
                />
              </q-avatar>
              <template v-else>
                <q-avatar color="grey-3" text-color="grey-7" class="logo">
                  <q-icon name="account_balance" />
                </q-avatar>
              </template>
            </div>

            <div class="summary-body">
              <div class="summary-title-row">
                <div class="summary-title ellipsis">{{ federation?.title }}</div>
                <q-btn
                  v-if="observerUrl"
                  flat
                  round
                  dense
                  size="sm"
                  icon="open_in_new"
                  type="a"
                  :href="observerUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="summary-link"
                  data-testid="federation-details-observer-link"
                >
                  <q-tooltip>Open in Fedimint Observer</q-tooltip>
                </q-btn>
              </div>

              <div class="summary-currency text-grey">
                {{ federation?.metadata?.default_currency }}
              </div>

              <div class="summary-modules">
                <q-chip
                  v-for="module in federation?.modules"
                  :key="module.kind"
                  color="positive"
                  text-color="black"
                  size="sm"
                  class="q-mr-xs"
                >
                  {{ module.kind }}
                </q-chip>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat class="federation-card q-mb-md" v-if="inviteCode">
          <q-card-section class="vipr-qr-container">
            <div class="vipr-qr-surface">
              <qrcode-vue
                :value="inviteCode"
                level="M"
                render-as="svg"
                :size="0"
                class="vipr-qr-code"
              />
            </div>
          </q-card-section>

          <q-separator class="vipr-copy-separator" />
          <q-card-section class="vipr-copy-section">
            <div class="vipr-copy-label">Invite code</div>
            <div class="vipr-copy-row">
              <input
                class="vipr-copy-value"
                :title="inviteCode"
                :value="inviteCode"
                readonly
                data-testid="federation-details-invite-input"
                aria-label="Federation invite code"
              />
              <q-btn
                icon="content_copy"
                flat
                round
                @click="copyInviteCode"
                data-testid="federation-details-copy-invite-btn"
              />
              <q-btn
                icon="share"
                flat
                round
                @click="shareInviteCode"
                data-testid="federation-details-share-invite-btn"
              />
            </div>
          </q-card-section>
        </q-card>

        <FederationGuardians :guardians="federation?.guardians ?? []" class="q-mb-md" />

        <div class="section-title q-mb-xs" v-if="hasMetadata">Details</div>
        <q-card flat class="federation-card q-mb-md" v-if="hasMetadata">
          <q-card-section>
            <q-list>
              <q-item v-if="federation?.metadata?.max_balance_msats">
                <q-item-section>
                  <q-item-label caption>Maximum Balance</q-item-label>
                  <q-item-label class="text-body1">
                    {{ formatNumber(parseInt(federation?.metadata?.max_balance_msats) / 1000) }}
                    sats
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator inset />

              <q-item v-if="federation?.metadata?.max_invoice_msats">
                <q-item-section>
                  <q-item-label caption>Maximum Invoice</q-item-label>
                  <q-item-label class="text-body1">
                    {{ formatNumber(parseInt(federation?.metadata?.max_invoice_msats) / 1000) }}
                    sats
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator inset />

              <q-item>
                <q-item-section v-if="federation?.metadata?.public">
                  <q-item-label caption>Public Federation</q-item-label>
                  <q-item-label class="text-body1">
                    <q-chip
                      :color="federation?.metadata?.public === 'true' ? 'positive' : 'blue-grey'"
                      text-color="black"
                      size="sm"
                    >
                      <q-icon
                        :name="federation?.metadata?.public === 'true' ? 'public' : 'public_off'"
                        left
                        size="xs"
                      />
                      {{ federation?.metadata?.public === 'true' ? 'Public' : 'Private' }}
                    </q-chip>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- Vetted Gateways Card -->
        <div class="section-title q-mb-xs" v-if="hasVettedGateways">Gateways</div>
        <q-card flat class="federation-card q-mb-md" v-if="hasVettedGateways">
          <q-card-section class="gateways-section">
            <div class="gateway-list">
              <div v-for="(gateway, index) in vettedGateways" :key="gateway" class="gateway-row">
                <div class="gateway-icon">
                  <q-icon name="router" />
                </div>
                <div class="gateway-body">
                  <div class="gateway-title">Gateway {{ index + 1 }}</div>
                  <div class="gateway-id" :title="gateway">{{ gateway }}</div>
                </div>
                <q-chip
                  color="positive"
                  text-color="black"
                  size="sm"
                  icon="verified"
                  class="gateway-badge"
                >
                  Vetted
                </q-chip>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <div class="section-title q-mb-xs" v-if="hasMessages">Messages</div>
        <q-card flat class="federation-card q-mb-md" v-if="hasMessages">
          <q-card-section>
            <q-list>
              <template v-if="federation?.metadata?.preview_message">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Preview Message</q-item-label>
                    <q-item-label class="text-body1">{{
                      federation?.metadata?.preview_message
                    }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-separator inset />
              </template>

              <template v-if="federation?.metadata?.popup_countdown_message">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>End Message</q-item-label>
                    <q-item-label class="text-body1">
                      {{ federation?.metadata?.popup_countdown_message }}
                      <template v-if="federation?.metadata?.popup_end_timestamp">
                        <br /><span class="text-caption"
                          >Ends: {{ formatDate(federation?.metadata?.popup_end_timestamp) }}</span
                        >
                      </template>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-list>
          </q-card-section>
        </q-card>

        <q-card flat class="federation-card q-mb-md" v-if="federation?.metadata?.tos_url">
          <q-card-section>
            <q-list>
              <q-item
                clickable
                tag="a"
                :href="federation?.metadata?.tos_url"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="federation-details-tos-link"
              >
                <q-item-section avatar>
                  <q-icon name="description" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Terms of Service</q-item-label>
                  <q-item-label caption>View the federation's terms and conditions</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="open_in_new" color="primary" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <FederationUtxos
          :utxos="spendableUtxos"
          :is-loading="isLoadingUtxos"
          :error="utxoError"
          :network="federation?.network ?? null"
        />

        <!-- Actions Card -->

        <q-card flat class="federation-card">
          <q-card-section>
            <div class="q-pa-md">
              <q-btn
                label="Leave Federation"
                color="negative"
                outline
                @click="confirmLeave = true"
                icon="logout"
                class="full-width"
                data-testid="federation-details-leave-btn"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Confirmation Dialog -->
        <q-dialog v-model="confirmLeave">
          <q-card>
            <q-card-section class="row items-center">
              <q-avatar icon="warning" color="negative" text-color="white" />
              <span class="q-ml-sm">Leave Federation</span>
            </q-card-section>

            <q-card-section>
              Are you sure you want to leave this federation? This action cannot be undone.
            </q-card-section>

            <q-card-actions align="right">
              <q-btn
                flat
                label="Cancel"
                color="primary"
                v-close-popup
                data-testid="federation-details-leave-cancel-btn"
              />
              <q-btn
                flat
                label="Leave"
                color="negative"
                @click="leaveFederation"
                v-close-popup
                data-testid="federation-details-leave-confirm-btn"
              />
            </q-card-actions>
          </q-card>
        </q-dialog>
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'FederationDetailsPage',
})

import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShare } from '@vueuse/core'
import QrcodeVue from 'qrcode.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import FederationGuardians from 'src/components/FederationGuardians.vue'
import FederationUtxos from 'src/components/FederationUtxos.vue'
import type { FederationUtxo } from 'src/types/federation'
import { useFormatters } from '../../utils/formatter'
import { logger } from 'src/services/logger'

const { formatNumber } = useFormatters()
const route = useRoute('/federation/[id]')
const router = useRouter()
const notify = useAppNotify()
const { share, isSupported } = useShare()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const confirmLeave = ref(false)
const spendableUtxos = ref<FederationUtxo[]>([])
const isLoadingUtxos = ref(false)
const utxoError = ref<string | null>(null)

const federation = computed(() => {
  return federationStore.federations.find((f) => f.federationId === route.params.id)
})

const inviteCode = computed(() => {
  const metadataInviteCode = federation.value?.metadata?.invite_code
  return metadataInviteCode != null && metadataInviteCode !== ''
    ? metadataInviteCode
    : (federation.value?.inviteCode ?? '')
})

const observerUrl = computed(() => {
  const federationId = federation.value?.federationId ?? ''
  return federationId !== ''
    ? `https://observer.fedimint.org/federations/${encodeURIComponent(federationId)}`
    : ''
})

const hasMetadata = computed(() => {
  return federation.value?.metadata != null && Object.keys(federation.value.metadata).length > 0
})

const hasMessages = computed(() => {
  logger.federation.debug('Checking for messages in federation metadata', {
    federationId: federation.value?.federationId,
  })
  return (
    (federation.value?.metadata?.preview_message != null &&
      federation.value.metadata.preview_message !== '') ||
    (federation.value?.metadata?.popup_countdown_message != null &&
      federation.value.metadata.popup_countdown_message !== '')
  )
})

const hasVettedGateways = computed(() => {
  return (
    federation.value?.metadata?.vetted_gateways != null &&
    federation.value.metadata.vetted_gateways.length > 0
  )
})

const vettedGateways = computed(() => {
  if (federation.value?.metadata?.vetted_gateways == null) return []

  if (typeof federation.value.metadata.vetted_gateways === 'string') {
    try {
      return JSON.parse(federation.value.metadata.vetted_gateways) as string[]
    } catch (error) {
      logger.error('Failed to parse vetted_gateways JSON', error)
      return []
    }
  }

  return federation.value.metadata.vetted_gateways
})

function formatDate(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleString()
  } catch (e) {
    logger.error('Failed to parse metadata date', e)
    return timestamp
  }
}

async function copyInviteCode() {
  if (inviteCode.value === '') {
    return
  }

  try {
    await navigator.clipboard.writeText(inviteCode.value)
    notify.success('Invite link copied to clipboard', { timeout: 1000 })
  } catch (error) {
    logger.error('Failed to copy federation invite code', error)
  }
}

async function shareInviteCode() {
  if (inviteCode.value === '') {
    return
  }

  logger.ui.debug('Sharing federation invite code')
  if (!isSupported.value) {
    await navigator.clipboard.writeText(inviteCode.value)
    notify.info('Invite copied. Share is not available in this browser.')
    return
  }

  await share({
    title: `${federation.value?.title ?? 'Federation'} invite`,
    text: inviteCode.value,
  })
}

watch(
  () => route.params.id,
  async () => {
    const currentFederation = federation.value
    spendableUtxos.value = []
    utxoError.value = null

    if (currentFederation == null) {
      return
    }

    isLoadingUtxos.value = true

    try {
      if (federationStore.selectedFederationId !== currentFederation.federationId) {
        await federationStore.selectFederation(currentFederation)
      }

      spendableUtxos.value = await walletStore.getSpendableUtxos()
    } catch (error) {
      logger.error('Failed to load federation UTXOs', error)
      utxoError.value = 'Failed to load spendable UTXOs.'
    } finally {
      isLoadingUtxos.value = false
    }
  },
  { immediate: true },
)

async function leaveFederation() {
  if (federation.value == null) return

  try {
    await walletStore.closeWallet()
    await new Promise((resolve) => {
      setTimeout(resolve, 100)
    })
    await walletStore.deleteFederationData(federation.value.federationId)
    federationStore.deleteFederation(federation.value.federationId)
    await walletStore.openWallet()
    await router.push({ name: '/federations/' })
  } catch (error) {
    logger.error('Failed to leave federation', error)
    await router.push({ name: '/federations/' })
  }
}
</script>
<style scoped>
.federation-details-content {
  padding-bottom: 24px;
}

.q-card-section {
  padding: 14px 18px 18px;
}

.summary-layout {
  display: flex;
  align-items: center;
  gap: 18px;
}

.summary-logo {
  flex: 0 0 auto;
}

.summary-body {
  min-width: 0;
  flex: 1 1 auto;
}

.summary-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-title {
  font-size: 1.45rem;
  font-weight: 700;
}

.summary-link {
  color: rgba(255, 255, 255, 0.82);
}

.summary-currency {
  margin-top: 6px;
  font-size: 1rem;
}

.summary-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.gateways-section {
  padding: 18px 18px;
}

.gateway-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gateway-row {
  min-width: 0;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
}

.gateway-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(156, 39, 255, 0.12);
  color: var(--q-primary);
  font-size: 1.35rem;
}

.gateway-body {
  min-width: 0;
}

.gateway-title {
  color: rgba(255, 255, 255, 0.92);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.2;
}

.gateway-id {
  min-width: 0;
  margin-top: 4px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.58);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', monospace;
  font-size: 0.84rem;
  letter-spacing: 0;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gateway-badge {
  margin: 0;
}

@media (max-width: 599px) {
  .summary-layout {
    align-items: flex-start;
  }

  .summary-title {
    font-size: 1.3rem;
  }

  .gateways-section {
    padding: 14px 14px;
  }

  .gateway-row {
    grid-template-columns: 38px minmax(0, 1fr) auto;
    gap: 10px;
  }

  .gateway-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    font-size: 1.2rem;
  }

  .gateway-id {
    font-size: 0.78rem;
  }
}
</style>
