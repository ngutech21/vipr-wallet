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
      class="home-empty-state column items-center justify-center full-height"
      style="flex: 1"
    >
      <div class="text-h6">Ready to start?</div>
      <div class="text-subtitle7">Join a federation to get up and running</div>
      <q-btn
        no-caps
        unelevated
        label="Join a federation"
        class="home-empty-state__action q-mt-md"
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
          class="home-action-btn"
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
          class="home-action-btn home-action-btn--icon"
          :to="'/scan'"
          :data-testid="'home-scan-btn'"
        />
        <q-btn
          no-caps
          unelevated
          label="Receive"
          icon="arrow_downward"
          color="primary"
          class="home-action-btn"
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
  gap: 16px;
  max-width: 700px;
  margin: 0 auto;
  padding-top: calc(16px + env(safe-area-inset-top));
}

.home-empty-state {
  padding: 0 24px 120px;
  text-align: center;
}

.home-empty-state__action {
  min-height: 48px;
  min-width: min(100%, 230px);
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(162, 43, 255, 1), rgba(116, 0, 255, 0.96)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0));
  box-shadow:
    0 6px 13px rgba(111, 0, 255, 0.13),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  color: white;
}

.hero-card {
  background:
    radial-gradient(circle at top left, rgba(156, 39, 255, 0.18), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 18px 20px 16px;
  text-align: center;
}

.hero-balance {
  font-size: clamp(2rem, 6vw, 2.75rem);
  line-height: 1.05;
  font-weight: 700;
  color: white;
}

.hero-federation {
  margin-top: 14px;
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
  gap: 12px;
  width: min(calc(100vw - 32px), 420px);
  padding-bottom: 14px;
}

.home-action-btn {
  flex: 0 1 148px;
  min-width: 0;
  min-height: 52px;
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(162, 43, 255, 1), rgba(116, 0, 255, 0.96)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0));
  box-shadow:
    0 7px 16px rgba(111, 0, 255, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  color: white;
}

.home-action-btn--icon {
  flex: 0 0 62px;
  width: 62px;
  min-width: 62px;
  padding: 0;
}

.home-action-btn :deep(.q-btn__content) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  gap: 10px;
  font-size: 1rem;
  line-height: 1;
}

.home-action-btn :deep(.q-icon) {
  margin: 0;
  font-size: 1.35rem;
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
  gap: 10px;
  font-size: 1rem;
  line-height: 1;
}

.home-empty-state__action :deep(.q-icon) {
  margin: 0;
  font-size: 1.25rem;
}

.home-empty-state__action :deep(.block) {
  white-space: nowrap;
  line-height: 1;
}

.home-transactions {
  padding-bottom: 96px;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

@media (max-width: 599px) {
  .home-actions {
    width: min(calc(100vw - 28px), 420px);
    gap: 10px;
  }

  .home-action-btn {
    flex: 1 1 0;
    min-height: 50px;
  }

  .home-empty-state__action {
    min-height: 48px;
  }

  .home-action-btn--icon {
    flex: 0 0 56px;
    width: 56px;
    min-width: 56px;
  }
}
</style>
