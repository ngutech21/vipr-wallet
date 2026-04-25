<template>
  <q-page class="column" data-testid="home-page">
    <q-dialog
      v-model="showSelection"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <AddFederationSelection
        v-if="showSelection"
        @close="showSelection = false"
        @show-discover="showDiscover = true"
        @show-add="showAdd = true"
      />
    </q-dialog>

    <q-dialog v-model="showDiscover" position="bottom" @hide="onDiscoverHide">
      <DiscoverFederations
        v-if="showDiscover"
        :visible="showDiscover"
        @close="showDiscover = false"
        @show-add="openAddFederationPreview"
      />
    </q-dialog>

    <q-dialog v-model="showAdd" position="bottom">
      <AddFederation
        v-if="showAdd"
        :back-target="addFederationBackTarget"
        @close="closeAddFederation"
        @back="returnToDiscovery"
        :initial-invite-code="selectedInviteCode"
        :initial-preview-federation="selectedPreviewFederation"
        :auto-preview="selectedInviteCode != null"
      />
    </q-dialog>

    <q-dialog
      v-model="showSendEcashSelection"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <SendEcashSelection v-if="showSendEcashSelection" @close="showSendEcashSelection = false" />
    </q-dialog>

    <q-dialog
      v-model="showReceiveEcashSelection"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <ReceiveEcashSelection
        v-if="showReceiveEcashSelection"
        @close="showReceiveEcashSelection = false"
        @show-discover="showReceiveEcashSelection = true"
        @show-add="showAdd = true"
      />
    </q-dialog>

    <section v-if="federationStore.federations.length > 0" class="home-hero q-pa-md">
      <div class="hero-card">
        <div class="hero-balance" data-testid="home-balance">
          {{ Math.ceil(totalBalance).toLocaleString() }} sats
        </div>

        <div v-if="federationStore.selectedFederation" class="hero-federation">
          <q-chip
            class="hero-federation__chip"
            color="white"
            text-color="primary"
            outline
            data-testid="home-selected-federation-chip"
          >
            <q-icon name="account_balance" class="q-mr-sm" />
            {{ federationStore.selectedFederation.title }}
          </q-chip>
        </div>
      </div>
    </section>

    <div
      v-if="federationStore.federations.length == 0"
      class="home-empty-state vipr-empty-state vipr-empty-state--hero full-height"
      style="flex: 1"
    >
      <div class="vipr-empty-state__title">Ready to start?</div>
      <div class="vipr-empty-state__body">Join a federation to get up and running</div>
      <q-btn
        no-caps
        unelevated
        label="Join a federation"
        class="home-empty-state__action vipr-btn vipr-btn--primary-soft vipr-btn--md q-mt-md"
        icon="add"
        @click="showSelection = true"
        :data-testid="'home-join-federation-btn'"
      />
    </div>

    <div v-if="federationStore.federations.length > 0" class="home-transactions">
      <TransactionsList mode="home" />
    </div>

    <q-page-sticky
      v-if="federationStore.federations.length > 0"
      position="bottom"
      :offset="[0, 52]"
    >
      <div class="home-actions q-px-md">
        <q-btn
          no-caps
          unelevated
          label="Send"
          icon="arrow_upward"
          color="primary"
          class="home-action-btn vipr-btn vipr-btn--primary-soft vipr-btn--lg"
          @click="showSendEcashSelection = true"
          :disable="totalBalance <= 0"
          :data-testid="'home-send-btn'"
        />
        <q-btn
          no-caps
          unelevated
          aria-label="Scan"
          color="primary"
          icon="qr_code_scanner"
          class="home-action-btn home-action-btn--icon vipr-btn vipr-btn--primary-soft vipr-btn--lg"
          :to="'/scan'"
          :data-testid="'home-scan-btn'"
        />
        <q-btn
          no-caps
          unelevated
          label="Receive"
          icon="arrow_downward"
          color="primary"
          class="home-action-btn vipr-btn vipr-btn--primary-soft vipr-btn--lg"
          @click="showReceiveEcashSelection = true"
          :data-testid="'home-receive-btn'"
        />
      </div>
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, defineAsyncComponent } from 'vue'

defineOptions({
  name: 'IndexPage',
})
import type { DiscoverySelectionPayload, Federation } from 'src/types/federation'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import TransactionsList from 'src/components/TransactionsList.vue'

const AddFederationSelection = defineAsyncComponent(
  () => import('src/components/AddFederationSelection.vue'),
)
const SendEcashSelection = defineAsyncComponent(
  () => import('src/components/SendEcashSelection.vue'),
)
const DiscoverFederations = defineAsyncComponent(
  () => import('src/components/DiscoverFederations.vue'),
)
const AddFederation = defineAsyncComponent(() => import('src/components/AddFederation.vue'))
const ReceiveEcashSelection = defineAsyncComponent(
  () => import('src/components/ReceiveEcashSelection.vue'),
)

