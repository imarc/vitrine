export default {
  name: 'RecursiveList',
  props: {
    data: { type: Array, required: true },
  },
  template: `
    <ul>
      <li v-for="child of data">
        <details v-if="child.toArray().length" open>
          <summary>
            <a v-if="child.url" :href="child.url">{{ child.name || child.key }}</a>
            <span v-else>{{ child.name || child.key }}</span>
          </summary>
          <RecursiveList v-if="child.toArray().length" :data="child.toArray()" />
        </details>
        <a v-else-if="child.url" :href="child.url">{{ child.name || child.key }}</a>
        <span v-else>{{ child.name || child.key }}</span>
      </li>
    </ul>
  `
}
