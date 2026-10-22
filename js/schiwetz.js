// shared data setup and faceting for the Buck Schiwetz pages (gallery and map)
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

function schiwetzFacets(categories) {
    return Object.fromEntries(categories.map(category => [category, {label: schiwetzFacetLabels[category]}]))
}

// search box handler for ArtMenu: full text search of the project's artworks
function searchSchiwetzArtworks(corpus, query) {
    let params = buildGetParams({
        q: encodeURIComponent(query),
        only: 'id',
        'f_project.id': TAP.projects.schiwetz,
        'page-size': 1000,
    })
    return fetch(`${corpus.api}/ArtWork/?${params}`)
        .then(res => res.json())
        .then(searchResults => searchResults.records ? new Set(searchResults.records.map(record => record.id)) : null)
}
