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

      <div class="federation-details-content">
        <q-card
          flat
          class="federation-card federation-card--summary vipr-surface-card vipr-surface-card--summary"
        >
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

              <div class="summary-currency vipr-caption">
                {{ federation?.metadata?.default_currency }}
              </div>

              <div class="summary-modules">
                <q-chip
                  v-for="module in federation?.modules"
                  :key="module.kind"
                  size="sm"
                  class="vipr-chip vipr-chip--positive summary-module-chip"
                >
                  {{ module.kind }}
                </q-chip>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <CopyableQrCard
          v-if="inviteCode"
          :value="inviteCode"
          label="Invite code"
          input-aria-label="Federation invite code"
          test-id-prefix="federation-details-invite"
          card-class="federation-card vipr-surface-card--subtle"
          input-test-id="federation-details-invite-input"
          copy-test-id="federation-details-copy-invite-btn"
          share-test-id="federation-details-share-invite-btn"
          @copy="copyInviteCode"
          @share="shareInviteCode"
        />

        <FederationGuardians :guardians="federation?.guardians ?? []" class="federation-card" />

        <div class="vipr-section-title federation-section-title" v-if="hasMetadata">Details</div>
        <q-card
          flat
          class="federation-card vipr-surface-card vipr-surface-card--subtle"
          v-if="hasMetadata"
        >
          <q-card-section>
            <div class="vipr-detail-list">
              <div v-if="federation?.metadata?.max_balance_msats" class="vipr-detail-row">
                <div class="vipr-detail-label">Maximum Balance</div>
                <div class="vipr-detail-value">
                  <span>
                    {{ formatNumber(parseInt(federation?.metadata?.max_balance_msats) / 1000) }}
                    sats
                  </span>
                </div>
              </div>

              <div v-if="federation?.metadata?.max_invoice_msats" class="vipr-detail-row">
                <div class="vipr-detail-label">Maximum Invoice</div>
                <div class="vipr-detail-value">
                  <span>
                    {{ formatNumber(parseInt(federation?.metadata?.max_invoice_msats) / 1000) }}
                    sats
                  </span>
                </div>
              </div>

              <div v-if="federation?.metadata?.public" class="vipr-detail-row">
                <div class="vipr-detail-label">Public Federation</div>
                <div class="vipr-detail-value">
                  <span>
                    <q-chip
                      size="sm"
                      :class="[
                        'vipr-chip',
                        federation?.metadata?.public === 'true'
                          ? 'vipr-chip--positive'
                          : 'vipr-chip--muted',
                      ]"
                    >
                      <q-icon
                        :name="federation?.metadata?.public === 'true' ? 'public' : 'public_off'"
                        left
                        size="xs"
                      />
                      {{ federation?.metadata?.public === 'true' ? 'Public' : 'Private' }}
                    </q-chip>
                  </span>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <div class="vipr-section-title federation-section-title" v-if="showWalletGateways">
          Gateways
        </div>
        <div class="federation-gateways" v-if="showWalletGateways">
          <div v-if="walletGatewayError" class="wallet-gateway-error">
            {{ walletGatewayError }}
          </div>
          <div v-else-if="isLoadingWalletGateways" class="wallet-gateway-status">
            Loading gateways...
          </div>
          <div v-else-if="displayedWalletGateways.length > 0" class="wallet-gateway-list">
            <div
              v-for="(gateway, index) in displayedWalletGateways"
              :key="gateway.id"
              class="wallet-gateway-row vipr-surface-card vipr-surface-card--subtle"
            >
              <div class="wallet-gateway-header">
                <div class="wallet-gateway-heading">
                  <div class="gateway-title">
                    {{ gateway.alias || `Gateway ${index + 1}` }}
                  </div>
                  <div class="gateway-id" :title="gateway.id">{{ gateway.id }}</div>
                </div>
                <q-btn
                  v-if="gateway.ambossUrl"
                  dense
                  flat
                  round
                  icon="open_in_new"
                  class="wallet-gateway-link"
                  :href="gateway.ambossUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open node on Amboss"
                />
              </div>

              <div class="wallet-gateway-details">
                <div class="wallet-gateway-detail" v-if="gateway.api">
                  <span class="wallet-gateway-detail__label">API</span>
                  <span class="wallet-gateway-detail__value" :title="gateway.api">
                    {{ gateway.api }}
                  </span>
                </div>
                <div class="wallet-gateway-detail" v-if="gateway.nodePubKey">
                  <span class="wallet-gateway-detail__label">Node</span>
                  <span class="wallet-gateway-detail__value" :title="gateway.nodePubKey">
                    {{ gateway.nodePubKey }}
                  </span>
                </div>
                <div class="wallet-gateway-detail">
                  <span class="wallet-gateway-detail__label">Base fee</span>
                  <span class="wallet-gateway-detail__value">
                    {{ formatGatewayFee(gateway.baseMsat, 'msat') }}
                  </span>
                </div>
                <div class="wallet-gateway-detail">
                  <span class="wallet-gateway-detail__label">Proportional</span>
                  <span class="wallet-gateway-detail__value">
                    {{ formatGatewayFee(gateway.proportionalMillionths, 'ppm') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="wallet-gateway-status">No gateways returned.</div>
        </div>

        <div class="vipr-section-title federation-section-title" v-if="hasMessages">Messages</div>
        <q-card
          flat
          class="federation-card vipr-surface-card vipr-surface-card--subtle"
          v-if="hasMessages"
        >
          <q-card-section>
            <div class="vipr-detail-list">
              <template v-if="federation?.metadata?.preview_message">
                <div class="vipr-detail-row vipr-detail-row--block">
                  <div class="vipr-detail-label">Preview Message</div>
                  <div class="vipr-body federation-message-copy">
                    {{ federation?.metadata?.preview_message }}
                  </div>
                </div>
              </template>

              <template v-if="federation?.metadata?.popup_countdown_message">
                <div class="vipr-detail-row vipr-detail-row--block">
                  <div class="vipr-detail-label">End Message</div>
                  <div class="vipr-body federation-message-copy">
                    {{ federation?.metadata?.popup_countdown_message }}
                  </div>
                  <div
                    v-if="federation?.metadata?.popup_end_timestamp"
                    class="vipr-caption federation-message-copy"
                  >
                    Ends: {{ formatDate(federation?.metadata?.popup_end_timestamp) }}
                  </div>
                </div>
              </template>
            </div>
          </q-card-section>
        </q-card>

        <q-card
          flat
          class="federation-card vipr-surface-card vipr-surface-card--subtle"
          v-if="federation?.metadata?.tos_url"
        >
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
                  <q-item-label class="vipr-caption">
                    View the federation's terms and conditions
                  </q-item-label>
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

        <q-card flat class="federation-card vipr-surface-card vipr-surface-card--subtle">
          <q-card-section>
            <div class="leave-action">
              <q-btn
                label="Leave Federation"
                color="negative"
                outline
                @click="confirmLeave = true"
                icon="logout"
                class="leave-action__button vipr-btn vipr-btn--md"
                data-testid="federation-details-leave-btn"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Confirmation Dialog -->
        <q-dialog v-model="confirmLeave">
          <q-card>
            <q-card-section class="leave-dialog-header">
              <q-avatar icon="warning" color="negative" text-color="white" />
              <span class="leave-dialog-title">Leave Federation</span>
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
import { useCopyShare } from 'src/composables/useCopyShare'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import FederationGuardians from 'src/components/FederationGuardians.vue'
import FederationUtxos from 'src/components/FederationUtxos.vue'
import CopyableQrCard from 'src/components/CopyableQrCard.vue'
import type { FederationUtxo } from 'src/types/federation'
import { useFormatters } from '../../utils/formatter'
import { logger } from 'src/services/logger'

const { formatNumber } = useFormatters()
const route = useRoute('/federation/[id]')
const router = useRouter()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const confirmLeave = ref(false)
const spendableUtxos = ref<FederationUtxo[]>([])
const isLoadingUtxos = ref(false)
const utxoError = ref<string | null>(null)
const walletGateways = ref<unknown[]>([])
const isLoadingWalletGateways = ref(false)
const hasLoadedWalletGateways = ref(false)
const walletGatewayError = ref<string | null>(null)

type WalletGatewayInfoRecord = {
  api?: unknown
  fees?: unknown
  gateway_id?: unknown
  lightning_alias?: unknown
  node_pub_key?: unknown
}

type WalletGatewayRecord = {
  info?: WalletGatewayInfoRecord
}

type DisplayedWalletGateway = {
  id: string
  api: string | null
  alias: string | null
  nodePubKey: string | null
  baseMsat: number | null
  proportionalMillionths: number | null
  ambossUrl: string | null
}

const federation = computed(() => {
  return federationStore.federations.find((f) => f.federationId === route.params.id)
})

const inviteCode = computed(() => {
  const metadataInviteCode = federation.value?.metadata?.invite_code
  return metadataInviteCode != null && metadataInviteCode !== ''
    ? metadataInviteCode
    : (federation.value?.inviteCode ?? '')
})
const { copyToClipboard: copyInviteToClipboard, shareValue: shareFederationInvite } = useCopyShare({
  value: inviteCode,
  copySuccessMessage: 'Invite link copied to clipboard',
  copySuccessOptions: { timeout: 1000 },
  shareTitle: computed(() => `${federation.value?.title ?? 'Federation'} invite`),
  shareUnavailableMessage: 'Invite copied. Share is not available in this browser.',
  onCopyError: (error) => logger.error('Failed to copy federation invite code', error),
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

const showWalletGateways = computed(() => {
  return (
    hasLoadedWalletGateways.value ||
    isLoadingWalletGateways.value ||
    walletGatewayError.value != null ||
    walletGateways.value.length > 0
  )
})

const displayedWalletGateways = computed(() => {
  return walletGateways.value.map((gateway, index) => parseWalletGateway(gateway, index))
})

function formatDate(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleString()
  } catch (e) {
    logger.error('Failed to parse metadata date', e)
    return timestamp
  }
}

function parseWalletGateway(gateway: unknown, index: number): DisplayedWalletGateway {
  const record = gateway as WalletGatewayRecord
  const info = record.info ?? {}
  const gatewayId = readString(info.gateway_id)
  const nodePubKey = readString(info.node_pub_key)

  return {
    id: gatewayId ?? nodePubKey ?? `gateway-${index}`,
    api: readString(info.api),
    alias: readString(info.lightning_alias),
    nodePubKey,
    baseMsat: readGatewayBaseFeeMsat(info.fees),
    proportionalMillionths: readGatewayProportionalMillionths(info.fees),
    ambossUrl: nodePubKey != null ? `https://amboss.space/node/${nodePubKey}` : null,
  }
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readGatewayBaseFeeMsat(fees: unknown): number | null {
  const feeRecord = fees as { base_msat?: unknown; base?: { msats?: unknown } }
  return readNumber(feeRecord?.base_msat) ?? readNumber(feeRecord?.base?.msats)
}

function readGatewayProportionalMillionths(fees: unknown): number | null {
  const feeRecord = fees as { proportional_millionths?: unknown; parts_per_million?: unknown }
  return readNumber(feeRecord?.proportional_millionths) ?? readNumber(feeRecord?.parts_per_million)
}

function formatGatewayFee(value: number | null, unit: string): string {
  return value == null ? 'Unknown' : `${formatNumber(value)} ${unit}`
}

async function copyInviteCode() {
  if (inviteCode.value === '') {
    return
  }

  await copyInviteToClipboard()
}

async function shareInviteCode() {
  if (inviteCode.value === '') {
    return
  }

  logger.ui.debug('Sharing federation invite code')
  await shareFederationInvite()
}

watch(
  () => route.params.id,
  async () => {
    const currentFederation = federation.value
    spendableUtxos.value = []
    walletGateways.value = []
    utxoError.value = null
    walletGatewayError.value = null
    hasLoadedWalletGateways.value = false

    if (currentFederation == null) {
      return
    }

    isLoadingUtxos.value = true
    isLoadingWalletGateways.value = true

    try {
      if (federationStore.selectedFederationId !== currentFederation.federationId) {
        await federationStore.selectFederation(currentFederation)
      }

      const [utxos, gateways] = await Promise.all([
        walletStore.getSpendableUtxos(),
        loadWalletGateways(),
      ])
      spendableUtxos.value = utxos
      walletGateways.value = gateways
    } catch (error) {
      logger.error('Failed to load federation UTXOs', error)
      utxoError.value = 'Failed to load spendable UTXOs.'
    } finally {
      isLoadingUtxos.value = false
      isLoadingWalletGateways.value = false
      hasLoadedWalletGateways.value = true
    }
  },
  { immediate: true },
)

async function loadWalletGateways(): Promise<unknown[]> {
  const wallet = walletStore.wallet
  if (wallet == null) {
    walletGatewayError.value = 'Wallet is not open.'
    return []
  }

  try {
    await wallet.lightning.updateGatewayCache()
    return await wallet.lightning.listGateways()
  } catch (error) {
    logger.error('Failed to load wallet gateways', error)
    walletGatewayError.value = 'Failed to load wallet gateways.'
    return []
  }
}

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
  padding: var(--vipr-federation-detail-content-padding);
}

.federation-card {
  margin-bottom: var(--vipr-federation-detail-card-gap);
}

.federation-section-title {
  margin-bottom: var(--vipr-federation-detail-section-title-gap);
}

.summary-layout {
  display: flex;
  align-items: center;
  gap: var(--vipr-federation-detail-summary-gap);
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
  gap: var(--vipr-federation-detail-title-row-gap);
}

.summary-title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-summary-title);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
  letter-spacing: 0;
}

.summary-link {
  color: var(--vipr-text-secondary);
}

.summary-currency {
  margin-top: var(--vipr-federation-detail-currency-gap);
}

.summary-modules {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vipr-federation-detail-modules-gap);
  margin-top: var(--vipr-federation-detail-modules-top-space);
}

