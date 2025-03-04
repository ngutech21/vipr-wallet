<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page>
        <q-toolbar class="header-section">
          <q-btn flat round icon="arrow_back" :to="'/federations'" />
          <q-toolbar-title class="text-center no-wrap">Federation Details</q-toolbar-title>
          <div class="q-ml-md" style="width: 40px"></div>
        </q-toolbar>
        <div class="q-px-md">
          <template v-if="metadata">
            <!-- Federation Header Card -->
            <q-card flat class="q-mb-md">
              <q-card-section class="row items-center">
                <div class="col-auto">
                  <q-avatar size="72px" class="q-mr-md">
                    <q-img :src="metadata.federation_icon_url" />
                  </q-avatar>
                </div>
                <div class="col">
                  <div class="text-h6">{{ federation?.title }}</div>
                  <div class="text-subtitle2 text-grey">{{ metadata.default_currency }}</div>
                  <div class="q-mt-sm">
                    <q-chip
                      :color="metadata.onchain_deposits_disabled === true ? 'negative' : 'positive'"
                      text-color="white"
                      size="sm"
                    >
                      Onchain Deposits
                      {{ metadata.onchain_deposits_disabled === true ? 'Disabled' : 'Enabled' }}
                    </q-chip>
                    <q-chip
                      :color="metadata.stability_pool_disabled === true ? 'negative' : 'positive'"
                      text-color="white"
                      size="sm"
                    >
                      Stability Pool
                      {{ metadata.stability_pool_disabled === true ? 'Disabled' : 'Enabled' }}
                    </q-chip>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <div class="text-subtitle1 q-mb-xs">Details</div>
            <q-card flat class="q-mb-md">
              <q-card-section>
                <q-list>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Maximum Balance</q-item-label>
                      <q-item-label class="text-body1">
                        {{ formatNumber(parseInt(metadata.max_balance_msats) / 1000) }} sats
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-separator inset />

                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Maximum Invoice</q-item-label>
                      <q-item-label class="text-body1">
                        {{ formatNumber(parseInt(metadata.max_invoice_msats) / 1000) }} sats
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-separator inset />

                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Public Federation</q-item-label>
                      <q-item-label class="text-body1">
                        <q-chip
                          :color="metadata.public === 'true' ? 'positive' : 'blue-grey'"
                          text-color="white"
                          size="sm"
                        >
                          <q-icon
                            :name="metadata.public === 'true' ? 'public' : 'public_off'"
                            left
                            size="xs"
                          />
                          {{ metadata.public === 'true' ? 'Public' : 'Private' }}
                        </q-chip>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <div class="text-subtitle1 q-mb-xs">Messages</div>
            <q-card flat class="q-mb-md" v-if="hasMessages">
              <q-card-section>
                <q-list>
                  <template v-if="metadata.preview_message">
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Preview Message</q-item-label>
                        <q-item-label class="text-body1">{{
                          metadata.preview_message
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-separator inset />
                  </template>

                  <template v-if="metadata.popup_countdown_message">
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>End Message</q-item-label>
                        <q-item-label class="text-body1">
                          {{ metadata.popup_countdown_message }}
                          <template v-if="metadata.popup_end_timestamp">
                            <br /><span class="text-caption"
                              >Ends: {{ formatDate(metadata.popup_end_timestamp) }}</span
                            >
                          </template>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-list>
              </q-card-section>
            </q-card>

            <q-card flat class="q-mb-md" v-if="metadata.tos_url">
              <q-card-section>
                <q-list>
                  <q-item clickable tag="a" :href="metadata.tos_url" target="_blank">
                    <q-item-section avatar>
                      <q-icon name="description" color="primary" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Terms of Service</q-item-label>
                      <q-item-label caption
                        >View the federation's terms and conditions</q-item-label
                      >
                    </q-item-section>
                    <q-item-section side>
                      <q-icon name="open_in_new" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <!-- Actions Card -->
            <q-card flat>
              <q-card-section>
                <div class="q-pa-md">
                  <q-btn
                    label="Leave Federation"
                    color="negative"
                    outline
                    @click="confirmLeave = true"
                    icon="logout"
                    class="full-width"
                  />
                </div>
              </q-card-section>
            </q-card>
          </template>

          <div v-else class="text-center q-pa-lg">
            <q-spinner color="primary" size="3em" />
            <div class="text-grey q-mt-sm">Loading federation metadata...</div>
          </div>

          <!-- Confirmation Dialog -->
          <q-dialog v-model="confirmLeave">
            <q-card>
              <q-card-section class="row items-center">
                <q-avatar icon="warning" color="negative" text-color="white" />
                <span class="q-ml-sm">Leave Federation</span>
              </q-card-section>

              <q-card-section>
                Are you sure you want to leave this federation? This action cannot be undone.
              </q-card-section>

              <q-card-actions align="right">
                <q-btn flat label="Cancel" color="primary" v-close-popup />
                <q-btn flat label="Leave" color="negative" @click="leaveFederation" v-close-popup />
              </q-card-actions>
            </q-card>
          </q-dialog>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import type { FederationMeta } from 'src/components/models'
import { useFormatters } from '../utils/formatter'

const { formatNumber } = useFormatters()
const route = useRoute()
const router = useRouter()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const metadata = ref<FederationMeta | null>(null)
const federation = federationStore.federations.find((f) => f.federationId === route.params.id)
const confirmLeave = ref(false)

const hasMessages = computed(() => {
  return (
    metadata.value?.welcome_message ||
    metadata.value?.preview_message ||
    metadata.value?.popup_countdown_message
  )
})

function formatDate(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleString()
  } catch (e) {
    console.error('Error parsing date:', e)
    return timestamp
  }
}

async function leaveFederation() {
  if (federation) {
    await walletStore.closeWallet()
    federationStore.deleteFederation(federation.federationId)
    await walletStore.deleteFederationData(federation.federationId)
    await federationStore.selectFederation(undefined)
    await router.push('/federations')
  }
}

onMounted(async () => {
  if (walletStore.wallet && federation) {
    try {
      const meta = await walletStore.getMetadata(federation)
      if (meta) {
        console.log('Federation metadata:', meta)
        metadata.value = meta
      }
    } catch (error) {
      console.error('Error fetching metadata:', error)
    }
  }
})
</script>
<style scoped>
.q-card {
  background-color: #202020;
}
.q-card-section {
  padding: 16px;
}
</style>
