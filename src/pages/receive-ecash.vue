<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <transition
    appear
    enter-active-class="animated slideInRight"
    leave-active-class="animated slideOutRight"
  >
    <q-page class="column dark-gradient">
      <q-dialog v-model="showAddFederationDialog" position="bottom">
        <AddFederation
          :initial-invite-code="inspection?.inviteCode ?? null"
          :auto-preview="inspection?.inviteCode != null"
          :import-amount-sats="inspection?.amountSats ?? null"
          @close="handleFederationJoined"
        />
      </q-dialog>

      <q-toolbar class="header-section">
        <q-btn
          flat
          round
          icon="arrow_back"
          :to="{ name: '/' }"
          data-testid="receive-ecash-back-btn"
        />
        <q-toolbar-title class="text-center no-wrap">Receive Offline</q-toolbar-title>
        <div class="q-ml-md" style="width: 40px"></div>
      </q-toolbar>

      <div class="q-px-md q-pt-md">
        <q-card flat class="glass-effect q-mb-md">
          <q-card-section>
            <q-input
              v-model="ecashToken"
              filled
              autogrow
              dense
              dark
              type="textarea"
              placeholder="Paste eCash token here"
              class="custom-input"
              data-testid="receive-ecash-token-input"
            >
              <template #after>
                <q-btn
                  round
                  dense
                  flat
                  icon="content_paste"
                  @click="pasteFromClipboard"
                  data-testid="receive-ecash-paste-btn"
                />
              </template>
            </q-input>
          </q-card-section>
        </q-card>

        <q-card
          v-if="inspection != null"
          flat
          class="glass-effect q-mb-md"
          data-testid="ecash-preview-card"
        >
          <q-card-section>
            <div class="text-subtitle1">Import Preview</div>
            <div class="text-h4 q-mt-sm" data-testid="ecash-preview-amount">
              {{ formatNumber(inspection.amountSats) }} sats
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">
              {{ federationStatusLabel }}
            </div>
          </q-card-section>
        </q-card>

        <q-card
          v-if="inspection?.matchedFederation != null"
          flat
          class="glass-effect q-mb-md"
          data-testid="ecash-preview-federation-card"
        >
          <q-card-section class="row items-center no-wrap">
            <q-avatar
              v-if="inspection.matchedFederation.metadata?.federation_icon_url"
              size="56px"
              class="q-mr-md"
            >
              <q-img
                :src="inspection.matchedFederation.metadata.federation_icon_url"
                loading="eager"
                no-spinner
              />
            </q-avatar>
            <q-avatar v-else size="56px" color="grey-3" text-color="grey-8" class="q-mr-md">
              <q-icon name="account_balance" />
            </q-avatar>

            <div class="col">
              <div class="text-h6">{{ inspection.matchedFederation.title }}</div>
              <div class="text-caption text-grey-5 federation-id">
                {{ inspection.matchedFederation.federationId }}
              </div>
              <div
                v-if="inspection.matchedFederation.metadata?.default_currency"
                class="text-caption text-grey-6 q-mt-xs"
              >
                {{ inspection.matchedFederation.metadata.default_currency }}
              </div>
            </div>
          </q-card-section>
        </q-card>

        <FederationGuardians
          v-if="inspection?.matchedFederation != null"
          :guardians="inspection.matchedFederation.guardians ?? []"
          class="q-mb-md"
        />

        <q-card
          v-if="inspection != null && inspection.matchedFederation == null"
          flat
          class="glass-effect q-mb-md"
        >
          <q-card-section>
            <div class="text-subtitle1">Federation Status</div>
            <div class="text-body2 q-mt-sm">
              <template v-if="inspection.requiresJoin">
                This ecash belongs to an unknown federation. Preview the federation and join it
                before importing the notes.
              </template>
              <template v-else>
                This ecash belongs to an unknown federation and does not include an invite code.
              </template>
            </div>
          </q-card-section>
        </q-card>

        <div class="q-mt-lg">
          <q-btn
            v-if="inspection == null"
            label="Preview ecash"
            color="primary"
            class="full-width q-py-sm"
            size="lg"
            :loading="isProcessing"
            :disable="!ecashToken.trim() || isProcessing"
            @click="inspectEcashToken()"
            data-testid="receive-ecash-submit-btn"
            :data-busy="isProcessing ? 'true' : 'false'"
          >
            <template #loading>
              <q-spinner-dots color="white" />
            </template>
          </q-btn>

          <q-btn
            v-else-if="inspection.matchedFederation != null"
            label="Import eCash"
            color="primary"
            class="full-width q-py-sm"
            size="lg"
            :loading="isProcessing"
            :disable="isProcessing"
            @click="importEcash"
            data-testid="receive-ecash-import-btn"
            :data-busy="isProcessing ? 'true' : 'false'"
          >
            <template #loading>
              <q-spinner-dots color="white" />
            </template>
          </q-btn>

          <q-btn
            v-else-if="inspection.requiresJoin"
            label="Preview Federation"
            color="primary"
            class="full-width q-py-sm"
            size="lg"
            :disable="isProcessing"
            @click="showAddFederationDialog = true"
            data-testid="receive-ecash-join-btn"
          />
        </div>
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ReceiveEcashPage',
})

