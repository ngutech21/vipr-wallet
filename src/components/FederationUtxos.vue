<template>
  <div>
    <div class="row items-baseline q-mb-xs q-gutter-sm">
      <div class="text-subtitle1">UTXOs</div>
      <div v-if="utxos.length > 0" class="text-grey-5">{{ utxos.length }} spendable</div>
    </div>
    <q-card flat class="q-mb-md utxo-card">
      <q-card-section v-if="isLoading" class="row items-center justify-center q-py-xl">
        <q-spinner color="primary" size="28px" />
      </q-card-section>

      <q-card-section v-else-if="error" class="text-negative">
        {{ error }}
      </q-card-section>

      <q-card-section v-else-if="utxos.length === 0" class="text-grey-5">
        No spendable UTXOs available.
      </q-card-section>

      <q-list v-else separator>
        <q-item
          v-for="utxo in visibleUtxos"
          :key="`${utxo.txid}:${utxo.vout}`"
          clickable
          tag="a"
          :href="getMempoolTxUrl(utxo.txid)"
          target="_blank"
          rel="noopener noreferrer"
          class="q-py-md utxo-link"
        >
          <q-item-section>
            <q-item-label class="text-mono"> {{ utxo.txid }}:{{ utxo.vout }} </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label class="text-body1 text-weight-medium">
              {{ formatNumber(utxo.amount) }} sats
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="open_in_new" color="primary" size="18px" />
          </q-item-section>
        </q-item>
      </q-list>

      <q-card-actions v-if="utxos.length > initialVisibleCount" align="center" class="q-pb-md">
        <q-btn
          flat
          color="primary"
          :label="isExpanded ? 'Show less' : `Show more (${utxos.length - visibleUtxos.length})`"
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
.utxo-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
}

.utxo-link {
  color: inherit;
  text-decoration: none;
}

.text-mono {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85em;
  word-break: break-all;
}
</style>
