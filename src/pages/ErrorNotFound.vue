<template>
  <div class="not-found-page dark-gradient">
    <div class="not-found-shell">
      <div class="not-found-card vipr-surface-card vipr-surface-card--summary">
        <div class="not-found-kicker vipr-eyebrow">Page not found</div>
        <div class="not-found-code">404</div>
        <div class="not-found-title vipr-display-title">This screen doesn’t exist</div>
        <div class="not-found-copy vipr-lede">
          The link may be outdated, or the page may have been moved somewhere else.
        </div>

        <q-btn
          color="primary"
          unelevated
          no-caps
          class="not-found-action vipr-btn vipr-btn--primary vipr-btn--lg"
          :to="{ name: '/' }"
          label="Back to home"
          data-testid="not-found-go-home-btn"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ErrorNotFoundPage',
})
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));
}

.not-found-shell {
  width: 100%;
  max-width: 700px;
}

.not-found-card {
  padding: 40px 28px 32px;
  text-align: center;
}

.not-found-kicker {
  line-height: 1.2;
}

.not-found-code {
  margin-top: 12px;
  color: var(--vipr-text-primary);
  font-size: 7rem;
  line-height: 0.95;
  font-weight: 700;
  letter-spacing: 0;
}

.not-found-title {
  margin-top: 18px;
}

.not-found-copy {
  max-width: 32rem;
  margin: 16px auto 0;
}

.not-found-action {
  margin-top: 28px;
  min-width: min(100%, 260px);
}

@media (max-width: 599px) {
  .not-found-page {
    padding: calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom));
  }

  .not-found-card {
    padding: 32px 20px 24px;
  }

  .not-found-code {
    font-size: 4.5rem;
  }

  .not-found-action {
    width: 100%;
  }
}
</style>
