<template>
  <transition
    appear
    enter-active-class="animated slideInLeft fast"
    leave-active-class="animated slideOutLeft fast"
    mode="out-in"
  >
    <q-layout view="lHh Lpr lFf">
      <q-page-container>
        <q-page>
          <q-toolbar class="header-section">
            <q-btn flat round icon="arrow_back" :to="'/federations'" />
            <q-toolbar-title class="text-center no-wrap">Federation Details</q-toolbar-title>
            <div class="q-ml-md" style="width: 40px"></div>
          </q-toolbar>
          <div class="q-px-md">
            <!-- Federation Header Card -->
            <q-card flat class="q-mb-md">
              <q-card-section class="row items-center">
                <div class="col-auto">
                  <q-avatar
                    size="72px"
                    class="q-mr-md"
                    v-if="federation?.metadata?.federation_icon_url"
                  >
                    <q-img
                      :src="federation?.metadata?.federation_icon_url"
                      loading="eager"
                      no-spinner
                      no-transition
                    />
                  </q-avatar>
                  <template v-else>
                    <q-avatar color="grey-3" text-color="grey-7" class="logo q-mr-md">
                      <q-icon name="account_balance" />
                    </q-avatar>
                  </template>
                </div>
                <div class="col">
                  <div class="text-h6">{{ federation?.title }}</div>
                  <div class="text-subtitle2 text-grey">
                    {{ federation?.metadata?.default_currency }}
                  </div>
                  <div class="q-mt-sm row items-center">
                    <q-chip
                      v-for="module in federation?.modules"
                      :key="module.kind"
                      color="positive"
                      text-color="black"
                      size="sm"
                      class="q-mr-xs"
                    >
                      {{ module.kind }}
                    </q-chip>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <div class="text-subtitle1 q-mb-xs">Details</div>
            <q-card flat class="q-mb-md" v-if="federation?.metadata">
              <q-card-section>
                <q-list>
                  <q-item v-if="federation?.metadata?.max_balance_msats">
                    <q-item-section>
                      <q-item-label caption>Maximum Balance</q-item-label>
                      <q-item-label class="text-body1">
                        {{ formatNumber(parseInt(federation?.metadata?.max_balance_msats) / 1000) }}
                        sats
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-separator inset />

                  <q-item v-if="federation?.metadata?.max_invoice_msats">
                    <q-item-section>
                      <q-item-label caption>Maximum Invoice</q-item-label>
                      <q-item-label class="text-body1">
                        {{ formatNumber(parseInt(federation?.metadata?.max_invoice_msats) / 1000) }}
                        sats
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-separator inset />

                  <q-item>
                    <q-item-section v-if="federation?.metadata?.public">
                      <q-item-label caption>Public Federation</q-item-label>
                      <q-item-label class="text-body1">
                        <q-chip
                          :color="
                            federation?.metadata?.public === 'true' ? 'positive' : 'blue-grey'
                          "
                          text-color="black"
                          size="sm"
                        >
                          <q-icon
                            :name="
                              federation?.metadata?.public === 'true' ? 'public' : 'public_off'
                            "
                            left
                            size="xs"
                          />
                          {{ federation?.metadata?.public === 'true' ? 'Public' : 'Private' }}
                        </q-chip>
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <div class="text-subtitle1 q-mb-xs" v-if="hasMessages">Messages</div>
            <q-card flat class="q-mb-md" v-if="hasMessages">
              <q-card-section>
                <q-list>
                  <template v-if="federation?.metadata?.preview_message">
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Preview Message</q-item-label>
                        <q-item-label class="text-body1">{{
                          federation?.metadata?.preview_message
                        }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-separator inset />
                  </template>

                  <template v-if="federation?.metadata?.popup_countdown_message">
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>End Message</q-item-label>
                        <q-item-label class="text-body1">
                          {{ federation?.metadata?.popup_countdown_message }}
                          <template v-if="federation?.metadata?.popup_end_timestamp">
                            <br /><span class="text-caption"
                              >Ends:
                              {{ formatDate(federation?.metadata?.popup_end_timestamp) }}</span
                            >
                          </template>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-list>
              </q-card-section>
            </q-card>

            <q-card flat class="q-mb-md" v-if="federation?.metadata?.tos_url">
              <q-card-section>
                <q-list>
                  <q-item clickable tag="a" :href="federation?.metadata?.tos_url" target="_blank">
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
                  <q-btn
                    flat
                    label="Leave"
                    color="negative"
                    @click="leaveFederation"
                    v-close-popup
                  />
                </q-card-actions>
              </q-card>
            </q-dialog>
          </div>
        </q-page>
      </q-page-container>
    </q-layout>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import { useFormatters } from '../utils/formatter'

const { formatNumber } = useFormatters()
const route = useRoute()
const router = useRouter()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const federation = federationStore.federations.find((f) => f.federationId === route.params.id)
const confirmLeave = ref(false)

const hasMessages = computed(() => {
  return federation?.metadata?.preview_message || federation?.metadata?.popup_countdown_message
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
</script>
<style scoped>
.q-card {
  background-color: #202020;
}
.q-card-section {
  padding: 16px;
}
</style>
