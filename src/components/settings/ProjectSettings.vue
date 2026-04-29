<template>
  <SettingsSection variant="secondary" icon="code" label="GitHub" caption="View the project">
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
  </SettingsSection>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ProjectSettings',
})

import SettingsSection from 'src/components/settings/SettingsSection.vue'
</script>
