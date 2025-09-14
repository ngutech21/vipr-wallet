<template>
  <ModalCard title="Join a federation" data-testid="join-federation-selection">
    <div class="q-pa-md" >
      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-card class="cursor-pointer" v-ripple @click="onDiscover">
            <q-card-section class="row">
              <q-icon name="search" size="48px" color="primary" class="col-2" />
              <div class="col-10">
                <div class="text-h6 q-mt-sm">Discover federations</div>
                <div class="text-caption text-grey-7">
                  View federations recommended by Nostr users at bitcoinmints.com
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12">
          <q-card class="cursor-pointer" v-ripple @click="onAdd" data-testid="join-trusted-federation-card">
            <q-card-section class="row">
              <q-icon name="add_circle" size="48px" color="primary" class="col-2" />
              <div class="col-10">
                <div class="text-h6 q-mt-sm">Join a trusted federation</div>
                <div class="text-caption text-grey-7">
                  Already know the federation you want to join? Scan the QR code or enter the
                  invitecode
                </div>
              </div>
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