.summary-module-chip {
  margin: 0;
}

.federation-gateways {
  margin-bottom: var(--vipr-federation-detail-card-gap);
}

.gateway-title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-federation-detail-gateway-title-font-size);
  font-weight: 600;
  line-height: var(--vipr-line-height-tight);
}

.gateway-id {
  min-width: 0;
  margin-top: var(--vipr-space-1);
  overflow: hidden;
  color: var(--vipr-text-soft);
  font-family: var(--vipr-font-family-mono);
  font-size: var(--vipr-federation-detail-gateway-id-font-size);
  letter-spacing: 0;
  line-height: var(--vipr-line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-gateway-list {
  display: flex;
  flex-direction: column;
  gap: var(--vipr-space-2);
}

.wallet-gateway-row {
  min-width: 0;
  padding: var(--vipr-space-4);
}

.wallet-gateway-header {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--vipr-space-2);
}

.wallet-gateway-heading {
  min-width: 0;
}

.wallet-gateway-link {
  color: var(--vipr-text-secondary);
}

.wallet-gateway-details {
  display: flex;
  flex-direction: column;
  gap: var(--vipr-space-2);
  margin-top: var(--vipr-space-4);
}

.wallet-gateway-detail {
  min-width: 0;
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: baseline;
  gap: var(--vipr-space-2);
}

.wallet-gateway-detail__label {
  color: var(--vipr-text-soft);
  font-size: var(--vipr-font-size-label);
  font-weight: 600;
  line-height: var(--vipr-line-height-tight);
}

.wallet-gateway-detail__value {
  min-width: 0;
  overflow: hidden;
  color: var(--vipr-text-secondary);
  font-family: var(--vipr-font-family-mono);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-gateway-status {
  color: var(--vipr-text-muted);
  font-size: var(--vipr-font-size-body);
  line-height: var(--vipr-line-height-body);
}

.wallet-gateway-error {
  color: var(--q-negative);
  font-size: var(--vipr-font-size-body);
  line-height: var(--vipr-line-height-body);
}

.federation-message-copy {
  margin-top: var(--vipr-federation-detail-message-gap);
}

.leave-action {
  padding: var(--vipr-federation-detail-action-padding);
}

.leave-action__button {
  width: 100%;
}

.leave-dialog-header {
  display: flex;
  align-items: center;
}

.leave-dialog-title {
  margin-left: var(--vipr-federation-detail-dialog-title-gap);
}

@media (max-width: 599px) {
  .summary-layout {
    align-items: flex-start;
  }

  .summary-title {
    font-size: var(--vipr-federation-detail-title-font-size-mobile);
  }

  .gateway-id {
    font-size: var(--vipr-federation-detail-gateway-id-font-size-mobile);
  }
}
</style>
