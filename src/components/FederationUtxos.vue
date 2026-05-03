<template>
  <div>
    <button
      type="button"
      class="utxo-header"
      :aria-expanded="isSectionExpanded"
      @click="isSectionExpanded = !isSectionExpanded"
    >
      <q-icon name="account_balance_wallet" class="utxo-header__icon" />
      <span class="utxo-header__title">UTXOs</span>
      <span v-if="utxos.length > 0" class="utxo-header__count">{{ utxos.length }} spendable</span>
      <q-icon
        name="expand_more"
        class="utxo-header__chevron"
        :class="{ 'is-open': isSectionExpanded }"
      />
    </button>
    <div v-show="isSectionExpanded" class="utxo-card">
      <div v-if="isLoading" class="utxo-loading">
        <q-spinner color="primary" size="28px" />
      </div>

      <div v-else-if="error" class="utxo-error">
        {{ error }}
      </div>

      <div v-else-if="utxos.length === 0" class="vipr-caption utxo-empty">
        No spendable UTXOs available.
      </div>

      <div v-else class="utxo-list" role="list" aria-label="Spendable UTXOs">
        <a
          v-for="utxo in visibleUtxos"
          :key="`${utxo.txid}:${utxo.vout}`"
          :href="getMempoolTxUrl(utxo.txid)"
          target="_blank"
          rel="noopener noreferrer"
          role="listitem"
          class="utxo-link utxo-row"
          :aria-label="`Open UTXO ${utxo.txid}:${utxo.vout} on mempool.space`"
        >
          <span class="utxo-id vipr-mono" :title="`${utxo.txid}:${utxo.vout}`">
            {{ utxo.txid }}:{{ utxo.vout }}
          </span>
          <span class="utxo-amount">{{ formatNumber(utxo.amount) }} sats</span>
          <q-icon name="open_in_new" class="utxo-row__external" />
        </a>
      </div>

      <div v-if="utxos.length > visibleCount" class="utxo-actions">
        <q-btn
          flat
          :label="
            isListExpanded ? 'Show less' : `Show more (${utxos.length - visibleUtxos.length})`
          "
          class="vipr-btn vipr-btn--compact vipr-btn--secondary"
          @click="toggleExpanded"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import type { FederationUtxo } from 'src/types/federation'
import { useFormatters } from 'src/utils/formatter'

const props = defineProps<{
  utxos: FederationUtxo[]
  isLoading: boolean
  error: string | null
  network?: string | null
}>()

const { formatNumber } = useFormatters()
const $q = useQuasar()
const desktopVisibleCount = 10
const mobileVisibleCount = 4
const isSectionExpanded = ref(true)
const isListExpanded = ref(false)

const visibleCount = computed(() => ($q.screen.lt.sm ? mobileVisibleCount : desktopVisibleCount))

const visibleUtxos = computed(() => {
  if (isListExpanded.value) {
    return props.utxos
  }

  return props.utxos.slice(0, visibleCount.value)
})

watch(
  () => props.utxos,
  () => {
    isListExpanded.value = false
  },
)

function toggleExpanded() {
  isListExpanded.value = !isListExpanded.value
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

.utxo-header__icon {
  color: var(--vipr-text-muted);
  font-size: 1.15rem;
}

.utxo-header__title {
  min-width: 0;
  overflow: hidden;
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
}

.utxo-header__count {
  min-width: 0;
  overflow: hidden;
  color: var(--vipr-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.utxo-header__chevron {
  color: var(--vipr-text-secondary);
  transform: rotate(-90deg);
  transition: transform 160ms ease-out;
}

.utxo-header__chevron.is-open {
  transform: rotate(180deg);
}

.utxo-card {
  min-width: 0;
  max-width: 100%;
  margin-bottom: var(--vipr-space-4);
  overflow: hidden;
  border-bottom: 1px solid var(--vipr-detail-separator);
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
  display: flex;
  justify-content: center;
  padding: var(--vipr-space-4) 0;
}

.utxo-empty {
  padding: var(--vipr-space-4) 0;
}

.utxo-list {
  min-width: 0;
  width: 100%;
  display: grid;
  background: transparent;
}

.utxo-link {
  color: inherit;
  text-decoration: none;
}

.utxo-row {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content auto;
  align-items: center;
  gap: var(--vipr-space-2);
  padding-top: var(--vipr-row-padding-y);
  padding-bottom: var(--vipr-row-padding-y);
}

.utxo-row + .utxo-row {
  border-top: 1px solid var(--vipr-detail-separator);
}

.utxo-id {
  min-width: 0;
  display: block;
  max-width: 100%;
  overflow: hidden;
  color: var(--vipr-text-muted);
  font-size: 0.85em;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: normal;
}

.utxo-amount {
  min-width: max-content;
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 600;
  line-height: var(--vipr-line-height-tight);
  text-align: right;
  white-space: nowrap;
}

.utxo-row__external {
  color: var(--vipr-text-secondary);
  font-size: 1.1rem;
  justify-self: end;
}

.utxo-link:hover .utxo-row__external,
.utxo-link:focus-visible .utxo-row__external {
  color: var(--q-primary);
}

@media (max-width: 599px) {
  .utxo-header {
    grid-template-columns: auto minmax(0, max-content) minmax(0, 1fr) auto;
  }

  .utxo-row {
    padding-top: var(--vipr-space-3);
    padding-bottom: var(--vipr-space-3);
  }

  .utxo-id,
  .utxo-amount {
    font-size: var(--vipr-font-size-label);
  }

  .utxo-row__external {
    font-size: 1rem;
  }
}
</style>
