<script setup lang="ts">
const tab = ref<'pings' | 'bandwidths'>('pings')
</script>

<template>
  <u-page>
    <div class="container mx-auto mt-5">
      <div class="flex justify-center">
        <u-radio-group
          v-model="tab"
          variant="table"
          orientation="horizontal"
          :items="[
            {
              label: 'Ping Latency',
              value: 'pings',
            },
            {
              label: 'Bandwidth',
              value: 'bandwidths',
            },
          ]"
          label-key="label"
          value-key="value"
        />
      </div>
      <PingStream v-if="tab === 'pings'" />
      <BandwidthStream v-else />
    </div>
  </u-page>
</template>
