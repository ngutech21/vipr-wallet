<template>
  <ModalCard title="Join Federation">
    <div class="q-pa-md">
      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-card class="cursor-pointer" v-ripple @click="onDiscover">
            <q-card-section class="text-center">
              <q-icon name="search" size="48px" color="primary" />
              <div class="text-h6 q-mt-sm">Discover Federations</div>
              <div class="text-caption text-grey-7">Find and join public federations via Nostr</div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12">
          <q-card class="cursor-pointer" v-ripple @click="onAdd">
            <q-card-section class="text-center">
              <q-icon name="add_circle" size="48px" color="primary" />
              <div class="text-h6 q-mt-sm">Join Trusted Federation</div>
              <div class="text-caption text-grey-7">Join a federation using an invite code</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
  </ModalCard>
</template>

<script setup lang="ts">
import ModalCard from './ModalCard.vue'

const emit = defineEmits<{
  close: []
  showDiscover: []
  showAdd: []
}>()

function onDiscover() {
  emit('close')
  emit('showDiscover')
}

function onAdd() {
  emit('close')
  emit('showAdd')
}
</script>

<style scoped>
.q-card {
  transition: all 0.2s ease-in-out;
}

.q-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}
</style>
