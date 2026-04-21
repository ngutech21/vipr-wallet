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

    <q-dialog v-model="showDiscover" position="bottom">
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

    <section class="home-hero q-pa-md">
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
      class="column items-center justify-center full-height"
      style="flex: 1"
    >
      <div class="text-h6">Ready to start?</div>
      <div class="text-subtitle7">Join a Federation to get up and running</div>
      <q-btn
        label="Join a federation"
        color="primary"
        class="q-mt-md"
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
      :offset="[0, 28]"
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
          outline
          label="Scan"
          color="white"
          icon="qr_code_scanner"
          class="home-action-btn home-action-btn--secondary"
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

function openAddFederationPreview(payload: DiscoverySelectionPayload) {
  selectedInviteCode.value = payload.inviteCode
  selectedPreviewFederation.value = payload.prefetchedFederation ?? null
  addFederationBackTarget.value = 'discover'
  showDiscover.value = false
  showAdd.value = true
}

function closeAddFederation() {
  showAdd.value = false
  selectedInviteCode.value = null
  selectedPreviewFederation.value = null
  addFederationBackTarget.value = 'invite'
}

function returnToDiscovery() {
  showAdd.value = false
  selectedInviteCode.value = null
  selectedPreviewFederation.value = null
  addFederationBackTarget.value = 'invite'
  showDiscover.value = true
}
</script>

<style scoped>
.home-hero {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: min(100%, 520px);
}

.home-action-btn {
  min-height: 56px;
  border-radius: 18px;
}

.home-action-btn--secondary {
  border-color: rgba(255, 255, 255, 0.18);
  color: white;
}

.home-transactions {
  padding-bottom: 96px;
}

@media (max-width: 520px) {
  .home-actions {
    grid-template-columns: 1fr;
  }
}
</style>
