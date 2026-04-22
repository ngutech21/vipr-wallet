<template>
  <div class="not-found-page dark-gradient">
    <div class="not-found-shell">
      <div class="not-found-card">
        <div class="not-found-kicker">Page not found</div>
        <div class="not-found-code">404</div>
        <div class="not-found-title">This screen doesn’t exist</div>
        <div class="not-found-copy">
          The link may be outdated, or the page may have been moved somewhere else.
        </div>

        <q-btn
          color="primary"
          unelevated
          no-caps
          class="not-found-action"
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
  padding: 24px;
}

.not-found-shell {
  width: 100%;
  max-width: 700px;
}

.not-found-card {
  background:
    radial-gradient(circle at top left, rgba(156, 39, 255, 0.18), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  padding: 40px 28px 32px;
  text-align: center;
  color: white;
}

.not-found-kicker {
  font-size: 0.9rem;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.64);
}

.not-found-code {
  margin-top: 12px;
  font-size: clamp(4rem, 16vw, 8rem);
  line-height: 0.95;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.not-found-title {
  margin-top: 18px;
  font-size: clamp(1.6rem, 5vw, 2.5rem);
  line-height: 1.05;
  font-weight: 700;
}

.not-found-copy {
  max-width: 32rem;
  margin: 16px auto 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.74);
}

.not-found-action {
  margin-top: 28px;
  min-height: 56px;
  min-width: min(100%, 260px);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(162, 43, 255, 1), rgba(116, 0, 255, 0.96)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0));
  box-shadow:
    0 10px 24px rgba(111, 0, 255, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  color: white;
}

@media (max-width: 599px) {
  .not-found-page {
    padding: 16px;
  }

  .not-found-card {
    padding: 32px 20px 24px;
    border-radius: 24px;
  }

  .not-found-copy {
    font-size: 0.98rem;
  }

  .not-found-action {
    width: 100%;
  }
}
</style>
