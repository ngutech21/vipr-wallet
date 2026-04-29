<template>
  <SettingsSection
    icon="forum"
    label="Nostr"
    caption="Manage relays"
    data-testid="settings-nostr-section"
  >
    <div class="settings-section-title">Relays</div>
    <q-list bordered separator class="rounded-borders settings-list settings-block">
      <q-item v-for="(relay, index) in relays" :key="index">
        <q-item-section>
          <q-item-label>{{ relay }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            round
            dense
            icon="delete"
            color="negative"
            size="sm"
            @click="removeRelay(relay)"
            :data-testid="`settings-remove-relay-btn-${index}`"
          />
        </q-item-section>
      </q-item>

      <q-item v-if="relays.length === 0">
        <q-item-section>
          <q-item-label caption>No relays configured</q-item-label>
        </q-item-section>
      </q-item>
    </q-list>

    <div class="settings-relay-actions">
      <div class="settings-inline-grid settings-inline-grid--center">
        <div class="settings-inline-grid__main">
          <q-input
            v-model="newRelay"
            label="Add relay URL"
            filled
            dark
            dense
            placeholder="Must start with wss://"
            class="vipr-input relay-input"
            data-testid="settings-new-relay-input"
          />
        </div>
        <div class="settings-inline-grid__side">
          <q-btn
            label="Add"
            icon="add"
            color="primary"
            no-caps
            unelevated
            class="settings-action-full"
            :disable="!isValidRelayUrl"
            @click="addNewRelay"
            data-testid="settings-add-relay-btn"
          />
        </div>
      </div>

      <div class="settings-relay-reset">
        <q-btn
          label="Reset to Defaults"
          outline
          no-caps
          color="secondary"
          icon="settings_backup_restore"
          class="settings-action-btn settings-action-btn--secondary"
          @click="resetRelays"
          data-testid="settings-reset-relays-btn"
        />
      </div>
    </div>
  </SettingsSection>
</template>

<script setup lang="ts">
defineOptions({
  name: 'NostrRelaySettings',
})

import { computed, ref, watch } from 'vue'
import SettingsSection from 'src/components/settings/SettingsSection.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useNostrStore } from 'src/stores/nostr'

const nostrStore = useNostrStore()
const notify = useAppNotify()

const relays = ref(nostrStore.relays)
const newRelay = ref('')

watch(
  () => nostrStore.relays,
  (newRelays) => {
    relays.value = [...newRelays]
  },
  { deep: true },
)

const isValidRelayUrl = computed(() => {
  return newRelay.value !== '' && newRelay.value.startsWith('wss://')
})

async function addNewRelay() {
  if (isValidRelayUrl.value && (await nostrStore.addRelay(newRelay.value))) {
    notify.success(`Added relay: ${newRelay.value}`)
    newRelay.value = ''
  } else {
    notify.error('Invalid relay URL or already exists')
  }
}

async function removeRelay(relay: string) {
  if (await nostrStore.removeRelay(relay)) {
    notify.info(`Removed relay: ${relay}`)
  }
}

async function resetRelays() {
  await nostrStore.resetRelays()
  notify.info('Reset relays to defaults')
}
</script>
