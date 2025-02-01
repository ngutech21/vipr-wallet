<template>
  <q-page class="row items-center justify-evenly">
    <div class="fixed-bottom-bar">
      <q-btn-group class="q-mt-md" outline push>
        <q-btn icon="home" label="Home" />
        <q-btn icon="arrow_downward" label="Receive" />
        <q-btn icon="arrow_upward" label="Pay" />
      </q-btn-group>
    </div>
  </q-page>
</template>

<script setup lang="ts"></script>

<style scoped>
.fixed-bottom-bar {
  position: fixed;
  bottom: 0;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
}
</style>
