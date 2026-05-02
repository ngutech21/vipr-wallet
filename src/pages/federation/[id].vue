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
      <ViprTopbar
        topbar-class="federation-details-topbar"
        button-class="federation-details-topbar__back"
        button-test-id="federation-details-back-btn"
        :back-to="{ name: '/federations/' }"
      />

      <div class="federation-details-content">
        <FederationSummaryCard :federation="federation" :observer-url="observerUrl" />

        <FederationInviteCard :invite-code="inviteCode" :federation-title="federation?.title" />

        <FederationGuardians :guardians="federation?.guardians ?? []" class="federation-card" />

        <FederationMetadataCard :metadata="federation?.metadata" />

        <FederationMetaConsensusCard
          v-if="showRawMetaConsensusCard"
          :metadata="metaConsensusValue"
          :is-loading="isLoadingMetaConsensus"
          :error="metaConsensusError"
        />

        <FederationGatewayList
          :gateways="walletGateways"
          :is-loading="isLoadingWalletGateways"
          :error="walletGatewayError"
          :has-loaded="hasLoadedWalletGateways"
        />

        <FederationMessagesCard
          :metadata="federation?.metadata"
          :federation-id="federation?.federationId"
        />

        <FederationUtxos
          :utxos="spendableUtxos"
          :is-loading="isLoadingUtxos"
          :error="utxoError"
          :network="federation?.network ?? null"
        />

        <LeaveFederationCard @leave="leaveFederation" />
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
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import FederationGatewayList from 'src/components/federation/FederationGatewayList.vue'
import FederationGuardians from 'src/components/FederationGuardians.vue'
import FederationInviteCard from 'src/components/federation/FederationInviteCard.vue'
import FederationMetaConsensusCard from 'src/components/federation/FederationMetaConsensusCard.vue'
import FederationMessagesCard from 'src/components/federation/FederationMessagesCard.vue'
import FederationMetadataCard from 'src/components/federation/FederationMetadataCard.vue'
import FederationSummaryCard from 'src/components/federation/FederationSummaryCard.vue'
import LeaveFederationCard from 'src/components/federation/LeaveFederationCard.vue'
import ViprTopbar from 'src/components/ViprTopbar.vue'
import type { FederationUtxo } from 'src/types/federation'
import FederationUtxos from 'src/components/FederationUtxos.vue'
import { logger } from 'src/services/logger'
import type { MetaConsensusValue, JSONObject } from '@fedimint/core'

const route = useRoute('/federation/[id]')
const router = useRouter()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const spendableUtxos = ref<FederationUtxo[]>([])
const isLoadingUtxos = ref(false)
const utxoError = ref<string | null>(null)
const walletGateways = ref<unknown[]>([])
const isLoadingWalletGateways = ref(false)
const hasLoadedWalletGateways = ref(false)
const walletGatewayError = ref<string | null>(null)
const metaConsensusValue = ref<MetaConsensusValue<JSONObject> | null>(null)
const isLoadingMetaConsensus = ref(false)
const metaConsensusError = ref<string | null>(null)
const showRawMetaConsensusCard = import.meta.env.DEV || import.meta.env.VITE_E2E_MODE === '1'

const federation = computed(() => {
  return federationStore.federations.find((f) => f.federationId === route.params.id)
})

const inviteCode = computed(() => {
  const metadataInviteCode = federation.value?.metadata?.inviteCode
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

watch(
  () => route.params.id,
  async () => {
    const currentFederation = federation.value
    spendableUtxos.value = []
    walletGateways.value = []
    metaConsensusValue.value = null
    utxoError.value = null
    walletGatewayError.value = null
    metaConsensusError.value = null
    hasLoadedWalletGateways.value = false

    if (currentFederation == null) {
      return
    }

    isLoadingUtxos.value = true
    isLoadingWalletGateways.value = true
    isLoadingMetaConsensus.value = showRawMetaConsensusCard

    try {
      if (federationStore.selectedFederationId !== currentFederation.federationId) {
        await federationStore.selectFederation(currentFederation)
      }

      const [utxos, gateways, metadata] = await Promise.all([
        walletStore.getSpendableUtxos(),
        loadWalletGateways(),
        showRawMetaConsensusCard ? loadMetaConsensusValue() : Promise.resolve(null),
      ])
      spendableUtxos.value = utxos
      walletGateways.value = gateways
      metaConsensusValue.value = metadata
    } catch (error) {
      logger.error('Failed to load federation UTXOs', error)
      utxoError.value = 'Failed to load spendable UTXOs.'
    } finally {
      isLoadingUtxos.value = false
      isLoadingWalletGateways.value = false
      isLoadingMetaConsensus.value = false
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

async function loadMetaConsensusValue(): Promise<MetaConsensusValue<JSONObject> | null> {
  const wallet = walletStore.wallet
  if (wallet == null) {
    metaConsensusError.value = 'Wallet is not open.'
    return null
  }

  try {
    return await walletStore.getMetaConsensusValue()
  } catch (error) {
    logger.error('Failed to load federation consensus metadata', error)
    metaConsensusError.value = 'Failed to load consensus metadata.'
    return null
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

.federation-details-content :deep(.federation-card) {
  margin-bottom: var(--vipr-federation-detail-card-gap);
}

.federation-details-content :deep(.federation-section-title) {
  margin-bottom: var(--vipr-federation-detail-section-title-gap);
}
</style>
