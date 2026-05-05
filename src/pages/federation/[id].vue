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
        <FederationSummaryCard
          :federation="federation"
          :observer-url="observerUrl"
          :gateway-count-label="gatewayCountLabel"
        />

        <div class="federation-section-stack">
          <FederationMessagesCard
            :metadata="federation?.metadata"
            :federation-id="federation?.federationId"
          />

          <FederationMetadataCard :metadata="federation?.metadata" />

          <FederationInviteCard :invite-code="inviteCode" :federation-title="federation?.title" />

          <section class="federation-open-section federation-trust-section">
            <div class="federation-section-header">
              <div class="federation-section-heading">Guardians & Lightning gateways</div>
            </div>
            <FederationGuardians :guardians="federation?.guardians ?? []" :show-header="true" />

            <FederationGatewayList
              :gateways="walletGateways"
              :is-loading="isLoadingWalletGateways"
              :error="walletGatewayError"
              :has-loaded="hasLoadedWalletGateways"
            />
          </section>

          <section class="federation-open-section federation-advanced-section">
            <div class="federation-section-header">
              <div class="federation-section-heading">Advanced</div>
            </div>
            <FederationUtxos
              :utxos="spendableUtxos"
              :is-loading="isLoadingUtxos"
              :error="utxoError"
              :network="federation?.network ?? null"
            />

            <FederationMetaConsensusCard
              v-if="
                showRawMetaConsensusCard &&
                (isLoadingMetaConsensus || metaConsensusError != null || metaConsensusValue != null)
              "
              :metadata="metaConsensusValue"
              :is-loading="isLoadingMetaConsensus"
              :error="metaConsensusError"
            />
          </section>

          <LeaveFederationCard @leave="leaveFederation" />
        </div>
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
import { getWalletNameForFederationId, useWalletStore } from 'src/stores/wallet'
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
import { federationHasModule } from 'src/utils/federationModules'

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

const gatewayCountLabel = computed(() => {
  const count = walletGateways.value.length
  return count > 0 ? `${count} gateways` : ''
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
    const shouldLoadMetaConsensus =
      showRawMetaConsensusCard && federationHasModule(currentFederation, 'meta')
    isLoadingMetaConsensus.value = shouldLoadMetaConsensus

    try {
      await ensureFederationWalletOpen(currentFederation)

      const [utxos, gateways, metadata] = await Promise.all([
        walletStore.getSpendableUtxos(),
        loadWalletGateways(),
        shouldLoadMetaConsensus ? loadMetaConsensusValue() : Promise.resolve(null),
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

async function ensureFederationWalletOpen(currentFederation: NonNullable<typeof federation.value>) {
  const walletName = getWalletNameForFederationId(currentFederation.federationId)

  if (federationStore.selectedFederationId !== currentFederation.federationId) {
    await federationStore.selectFederation(currentFederation)
    return
  }

  if (walletStore.activeWalletName !== walletName || walletStore.wallet == null) {
    await walletStore.openWallet()
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
  box-sizing: border-box;
  width: 100%;
  padding: var(--vipr-federation-detail-content-padding);
  max-width: min(var(--vipr-width-mobile), 100vw);
  margin: 0 auto;
  overflow-x: clip;
}

.federation-section-stack {
  min-width: 0;
  display: grid;
  gap: var(--vipr-space-5);
  margin-top: var(--vipr-space-5);
}

.federation-details-content :deep(.federation-card) {
  margin-bottom: 0;
}

.federation-details-content :deep(.federation-section-title) {
  margin-bottom: var(--vipr-space-2);
}

.federation-open-section,
.federation-trust-section,
.federation-advanced-section {
  min-width: 0;
  display: grid;
  gap: var(--vipr-space-3);
}

.federation-details-page {
  background: var(--vipr-color-page);
  overflow-x: clip;
}

.federation-section-header {
  display: grid;
  gap: var(--vipr-space-1);
}

.federation-section-heading {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-caption);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
}

.federation-section-caption {
  color: var(--vipr-text-muted);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-tight);
}

.federation-trust-section :deep(.federation-card),
.federation-trust-section :deep(.federation-gateways) {
  margin-bottom: 0;
}

.federation-advanced-section :deep(.federation-card) {
  margin-bottom: 0;
}
</style>
