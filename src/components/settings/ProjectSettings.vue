<template>
  <q-expansion-item
    class="settings-section settings-section--secondary"
    icon="code"
    label="GitHub"
    caption="View the project"
    header-class="settings-header"
    expand-icon-class="text-primary"
  >
    <q-card>
      <q-card-section class="settings-panel settings-panel--secondary">
        <div class="settings-copy-block settings-copy-block--compact">
          Built with ❤️ as free and open source software. You can review the project on GitHub.
        </div>
        <q-btn
          label="Open GitHub Repository"
          icon="open_in_new"
          color="primary"
          no-caps
          unelevated
          :href="'https://github.com/ngutech21/vipr-wallet'"
          target="_blank"
          rel="noopener noreferrer"
          class="settings-action-full"
          data-testid="settings-open-github-btn"
        />
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ProjectSettings',
})
</script>
