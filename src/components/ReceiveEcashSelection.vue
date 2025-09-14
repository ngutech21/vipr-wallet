<template>
  <ModalCard title="Receive eCash">
    <div class="q-pa-md">
      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-card class="cursor-pointer" v-ripple @click="onReceiveLightning" data-testid="receive-lightning-card">
            <q-card-section class="row">
              <q-icon name="flash_on" size="48px" color="warning" class="col-2" />
              <div class="col-10">
                <div class="text-h6 q-mt-sm">Receive via Lightning</div>
                <div class="text-caption text-grey-7">
                  Generate a Lightning invoice to receive eCash directly from the Lightning network
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12">
          <q-card class="cursor-pointer" v-ripple @click="onReceiveOffline">
            <q-card-section class="row">
              <q-icon name="swap_horiz" size="48px" color="primary" class="col-2" />
              <div class="col-10">
                <div class="text-h6 q-mt-sm">Receive Offline eCash</div>
                <div class="text-caption text-grey-7">
                  Generate a QR code to receive eCash from another wallet without using the internet
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </ModalCard>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router/auto'
import ModalCard from './ModalCard.vue'

const router = useRouter()
const emit = defineEmits<{
  close: []
  showOfflineReceive: []
}>()

async function onReceiveLightning() {
  emit('close')
  await router.push({ name: '/receive' })
}

async function onReceiveOffline() {
  emit('close')
  await router.push({ name: '/receive-ecash' })
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
