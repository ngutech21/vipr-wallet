<template>
  <SettingsSection
    icon="perm_contact_calendar"
    label="Contacts"
    caption="Sync nostr contacts"
    data-testid="settings-contacts-section"
  >
    <div class="contacts-section">
      <div class="settings-section-title">Sync Contacts</div>
      <q-input
        v-model="contactSourceValue"
        filled
        dark
        label="Nostr identifier"
        placeholder="user@domain.com or npub1..."
        class="vipr-input relay-input"
        data-testid="settings-contact-source-input"
      />

      <div class="settings-caption settings-muted settings-caption--spaced">
        Enter a NIP-05 identifier or npub for the account whose follows should be imported.
      </div>

      <div class="contacts-actions">
        <q-btn
          label="Sync contacts"
          color="primary"
          no-caps
          unelevated
          class="settings-action-full"
          :loading="isSyncingContacts"
          :disable="isSyncingContacts"
          @click="syncContacts"
          data-testid="settings-sync-contacts-btn"
        />
        <q-btn
          label="Clear contacts"
          outline
          no-caps
          color="secondary"
          class="settings-action-full contacts-action-secondary"
          :disable="isSyncingContacts"
          @click="clearContacts"
          data-testid="settings-clear-contacts-btn"
        />
      </div>

      <div v-if="contactSyncError" class="settings-error" data-testid="settings-contact-sync-error">
        {{ contactSyncError }}
      </div>

      <div class="contacts-summary">
        <div class="settings-caption settings-muted" data-testid="settings-contact-count">
          {{ syncedContacts.length }} imported contacts
        </div>
        <div
          v-if="lastSyncedLabel"
          class="settings-caption settings-muted settings-caption--spaced"
          data-testid="settings-contact-last-synced"
        >
          {{ lastSyncedLabel }}
        </div>
      </div>

      <q-list
        bordered
        separator
        class="rounded-borders settings-list settings-list--spaced"
        data-testid="settings-contact-list"
      >
        <q-item v-if="syncedContacts.length === 0">
          <q-item-section avatar>
            <div class="empty-contact-avatar" aria-hidden="true"></div>
          </q-item-section>
          <q-item-section>
            <q-item-label>No contacts imported yet</q-item-label>
            <q-item-label caption>
              Sync a NIP-05 or npub to import payable Nostr contacts.
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item
          v-for="contact in visibleContacts"
          :key="contact.pubkey"
          :data-testid="`settings-contact-item-${contact.pubkey}`"
        >
          <q-item-section avatar>
            <q-avatar v-if="contact.picture">
              <img :src="contact.picture" :alt="getContactDisplayName(contact)" />
            </q-avatar>
            <q-icon
              v-else
              name="account_circle"
              size="md"
              class="settings-contact-placeholder-icon"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ getContactDisplayName(contact) }}</q-item-label>
            <q-item-label caption>{{ getContactSubtitle(contact) }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-if="syncedContacts.length > 0" class="settings-contact-pagination">
        <div class="settings-caption settings-muted" data-testid="settings-contact-visible-count">
          Showing {{ visibleContacts.length }} of {{ syncedContacts.length }} contacts
        </div>
        <q-btn
          v-if="hasMoreContacts"
          label="Show more"
          flat
          no-caps
          color="primary"
          @click="showMoreContacts"
          data-testid="settings-show-more-contacts-btn"
        />
      </div>
    </div>
  </SettingsSection>
</template>

<script setup lang="ts">
defineOptions({
  name: 'NostrContactsSettings',
})

import { computed, ref, watch } from 'vue'
import SettingsSection from 'src/components/settings/SettingsSection.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useNostrStore } from 'src/stores/nostr'
import type { SyncedNostrContact } from 'src/types/nostr'
import { getNostrContactDisplayName, getNostrContactSubtitle } from 'src/utils/nostrContacts'

const INITIAL_VISIBLE_CONTACTS = 10
const CONTACTS_PAGE_SIZE = 10

const nostrStore = useNostrStore()
const notify = useAppNotify()

const contactSourceValue = ref(nostrStore.contactSource.sourceValue)
const syncedContacts = computed(() => nostrStore.contacts)
const isSyncingContacts = computed(() => nostrStore.syncStatus === 'syncing')
const contactSyncError = computed(() => nostrStore.contactSyncMeta.lastSyncError)
const visibleContactCount = ref(INITIAL_VISIBLE_CONTACTS)
const lastSyncedLabel = computed(() => {
  if (nostrStore.contactSyncMeta.lastSyncedAt == null) {
    return ''
  }

  return `Last synced: ${new Date(nostrStore.contactSyncMeta.lastSyncedAt).toLocaleString()}`
})
const visibleContacts = computed(() => syncedContacts.value.slice(0, visibleContactCount.value))
const hasMoreContacts = computed(() => visibleContactCount.value < syncedContacts.value.length)

watch(
  () => nostrStore.contactSource,
  (newSource) => {
    contactSourceValue.value = newSource.sourceValue
  },
  { deep: true },
)

watch(syncedContacts, () => {
  visibleContactCount.value = INITIAL_VISIBLE_CONTACTS
})

async function syncContacts() {
  nostrStore.setContactSource(contactSourceValue.value)

  if (await nostrStore.syncContacts()) {
    notify.success(`Imported ${nostrStore.contacts.length} contacts`)
  } else {
    notify.error(nostrStore.contactSyncMeta.lastSyncError ?? 'Failed to sync contacts')
  }
}

function clearContacts() {
  nostrStore.clearContacts()
  notify.info('Cleared imported contacts')
}

function showMoreContacts() {
  visibleContactCount.value += CONTACTS_PAGE_SIZE
}

function getContactDisplayName(contact: SyncedNostrContact): string {
  return getNostrContactDisplayName(contact)
}

function getContactSubtitle(contact: SyncedNostrContact): string {
  return getNostrContactSubtitle(contact)
}
</script>
