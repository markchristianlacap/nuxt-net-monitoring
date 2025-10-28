<script setup lang="ts">
const tab = ref<'pings' | 'bandwidths'>('pings')
</script>

<template>
  <div>
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
    <div class="mt-4">
      <PingStream v-show="tab === 'pings'" />
      <BandwidthStream v-show="tab === 'bandwidths'" />
    </div>
  </div>
</template>
