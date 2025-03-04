export default {
  name: 'RecursiveList',
  props: {
    data: { type: Array, required: true },
  },
  methods: {
    sort(arr) {
      return arr.toSorted((a, b) => {

        if (a.key.charAt(0) === '@' && b.key.charAt(0) !== '@') {
          return 1
        }

        if (b.key.charAt(0) === '@' && a.key.charAt(0) !== '@') {
          return -1
        }

        return a.key?.localeCompare(b.key) || -1
      })
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
              v-if="child.type === 'directory'"
              :href="child.url"
              :class="linkClass(child)"
            >{{ child.name || child.key }}</a>
            <a
              v-else
              :href="child.url"
              :class="linkClass(child)"
            >{{ child.name || child.key }}</a>
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