import { computed, ref, watch } from 'vue'
import { Loading, useQuasar } from 'quasar'
import { useRoute, useRouter, type LocationQueryValue } from 'vue-router'
import AddFederation from 'src/components/AddFederation.vue'
import FederationGuardians from 'src/components/FederationGuardians.vue'
import { useFormatters } from 'src/utils/formatter'
import { getErrorMessage } from 'src/utils/error'
import { useWalletStore, type EcashInspection } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'

const ecashToken = ref('')
const inspection = ref<EcashInspection | null>(null)
const isProcessing = ref(false)
const showAddFederationDialog = ref(false)

const $q = useQuasar()
const route = useRoute('/receive-ecash')
const router = useRouter()
const walletStore = useWalletStore()
const federationStore = useFederationStore()
const { formatNumber } = useFormatters()

const federationStatusLabel = computed(() => {
  if (inspection.value == null) {
    return ''
  }

  if (inspection.value.matchedFederation != null) {
    return 'Known federation ready to import'
  }

  if (inspection.value.requiresJoin) {
    return 'Unknown federation, join required before import'
  }

  return 'Unknown federation, import unavailable without invite code'
})

watch(ecashToken, () => {
  inspection.value = null
})

watch(
  () => route.query.token,
  async (token) => {
    const nextToken = getQueryString(token)
    if (nextToken === '') {
      return
    }

    ecashToken.value = nextToken
    await inspectEcashToken(false)
  },
  { immediate: true },
)

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    ecashToken.value = text
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Unable to access clipboard ${getErrorMessage(error)}`,
      position: 'top',
    })
  }
}

async function inspectEcashToken(showLoading = true) {
  const token = ecashToken.value.trim()
  if (token === '') {
    return
  }

  try {
    isProcessing.value = true
    if (showLoading) {
      Loading.show({ message: 'Parsing eCash...' })
    }

    inspection.value = await walletStore.inspectEcash(token)
  } catch (error) {
    inspection.value = null
    $q.notify({
      type: 'negative',
      message: `Failed to inspect eCash: ${getErrorMessage(error)}`,
      position: 'top',
    })
  } finally {
    isProcessing.value = false
    if (showLoading) {
      Loading.hide()
    }
  }
}

async function handleFederationJoined() {
  showAddFederationDialog.value = false
  await inspectEcashToken(false)

  if (inspection.value?.matchedFederation != null) {
    $q.notify({
      type: 'positive',
      message: 'Federation joined. Review the import and confirm.',
      position: 'top',
    })
  }
}

async function importEcash() {
  const preview = inspection.value
  if (preview == null || preview.matchedFederation == null) {
    return
  }

  try {
    isProcessing.value = true
    Loading.show({ message: 'Importing eCash...' })

    await federationStore.selectFederation(preview.matchedFederation)
    await walletStore.redeemEcash(ecashToken.value.trim())

    await router.push({
      name: '/received-lightning',
      query: { amount: preview.amountSats.toString() },
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to import eCash: ${getErrorMessage(error)}`,
      position: 'top',
    })
  } finally {
    isProcessing.value = false
    Loading.hide()
  }
}

function getQueryString(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  const firstValue = Array.isArray(value) ? value[0] : value
  return typeof firstValue === 'string' ? firstValue : ''
}
</script>

<style scoped>
.custom-input :deep(.q-field__control) {
  background-color: rgba(255, 255, 255, 0.05);
}

.custom-input :deep(.q-field__native),
.custom-input :deep(.q-field__prefix),
.custom-input :deep(.q-field__suffix),
.custom-input :deep(.q-field__input) {
  color: white;
}

.glass-effect {
  background-color: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border-radius: 16px;
}

.federation-id {
  word-break: break-all;
}
</style>
