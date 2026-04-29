<template>
  <template v-if="showWalletGateways">
    <div class="vipr-section-title federation-section-title">Gateways</div>
    <div class="federation-gateways">
      <div v-if="error" class="wallet-gateway-error">
        {{ error }}
      </div>
      <div v-else-if="isLoading" class="wallet-gateway-status">Loading gateways...</div>
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
import { computed } from 'vue'
import { useFormatters } from 'src/utils/formatter'

defineOptions({
  name: 'FederationGatewayList',
})

const props = defineProps<{
  gateways: unknown[]
  isLoading: boolean
  error: string | null
  hasLoaded: boolean
}>()

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

@media (max-width: 599px) {
  .gateway-id {
    font-size: var(--vipr-federation-detail-gateway-id-font-size-mobile);
  }
}
</style>