const federationStore = useFederationStore()
const walletStore = useWalletStore()
const totalBalance = computed(() => walletStore.balance)
const showSelection = ref(false)
const showSendEcashSelection = ref(false)
const showReceiveEcashSelection = ref(false)
const showDiscover = ref(false)
const showAdd = ref(false)
const selectedInviteCode = ref<string | null>(null)
const selectedPreviewFederation = ref<Federation | null>(null)
const addFederationBackTarget = ref<'invite' | 'discover'>('invite')
const pendingDiscoverySelection = ref<DiscoverySelectionPayload | null>(null)

function openAddFederationPreview(payload: DiscoverySelectionPayload) {
  pendingDiscoverySelection.value = payload
  if (showDiscover.value) {
    showDiscover.value = false
    return
  }
  applyDiscoverySelection(payload)
}

function onDiscoverHide() {
  if (pendingDiscoverySelection.value == null) {
    return
  }

  applyDiscoverySelection(pendingDiscoverySelection.value)
}

function applyDiscoverySelection(payload: DiscoverySelectionPayload) {
  selectedInviteCode.value = payload.inviteCode
  selectedPreviewFederation.value = payload.prefetchedFederation ?? null
  addFederationBackTarget.value = 'discover'
  pendingDiscoverySelection.value = null
  showAdd.value = true
}

function closeAddFederation() {
  showAdd.value = false
  selectedInviteCode.value = null
  selectedPreviewFederation.value = null
  addFederationBackTarget.value = 'invite'
  pendingDiscoverySelection.value = null
}

function returnToDiscovery() {
  showAdd.value = false
  selectedInviteCode.value = null
  selectedPreviewFederation.value = null
  addFederationBackTarget.value = 'invite'
  pendingDiscoverySelection.value = null
  showDiscover.value = true
}
</script>

<style scoped>
.home-hero {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--vipr-space-4);
  max-width: var(--vipr-width-mobile);
  margin: 0 auto;
  padding-top: calc(var(--vipr-space-4) + env(safe-area-inset-top));
}

.home-empty-state {
  padding: var(--vipr-space-0) var(--vipr-space-6) var(--vipr-home-empty-state-bottom-space);
}

.home-empty-state__action {
  min-width: var(--vipr-home-empty-action-width);
}

.hero-card {
  background: var(--vipr-home-hero-bg);
  border: 1px solid var(--vipr-home-hero-border);
  border-radius: var(--vipr-radius-card);
  padding: var(--vipr-home-hero-padding);
  text-align: center;
}

.hero-balance {
  font-size: var(--vipr-home-balance-font-size);
  line-height: var(--vipr-line-height-tight);
  font-weight: 700;
  color: var(--vipr-text-primary);
}

.hero-federation {
  margin-top: var(--vipr-row-padding-y);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-federation__chip {
  max-width: 100%;
}

.home-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--vipr-home-action-gap);
  width: var(--vipr-home-actions-width);
  padding-bottom: var(--vipr-row-padding-y);
}

.home-action-btn {
  flex: 0 1 var(--vipr-home-action-button-width);
  min-width: 0;
  min-height: var(--vipr-home-action-height);
}

.home-action-btn--icon {
  flex: 0 0 var(--vipr-home-action-icon-width);
  width: var(--vipr-home-action-icon-width);
  min-width: var(--vipr-home-action-icon-width);
  padding: 0;
}

.home-action-btn :deep(.q-btn__content) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: var(--vipr-space-3);
  font-size: var(--vipr-font-size-body);
  line-height: 1;
}

.home-action-btn :deep(.q-icon) {
  margin: 0;
  font-size: var(--vipr-home-action-icon-size);
}

.home-action-btn :deep(.block) {
  white-space: nowrap;
  line-height: 1;
}

.home-action-btn--icon :deep(.q-btn__content) {
  gap: 0;
}

.home-empty-state__action :deep(.q-btn__content) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: var(--vipr-space-3);
  font-size: var(--vipr-font-size-body);
  line-height: 1;
}

.home-empty-state__action :deep(.q-icon) {
  margin: 0;
  font-size: var(--vipr-home-empty-action-icon-size);
}

.home-empty-state__action :deep(.block) {
  white-space: nowrap;
  line-height: 1;
}

.home-transactions {
  padding-bottom: var(--vipr-home-transactions-bottom-space);
  width: 100%;
  max-width: var(--vipr-width-mobile);
  margin: 0 auto;
}

@media (max-width: 599px) {
  .home-actions {
    width: var(--vipr-home-actions-width-mobile);
    gap: var(--vipr-home-action-gap-mobile);
  }

  .home-action-btn {
    flex: 1 1 0;
    min-height: var(--vipr-home-action-height-mobile);
  }

  .home-empty-state__action {
    min-height: var(--vipr-home-empty-action-height-mobile);
  }

  .home-action-btn--icon {
    flex: 0 0 var(--vipr-home-action-icon-width-mobile);
    width: var(--vipr-home-action-icon-width-mobile);
    min-width: var(--vipr-home-action-icon-width-mobile);
  }
}
</style>
