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
      />
    </q-dialog>

    <q-dialog v-model="showAdd" position="bottom">
      <AddFederation v-if="showAdd" @close="showAdd = false" />
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

    <div class="text-white q-pa-md dark-bg" style="width: 100%">
      <div class="text-h4 text-center">{{ Math.ceil(totalBalance).toLocaleString() }} sats</div>

      <div class="text-center" v-if="federationStore.selectedFederation">
        <q-chip class="q-mt-sm" color="white" text-color="primary" outline>
          <q-icon name="account_balance" class="q-mr-sm" />
          {{ federationStore.selectedFederation?.title }}
        </q-chip>
      </div>
    </div>

    <TransactionsList />

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
        data-testid="home-join-federation-btn"
      />
    </div>

    <!-- Added fixed bottom buttons using q-page-sticky -->
    <q-page-sticky
      position="bottom"
      :offset="[0, 50]"
      v-if="federationStore.federations.length > 0"
    >
      <div class="q-pa-md">
        <div class="row items-center justify-evenly q-gutter-md">
          <q-btn
            label="Send"
            icon="arrow_upward"
            color="primary"
            :to="'/send'"
            :disable="totalBalance <= 0"
            data-testid="home-send-btn"
          />
          <q-btn
            label=""
            color="primary"
            icon="qr_code_scanner"
            :to="'/scan'"
            data-testid="home-scan-btn"
          />
          <q-btn
            label="Receive"
            icon="arrow_downward"
            color="primary"
            @click="showReceiveEcashSelection = true"
            data-testid="home-receive-btn"
          />
        </div>
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
import TransactionsList from 'src/components/TransactionsList.vue'

const AddFederationSelection = defineAsyncComponent(
  () => import('src/components/AddFederationSelection.vue'),
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
const showReceiveEcashSelection = ref(false)
const showDiscover = ref(false)
const showAdd = ref(false)
</script>

<style scoped>
/* Target the q-btn that has the .small-label class */
.q-btn.small-label .q-btn__content .q-btn__label {
  font-size: 0.75rem !important;
  text-align: center;
}
.word-wrap {
  word-wrap: break-word;
  white-space: normal;
}
.dark-bg {
  background-color: #202020;
}
</style>
