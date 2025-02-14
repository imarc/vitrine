export default {
  name: 'RecursiveList',
  props: {
    data: { type: Array, required: true },
  },
  methods: {
    sort(arr) {
      return arr.toSorted((a, b) => a.key?.localeCompare(b.key) || -1)
    },
    linkClass(child) {
      return child.filename?.match(/(?<=\.).*/) || ''
    }
  },
  template: `
    <ul>
      <li v-for="child of sort(data)">
        <details v-if="child.toArray().length" open>
          <summary>
            <a
              v-if="child.url"
              :href="child.url"
              :class="linkClass(child)"
            >{{ child.name || child.key }}</a>
            <span
              v-else
              :class="linkClass(child)"
            >{{ child.name || child.key }}</span>
          </summary>
          <RecursiveList v-if="child.toArray().length" :data="child.toArray()" />
        </details>
        <a
          v-else-if="child.url"
          :href="child.url"
          :class="linkClass(child)"
        >{{ child.name || child.key }}</a>
        <span v-else>{{ child.name || child.key }}</span>
      </li>
    </ul>
  `
}
