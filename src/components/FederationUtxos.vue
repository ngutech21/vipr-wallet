<template>
  <div>
    <div class="utxo-header">
      <div class="vipr-section-title">UTXOs</div>
      <div v-if="utxos.length > 0" class="vipr-caption">{{ utxos.length }} spendable</div>
    </div>
    <q-card flat class="utxo-card vipr-surface-card vipr-surface-card--subtle">
      <q-card-section v-if="isLoading" class="utxo-loading">
        <q-spinner color="primary" size="28px" />
      </q-card-section>

      <q-card-section v-else-if="error" class="utxo-error">
        {{ error }}
      </q-card-section>

      <q-card-section v-else-if="utxos.length === 0" class="vipr-caption">
        No spendable UTXOs available.
      </q-card-section>

      <q-list v-else separator class="utxo-list">
        <q-item
          v-for="utxo in visibleUtxos"
          :key="`${utxo.txid}:${utxo.vout}`"
          clickable
          tag="a"
          :href="getMempoolTxUrl(utxo.txid)"
          target="_blank"
          rel="noopener noreferrer"
          class="utxo-link utxo-row"
        >
          <q-item-section>
            <q-item-label class="utxo-id vipr-mono"> {{ utxo.txid }}:{{ utxo.vout }} </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label class="utxo-amount"> {{ formatNumber(utxo.amount) }} sats </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="open_in_new" color="primary" size="18px" />
          </q-item-section>
        </q-item>
      </q-list>

      <q-card-actions v-if="utxos.length > initialVisibleCount" align="center" class="utxo-actions">
        <q-btn
          flat
          :label="isExpanded ? 'Show less' : `Show more (${utxos.length - visibleUtxos.length})`"
          class="vipr-btn vipr-btn--compact vipr-btn--secondary"
          @click="toggleExpanded"
        />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FederationUtxo } from 'src/types/federation'
import { useFormatters } from 'src/utils/formatter'

const props = defineProps<{
  utxos: FederationUtxo[]
  isLoading: boolean
  error: string | null
  network?: string | null
}>()

const { formatNumber } = useFormatters()
const initialVisibleCount = 10
const isExpanded = ref(false)

const visibleUtxos = computed(() => {
  if (isExpanded.value) {
    return props.utxos
  }

  return props.utxos.slice(0, initialVisibleCount)
})

watch(
  () => props.utxos,
  () => {
    isExpanded.value = false
  },
)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function getMempoolTxUrl(txid: string): string {
  const networkPath = getMempoolNetworkPath(props.network)
  return `https://mempool.space${networkPath}/tx/${txid}`
}

function getMempoolNetworkPath(network?: string | null): string {
  switch (network?.toLowerCase()) {
    case 'testnet':
      return '/testnet'
    case 'testnet4':
      return '/testnet4'
    case 'signet':
      return '/signet'
    case 'mainnet':
    case 'bitcoin':
    case undefined:
    case null:
    case '':
      return ''
    default:
      return ''
  }
}
</script>

<style scoped>
.utxo-header {
  display: flex;
  align-items: baseline;
  gap: var(--vipr-space-2);
  margin-bottom: var(--vipr-space-1);
}

.utxo-card {
  margin-bottom: var(--vipr-space-4);
}

.utxo-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: var(--vipr-space-8);
  padding-bottom: var(--vipr-space-8);
}

.utxo-error {
  color: var(--q-negative);
}

.utxo-actions {
  padding-bottom: var(--vipr-space-4);
}

.utxo-list {
  background: transparent;
}

.utxo-link {
  color: inherit;
  text-decoration: none;
}

.utxo-row {
  padding-top: var(--vipr-row-padding-y);
  padding-bottom: var(--vipr-row-padding-y);
}

.utxo-list :deep(.q-item + .q-item),
.utxo-list :deep(.q-item-type + .q-item-type) {
  border-top-color: var(--vipr-detail-separator);
}

.utxo-id {
  color: var(--vipr-text-muted);
  font-size: 0.85em;
  word-break: break-all;
}

.utxo-amount {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 600;
}
</style>
