// shared data setup and faceting for the Buck Schiwetz pages (gallery, map, artwork detail)
const schiwetzSchema = {
    ArtWork: {
        preload: 'true',
        xRefs: [
            {field: 'location', reference: 'Place', multi: false},
            {field: 'tags', reference: 'ArtTag', multi: true},
            {field: 'collection', reference: 'Collection', multi: false},
            {field: 'media_types', reference: 'ArtworkMediaType', multi: true},
        ],
        sortFields: ['+year'],
        criteria: {'f_project.id': TAP.projects.schiwetz}
    },
    Event: {
        preload: 'true',
        criteria: {'f_project.id': TAP.projects.schiwetz}
    },
    Exhibition: {
        preload: 'true',
        xRefs: [
            {field: 'artwork', reference: 'ArtWork', multi: false},
            {field: 'event', reference: 'Event', multi: false},
        ],
        criteria: {'f_project.id': TAP.projects.schiwetz}
    },
    Place: {
        preload: 'true',
        sortFields: ['+name']
    },
    Collection: {
        preload: 'true',
        sortFields: ['+name']
    },
    Prize: {
        preload: 'true',
        xRefs: [
            {field: 'artwork', reference: 'ArtWork', multi: false},
        ],
        sortFields: ['+name'],
        criteria: {'f_project.id': TAP.projects.schiwetz}
    },
    ArtTag: {
        preload: 'true',
        sortFields: ['+name']
    }
}

function getSchiwetzCorpus(callback) {
    getTapCorpus(schiwetzSchema, [['ArtWork', 'Exhibition', 'Event']], callback)
}

const schiwetzFacetLabels = {
    decade: 'Decade',
    place: 'Depicted Place',
    collection: 'Collection',
    exhibition: 'Exhibition',
    prize: 'Prize',
    surface: 'Surface',
    medium: 'Medium',
    palette: 'Color Palette',
    theme: 'Theme',
    setting: 'Setting',
    subject: 'Subject',
}

// aggregate facet values from the corpus into an ArtMenu (categories the menu doesn't use are skipped)
function collectSchiwetzFacets(corpus, menu) {
    corpus.getContents('ArtWork').forEach(artwork => {
        if (artwork.year) {
            let decade = Math.floor(artwork.year / 10) * 10
            menu.addFacet('decade', decade, decade.toString(), artwork.id)
        }
        if (artwork.location) menu.addFacet('place', artwork.location.id, artwork.location.label.trim(), artwork.id)
        if (artwork.collection) {
            if (artwork.collection.label.startsWith('Private Collection'))
                menu.addFacet('collection', 'Private Collection', 'Private Collection', artwork.id)
            else
                menu.addFacet('collection', artwork.collection.id, artwork.collection.label.trim(), artwork.id)
        }
        if (artwork.surface) menu.addFacet('surface', artwork.surface, artwork.surface.trim(), artwork.id)
        if (artwork.medium) menu.addFacet('medium', artwork.medium, artwork.medium.trim(), artwork.id)
    })

    // exhibitions
    corpus.getContents('Event').forEach(event => {
        corpus.getAssociatedContents('Event', event.id, 'ArtWork').forEach(artwork => {
            menu.addFacet('exhibition', event.id, event.label.trim(), artwork.id)
        })
    })

    // prizes
    corpus.getContents('Prize').forEach(prize => {
        corpus.getAssociatedContents('Prize', prize.id, 'ArtWork').forEach(artwork => {
            menu.addFacet('prize', prize.label.trim(), prize.label.trim(), artwork.id)
        })
    })

    // art tags (palette, theme, setting, subject)
    corpus.getContents('ArtTag').forEach(tag => {
        corpus.getAssociatedContents('ArtTag', tag.id, 'ArtWork').forEach(artwork => {
            menu.addFacet(tag.type.label.toLowerCase(), tag.id, tag.name.trim(), artwork.id)
        })
    })
}

// the search box + facet lists in #tap-artmenu. onChange(matchingArtworkIDs=null) is called whenever
// the user applies/removes a filter or a search returns results
class ArtMenu {
    constructor(categories, onChange) {
        this.onChange = onChange
        this.facets = {}
        this.filterDiv = getEl('tap-artmenu-active-filters')
        this.searchBox = getEl('tap-artmenu-search-box')
        this.searchTimer = null

        categories.forEach(category => {
            this.facets[category] = {
                label: schiwetzFacetLabels[category],
                parentControl: getEl(`tap-artmenu-${category}-list`),
                byValue: {}
            }
        })

        // active filter badges get re-rendered on every change, so listen on their container
        this.filterDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('tap-artmenu-active-filter-delete-button')) {
                let badge = e.target.parentElement
                this.removeFilter(badge.dataset.category, badge.dataset.value)
                this.onChange()
            }
        })
    }

    addFacet(category, value, label, matchingArtworkID) {
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
                matchingArtworkIDs: new Set(),
                applied: false
            }
        }
        this.facets[category].byValue[value].matchingArtworkIDs.add(matchingArtworkID)
    }

    placeFacets() {
        for (let category in this.facets) {
            let byValue = this.facets[category].byValue
            let sortedValues = Object.keys(byValue).sort((a, b) => byValue[a].label.localeCompare(byValue[b].label))
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

    setupSearch(corpus) {
        this.searchBox.addEventListener('keydown', () => {
            if (this.searchBox.value) {
                clearTimeout(this.searchTimer)
                this.searchTimer = setTimeout(() => {
                    fetch(`${corpus.api}/ArtWork?q=${this.searchBox.value}&only=id`)
                        .then(res => res.json())
                        .then(searchResults => {
                            if (searchResults.meta && searchResults.records) {
                                this.onChange(new Set(searchResults.records.map(record => record.id)))
                            }
                        })
                }, 1000)
            }
        })
    }

    // narrow artworkIDs down by applied filters (and search results, if any), render the active filter
    // badges, and hide facet values that would produce no results. returns the visible artwork IDs
    filterArtworks(artworkIDs, matchingArtworkIDs=null) {
        let visibleArtworkIDs = new Set(artworkIDs)
        clearEl(this.filterDiv)

        for (let category in this.facets) {
            for (let value in this.facets[category].byValue) {
                let facet = this.facets[category].byValue[value]
                if (facet.applied) {
                    visibleArtworkIDs = visibleArtworkIDs.intersection(facet.matchingArtworkIDs)
                    appendToEl(this.filterDiv, `
                        <span class="badge tap-artmenu-active-filter" data-category="${category}" data-value="${value}">
                            <span class="tap-artmenu-active-filter-label">${this.facets[category].label}: ${facet.label}</span> <span class="dashicons dashicons-no-alt tap-artmenu-active-filter-delete-button"></span>
                        </span>
                    `)
                }
            }
        }

        if (matchingArtworkIDs) visibleArtworkIDs = visibleArtworkIDs.intersection(matchingArtworkIDs)

        for (let category in this.facets) {
            let hasRelevantFacet = false

            for (let value in this.facets[category].byValue) {
                let facet = this.facets[category].byValue[value]
                if (visibleArtworkIDs.intersection(facet.matchingArtworkIDs).size) {
                    facet.control.classList.remove('d-none')
                    hasRelevantFacet = true
                }
                else facet.control.classList.add('d-none')
            }

            this.facets[category].parentControl.parentElement.classList.toggle('d-none', !hasRelevantFacet)
        }

        return visibleArtworkIDs
    }
}
