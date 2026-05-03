<template>
  <template v-if="showWalletGateways">
    <button
      v-if="showHeader"
      type="button"
      class="gateway-section-header"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <q-icon name="router" class="gateway-section-header__icon" />
      <span class="gateway-section-header__title">Gateways</span>
      <span class="gateway-section-header__count">{{ displayedWalletGateways.length }}</span>
      <q-icon
        name="expand_more"
        class="gateway-section-header__chevron"
        :class="{ 'is-open': isExpanded }"
      />
    </button>
    <div class="federation-gateways">
      <div v-if="error" class="wallet-gateway-error">
        {{ error }}
      </div>
      <div v-else-if="isLoading" class="wallet-gateway-status">Loading gateways...</div>
      <div
        v-else-if="displayedWalletGateways.length > 0"
        v-show="isExpanded"
        class="wallet-gateway-list"
      >
        <div
          v-for="(gateway, index) in displayedWalletGateways"
          :key="gateway.id"
          class="wallet-gateway-row"
        >
          <div class="wallet-gateway-header">
            <div class="wallet-gateway-heading">
              <div class="gateway-title">
                {{ gateway.alias || `Gateway ${index + 1}` }}
              </div>
              <div class="gateway-id" :title="gateway.id">{{ gateway.id }}</div>
              <div class="wallet-gateway-fee-summary">
                {{ formatGatewayFee(gateway.baseMsat, 'msat') }} +
                {{ formatGatewayFee(gateway.proportionalMillionths, 'ppm') }}
              </div>
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
            <q-icon name="chevron_right" class="wallet-gateway-row__chevron" />
          </div>

          <div class="wallet-gateway-details" hidden>
            <div v-if="gateway.api" class="wallet-gateway-detail">
              <span class="wallet-gateway-detail__label">API</span>
              <span class="wallet-gateway-detail__value" :title="gateway.api">
                {{ gateway.api }}
              </span>
            </div>
            <div v-if="gateway.nodePubKey" class="wallet-gateway-detail">
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
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFormatters } from 'src/utils/formatter'

defineOptions({
  name: 'FederationGatewayList',
})

const props = withDefaults(
  defineProps<{
    gateways: unknown[]
    isLoading: boolean
    error: string | null
    hasLoaded: boolean
    showHeader?: boolean
  }>(),
  {
    showHeader: true,
  },
)

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

const { formatNumber } = useFormatters()
const isExpanded = ref(true)

const showWalletGateways = computed(() => {
  return props.hasLoaded || props.isLoading || props.error != null || props.gateways.length > 0
})

const displayedWalletGateways = computed(() => {
  return props.gateways.map((gateway, index) => parseWalletGateway(gateway, index))
})

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
</script>

<style scoped>
.federation-gateways {
  margin-bottom: 0;
}

.gateway-section-header {
  min-width: 0;
  width: 100%;
  display: grid;
  grid-template-columns: auto auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--vipr-space-2);
  padding: var(--vipr-space-2) 0;
  border: 0;
  border-bottom: 1px solid var(--vipr-detail-separator);
  background: transparent;
  color: var(--vipr-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.gateway-section-header__icon {
  color: var(--vipr-text-muted);
  font-size: 1rem;
}

.gateway-section-header__title {
  min-width: 0;
  overflow: hidden;
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
}

.gateway-section-header__count {
  color: var(--vipr-text-muted);
}

.gateway-section-header__chevron {
  color: var(--vipr-text-secondary);
  transform: rotate(-90deg);
  transition: transform 160ms ease-out;
}

.gateway-section-header__chevron.is-open {
  transform: rotate(180deg);
}

.gateway-title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-caption);
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--vipr-detail-separator);
}

.wallet-gateway-row {
  min-width: 0;
  padding: var(--vipr-space-3) 0;
  overflow: hidden;
}

.wallet-gateway-row + .wallet-gateway-row {
  border-top: 1px solid var(--vipr-detail-separator);
}

.wallet-gateway-header {
  min-width: 0;
  max-width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--vipr-space-2);
}

.wallet-gateway-heading {
  min-width: 0;
  overflow: hidden;
}

.wallet-gateway-link {
  grid-row: 1;
  grid-column: 2;
  color: var(--vipr-text-secondary);
}

.wallet-gateway-link :deep(.q-icon) {
  font-size: 1.1rem;
}

.wallet-gateway-row__chevron {
  display: none;
  color: var(--vipr-text-muted);
}

.wallet-gateway-details {
  display: flex;
  flex-direction: column;
  gap: var(--vipr-space-2);
  margin-top: var(--vipr-space-3);
}

.wallet-gateway-fee-summary {
  min-width: 0;
  overflow: hidden;
  margin-top: var(--vipr-space-1);
  color: var(--vipr-text-muted);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
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

@media (max-width: 599px) {
  .gateway-id {
    font-size: var(--vipr-federation-detail-gateway-id-font-size-mobile);
  }

  .wallet-gateway-details {
    display: none;
  }

  .wallet-gateway-row {
    padding: var(--vipr-space-3) 0;
  }
}
</style>
