<template>
  <SettingsRow
    icon="code"
    label="GitHub"
    caption="View the project"
    href="https://github.com/ngutech21/vipr-wallet"
    target="_blank"
    rel="noopener noreferrer"
    external
    data-testid="settings-open-github-btn"
  />
</template>

<script setup lang="ts">
defineOptions({
  name: 'ProjectSettings',
})

import SettingsRow from 'src/components/settings/SettingsRow.vue'
</script>
