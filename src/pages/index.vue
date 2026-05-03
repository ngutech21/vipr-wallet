<template>
  <q-page class="home-page" data-testid="home-page">
    <FederationJoinDialogs :flow="federationJoinFlow" />

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
      />
    </q-dialog>

    <section v-if="federationStore.federations.length > 0" class="home-hero">
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
            <q-icon name="account_balance" class="hero-federation__icon" />
            {{ federationStore.selectedFederation.title }}
          </q-chip>
        </div>
      </div>
    </section>

    <div
      v-if="federationStore.federations.length == 0"
      class="home-empty-state vipr-empty-state vipr-empty-state--hero"
    >
      <div class="vipr-empty-state__title">Ready to start?</div>
      <div class="vipr-empty-state__body">Join a federation to get up and running</div>
      <q-btn
        no-caps
        unelevated
        label="Join a federation"
        class="home-empty-state__action vipr-btn vipr-btn--primary-soft vipr-btn--md"
        icon="add"
        @click="federationJoinFlow.openSelection"
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
      <div class="home-actions">
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
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import FederationJoinDialogs from 'src/components/FederationJoinDialogs.vue'
import TransactionsList from 'src/components/TransactionsList.vue'
import { useFederationJoinFlow } from 'src/composables/useFederationJoinFlow'

const SendEcashSelection = defineAsyncComponent(
  () => import('src/components/SendEcashSelection.vue'),
)
const ReceiveEcashSelection = defineAsyncComponent(
  () => import('src/components/ReceiveEcashSelection.vue'),
)

const federationStore = useFederationStore()
const walletStore = useWalletStore()
const totalBalance = computed(() => walletStore.balance)
const federationJoinFlow = useFederationJoinFlow()
const showSendEcashSelection = ref(false)
const showReceiveEcashSelection = ref(false)
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
  margin-top: var(--vipr-space-4);
  min-width: var(--vipr-home-empty-action-width);
}

.home-page {
  display: flex;
  flex-direction: column;
}

.home-empty-state {
  min-height: 100%;
  flex: 1 1 auto;
}

.home-hero {
  padding: var(--vipr-space-4);
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

.hero-federation__icon {
  margin-right: var(--vipr-space-2);
}

.home-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--vipr-home-action-gap);
  width: var(--vipr-home-actions-width);
  padding-right: var(--vipr-space-4);
  padding-bottom: var(--vipr-row-padding-y);
  padding-left: var(--vipr-space-4);
}

.home-action-btn {
  flex: 0 1 var(--vipr-home-action-button-width);
  min-width: 0;
  min-height: var(--vipr-home-action-height);
  background: var(--vipr-home-action-bg) !important;
  box-shadow: var(--vipr-home-action-shadow) !important;
}

.home-action-btn--icon {
  flex: 0 0 var(--vipr-home-action-icon-width);
  width: var(--vipr-home-action-icon-width);
  min-width: var(--vipr-home-action-icon-width);
  padding: 0;
  background: var(--vipr-home-action-bg-secondary) !important;
  box-shadow: var(--vipr-home-action-shadow-secondary) !important;
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
