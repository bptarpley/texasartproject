// the search box + facet lists in #tap-artmenu, shared by the Schiwetz gallery and map and the DWG ephemera
// database. the items being filtered are identified by ID (artworks, or ephemera).
//
//   facets:   {category: {label, sortByLabel}}. each category's values are listed in a #tap-artmenu-<category>-list
//             element, sorted by label unless sortByLabel is false (then in the order they were added)
//   onChange: called whenever the user applies or removes a filter
//   search:   function(query) returning the set of matching item IDs, or a promise of one
//
// besides facets, the menu tracks "custom filters" (i.e. search results, a year range), which are a label and the
// set of item IDs they allow
class ArtMenu {
    constructor(facets, onChange, search) {
        this.onChange = onChange
        this.search = search
        this.facets = {}
        this.customFilters = {}
        this.filterDiv = getEl('tap-artmenu-active-filters')
        this.searchBox = getEl('tap-artmenu-search-box')
        this.searchTimer = null

        for (let category in facets) {
            this.facets[category] = {
                label: facets[category].label,
                sortByLabel: facets[category].sortByLabel !== false,
                parentControl: getEl(`tap-artmenu-${category}-list`),
                byValue: {}
            }
        }

        this.collapseOnMobile()

        // active filter badges get re-rendered on every change, so listen on their container
        this.filterDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('tap-artmenu-active-filter-delete-button')) {
                let badge = e.target.parentElement
                if (badge.dataset.customFilter) {
                    let filter = this.customFilters[badge.dataset.customFilter]
                    if (filter && filter.onRemove) filter.onRemove()
                    this.removeCustomFilter(badge.dataset.customFilter)
                } else {
                    this.removeFilter(badge.dataset.category, badge.dataset.value)
                    this.onChange()
                }
            }
        })
    }

    // on narrow screens, fold all the facet lists into one collapsible "Filter" section so the menu doesn't push
    // the gallery or map far down the page
    collapseOnMobile() {
        if (window.innerWidth > 767) return

        let filterHeading = getEl('tap-artmenu-filter-heading')
        let facetLists = getEl('tap-artmenu').querySelectorAll('details.tap-artmenu-list')
        let filterSection = htmlToEl(`<details class="tap-artmenu-list"><summary></summary></details>`).firstElementChild

        filterHeading.replaceWith(filterSection)
        filterSection.firstElementChild.append(filterHeading)
        facetLists.forEach(facetList => filterSection.append(facetList))
    }

    addFacet(category, value, label, itemID) {
        if (!(category in this.facets)) return

        if (!(value in this.facets[category].byValue)) {
            let control = htmlToEl(`
                <li class="tap-artmenu-list-item" data-category="${category}" data-value="${value}">
                    ${label}
                </li>
            `).firstElementChild

            control.addEventListener('click', (e) => {
                this.applyFilter(e.target.dataset.category, e.target.dataset.value)
                this.onChange()
            })

            this.facets[category].byValue[value] = {
                label: label,
                control: control,
                itemIDs: new Set(),
                applied: false
            }
        }
        this.facets[category].byValue[value].itemIDs.add(itemID)
    }

    placeFacets() {
        for (let category in this.facets) {
            let byValue = this.facets[category].byValue
            let sortedValues = Object.keys(byValue)
            if (this.facets[category].sortByLabel) sortedValues.sort((a, b) => byValue[a].label.localeCompare(byValue[b].label))
            sortedValues.forEach(value => this.facets[category].parentControl.append(byValue[value].control))
        }
    }

    applyInitialFilters(getParams) {
        for (let category in this.facets) {
            let value = getParams.get(category)
            if (value) this.applyFilter(category, value)
        }
    }

    applyFilter(category, value) {
        let facet = this.facets[category].byValue[value]
        if (facet) {
            facet.applied = true
            facet.control.classList.add('active')
        }
    }

    removeFilter(category, value) {
        let facet = this.facets[category].byValue[value]
        if (facet) {
            facet.applied = false
            facet.control.classList.remove('active')
        }
    }

    // onRemove is called when the user deletes the filter's badge, so the control that set it can reset itself
    setCustomFilter(name, label, itemIDs, onRemove=null) {
        this.customFilters[name] = {label, itemIDs, onRemove}
        this.onChange()
    }

    removeCustomFilter(name) {
        if (name in this.customFilters) {
            delete this.customFilters[name]
            this.onChange()
        }
    }

    setupSearch() {
        this.searchBox.addEventListener('input', () => {
            clearTimeout(this.searchTimer)
            this.searchTimer = setTimeout(() => this.runSearch(), 1000)
        })
    }

    runSearch() {
        let query = this.searchBox.value.trim()
        if (!query) {
            this.removeCustomFilter('search')
            return
        }

        Promise.resolve(this.search(query)).then(matchingItemIDs => {
            // ignore results for a query the user has since changed
            if (matchingItemIDs && this.searchBox.value.trim() === query) {
                this.setCustomFilter('search', `Search: ${query}`, matchingItemIDs, () => {
                    clearTimeout(this.searchTimer)
                    this.searchBox.value = ''
                })
            }
        })
    }

    // a search function for menus whose items can be found by their facet values, i.e. searching "Postcard"
    // matches every item with that media type
    searchFacetLabels(query) {
        let matchingItemIDs = new Set()
        query = query.toLowerCase()
        for (let category in this.facets) {
            for (let value in this.facets[category].byValue) {
                let facet = this.facets[category].byValue[value]
                if (facet.label.toLowerCase().includes(query)) matchingItemIDs = matchingItemIDs.union(facet.itemIDs)
            }
        }
        return matchingItemIDs
    }

    // narrow itemIDs down by applied facets and custom filters, render the active filter badges, and hide facet
    // values that would produce no results. returns the visible item IDs
    filterItems(itemIDs) {
        let visibleItemIDs = new Set(itemIDs)
        clearEl(this.filterDiv)

        for (let category in this.facets) {
            for (let value in this.facets[category].byValue) {
                let facet = this.facets[category].byValue[value]
                if (facet.applied) {
                    visibleItemIDs = visibleItemIDs.intersection(facet.itemIDs)
                    appendToEl(this.filterDiv, `
                        <span class="badge tap-artmenu-active-filter" data-category="${category}" data-value="${value}">
                            <span class="tap-artmenu-active-filter-label">${this.facets[category].label}: ${facet.label}</span> <span class="dashicons dashicons-no-alt tap-artmenu-active-filter-delete-button"></span>
                        </span>
                    `)
                }
            }
        }

        for (let name in this.customFilters) {
            let filter = this.customFilters[name]
            visibleItemIDs = visibleItemIDs.intersection(filter.itemIDs)
            appendToEl(this.filterDiv, `
                <span class="badge tap-artmenu-active-filter" data-custom-filter="${name}">
                    <span class="tap-artmenu-active-filter-label">${escapeAttrVal(filter.label)}</span> <span class="dashicons dashicons-no-alt tap-artmenu-active-filter-delete-button"></span>
                </span>
            `)
        }

        for (let category in this.facets) {
            let hasRelevantFacet = false

            for (let value in this.facets[category].byValue) {
                let facet = this.facets[category].byValue[value]
                if (visibleItemIDs.intersection(facet.itemIDs).size) {
                    facet.control.classList.remove('d-none')
                    hasRelevantFacet = true
                }
                else facet.control.classList.add('d-none')
            }

            this.facets[category].parentControl.parentElement.classList.toggle('d-none', !hasRelevantFacet)
        }

        return visibleItemIDs
    }
}
