<template>
  <ModalCard title="Send">
    <div class="q-pa-md">
      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-card
            class="cursor-pointer"
            v-ripple
            @click="onSendLightning"
            data-testid="send-lightning-card"
          >
            <q-card-section class="row">
              <q-icon name="flash_on" size="48px" color="warning" class="col-2" />
              <div class="col-10">
                <div class="text-h6 q-mt-sm">Send via Lightning</div>
                <div class="text-caption text-grey-7">
                  Pay a Lightning invoice, address, or LNURL while online
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="col-12">
          <q-card
            class="cursor-pointer"
            v-ripple
            @click="onSendOffline"
            data-testid="send-offline-card"
          >
            <q-card-section class="row">
              <q-icon name="swap_horiz" size="48px" color="primary" class="col-2" />
              <div class="col-10">
                <div class="text-h6 q-mt-sm">Send Offline eCash</div>
                <div class="text-caption text-grey-7">
                  Export eCash notes to share without a live internet connection
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
import { useRouter } from 'vue-router'
import ModalCard from './ModalCard.vue'

const router = useRouter()
const emit = defineEmits<{
  close: []
}>()

async function onSendLightning() {
  emit('close')
  await router.push({ name: '/send' })
}

async function onSendOffline() {
  emit('close')
  await router.push({ name: '/send-ecash' })
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
