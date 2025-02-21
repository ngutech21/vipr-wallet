<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page padding>
        <div class="row items-center q-mb-lg">
          <q-btn flat icon="arrow_back" :to="'/federations'" />
          <div class="text-h6 q-ml-sm">Federation Details</div>
        </div>

        <q-card v-if="metadata" flat bordered>
          <q-card-section>
            <div class="text-subtitle1 q-mb-md">{{ federation?.title }}</div>

            <q-list>
              <q-item>
                <q-item-section>
                  <q-img
                    :src="metadata.federation_icon_url"
                    style="height: 140px; max-width: 140px"
                  ></q-img>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />

              <q-item>
                <q-item-section>
                  <q-item-label caption>Currency</q-item-label>
                  <q-item-label>{{ metadata.default_currency }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />

              <q-item>
                <q-item-section>
                  <q-item-label caption>Public Federation</q-item-label>
                  <q-item-label>{{ metadata.public }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />

              <q-item>
                <q-item-section>
                  <q-item-label caption>Maximum Balance</q-item-label>
                  <q-item-label
                    >{{
                      formatNumber(parseInt(metadata.max_balance_msats) / 1000)
                    }}
                    sats</q-item-label
                  >
                </q-item-section>
              </q-item>
              <q-separator spaced inset />

              <q-item>
                <q-item-section>
                  <q-item-label caption>Maximum Invoice</q-item-label>
                  <q-item-label
                    >{{
                      formatNumber(parseInt(metadata.max_invoice_msats) / 1000)
                    }}
                    sats</q-item-label
                  >
                </q-item-section>
              </q-item>
              <q-separator spaced inset />

              <q-item v-if="metadata.welcome_message">
                <q-item-section>
                  <q-item-label caption>Welcome Message</q-item-label>
                  <q-item-label>{{ metadata.welcome_message }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />

              <q-item>
                <q-item-section>
                  <q-item-label caption>Preview Message</q-item-label>

                  <q-item-label>{{ metadata.preview_message }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />

              <q-item>
                <q-item-section>
                  <q-item-label caption>End Message</q-item-label>
                  <q-item-label>
                    {{ metadata.popup_end_timestamp }}
                  </q-item-label>
                  <q-item-label>{{ metadata.popup_countdown_message }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />

              <q-item v-if="metadata.tos_url">
                <q-item-section>
                  <q-item-label caption>Terms of Service</q-item-label>
                  <q-item-label>
                    <a :href="metadata.tos_url" target="_blank" class="text-primary">View Terms</a>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-separator spaced inset />
              <q-item>
                <q-item-section>
                  <q-item-label caption>Features</q-item-label>
                  <q-item-label>
                    <q-chip
                      :color="
                        metadata.onchain_deposits_disabled === 'true' ? 'negative' : 'positive'
                      "
                      text-color="white"
                      size="sm"
                    >
                      Onchain Deposits
                      {{ metadata.onchain_deposits_disabled === 'true' ? 'Disabled' : 'Enabled' }}
                    </q-chip>
                    <q-chip
                      :color="metadata.stability_pool_disabled === 'true' ? 'negative' : 'positive'"
                      text-color="white"
                      size="sm"
                    >
                      Stability Pool
                      {{ metadata.stability_pool_disabled === 'true' ? 'Disabled' : 'Enabled' }}
                    </q-chip>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <div v-else class="text-center q-pa-md">
          <q-spinner color="primary" size="3em" />
          <div class="text-grey q-mt-sm">Loading federation metadata...</div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import type { FederationMeta } from 'src/components/models'
import { useFormatters } from '../utils/formatter'

const { formatNumber } = useFormatters()
const route = useRoute()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const metadata = ref<FederationMeta | null>(null)
const federation = federationStore.federations.find((f) => f.federationId === route.params.id)

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
